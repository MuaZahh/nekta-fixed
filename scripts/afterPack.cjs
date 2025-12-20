const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Recursively find files matching a pattern
 */
function findFiles(dir, filename, results = []) {
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, filename, results);
    } else if (entry.name === filename) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * electron-builder afterPack hook
 * Fixes FFmpeg library paths and removes unsigned files for macOS notarization
 */
exports.default = async function (context) {
  // Only run on macOS
  if (process.platform !== "darwin") {
    console.log("⏭️  Skipping afterPack fixes (not macOS)");
    return;
  }

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  // Remove problematic JSON files that can't be signed
  console.log(`\n🧹 Removing unsigned files from: ${appPath}`);

  const problematicFiles = [
    "vk_swiftshader_icd.json",
  ];

  for (const filename of problematicFiles) {
    const files = findFiles(appPath, filename);
    for (const file of files) {
      try {
        fs.unlinkSync(file);
        console.log(`   ✅ Removed: ${file}`);
      } catch (error) {
        console.log(`   ⚠️  Could not remove: ${file} - ${error.message}`);
      }
    }
  }

  // Also remove vulkan directory if present (contains the same problematic file)
  const vulkanDirs = [];
  function findVulkanDirs(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "vulkan") {
          vulkanDirs.push(fullPath);
        } else {
          findVulkanDirs(fullPath);
        }
      }
    }
  }
  findVulkanDirs(appPath);

  for (const vulkanDir of vulkanDirs) {
    try {
      fs.rmSync(vulkanDir, { recursive: true, force: true });
      console.log(`   ✅ Removed vulkan directory: ${vulkanDir}`);
    } catch (error) {
      console.log(`   ⚠️  Could not remove: ${vulkanDir} - ${error.message}`);
    }
  }

  // Sign all binaries in chrome-headless-shell directory
  // electron-builder is configured to skip this directory (signIgnore), so we sign it ourselves
  console.log(`\n🔏 Signing chrome-headless-shell directory...`);

  // Find the Developer ID identity from keychain
  // Try using the identity name directly - codesign will find the matching certificate
  let signingIdentity = "Developer ID Application";

  // Check if the identity exists
  try {
    // List available keychains for debugging
    const keychains = execSync('security list-keychains', { encoding: "utf8" });
    console.log(`   📋 Available keychains: ${keychains.replace(/\n/g, ', ').trim()}`);

    const identityOutput = execSync(
      'security find-identity -v -p codesigning',
      { encoding: "utf8" }
    );
    const identityLines = identityOutput.split('\n').filter(l => l.includes('Developer ID') || l.includes('valid identit'));
    console.log(`   📋 Identities: ${identityLines.join(' | ')}`);

    if (!identityOutput.includes('Developer ID Application')) {
      console.log(`   ⚠️  Developer ID Application not found in keychain`);
      signingIdentity = null;
    } else {
      console.log(`   ✅ Found Developer ID Application identity`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not query keychain: ${error.message}`);
    signingIdentity = null;
  }

  if (!signingIdentity) {
    console.log(`   ⚠️  No Developer ID Application identity found, skipping chrome-headless-shell signing`);
  } else {
    // Find chrome-headless-shell directory
    const chromeDir = path.join(
      appPath,
      "Contents/Resources/app.asar.unpacked/out/chrome-headless-shell"
    );

    if (fs.existsSync(chromeDir)) {
      const entitlementsPath = path.join(process.cwd(), "build/entitlements.mac.plist");

      // Get all files in the directory
      const files = fs.readdirSync(chromeDir);

      // Sign dylibs first (dependencies before main binary)
      const dylibs = files.filter(f => f.endsWith('.dylib'));
      const binaries = files.filter(f => !f.includes('.') && f !== 'chrome-headless-shell');
      const mainBinary = files.filter(f => f === 'chrome-headless-shell');

      const toSign = [...dylibs, ...binaries, ...mainBinary];

      for (const file of toSign) {
        const filePath = path.join(chromeDir, file);

        // Skip directories and non-executable files
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) continue;

        // Check if it's a Mach-O binary
        try {
          execSync(`file "${filePath}" | grep -q "Mach-O"`, { stdio: "pipe" });
        } catch {
          // Not a Mach-O binary, skip
          continue;
        }

        try {
          const cmd = `codesign --force --sign "${signingIdentity}" --options runtime --timestamp --entitlements "${entitlementsPath}" "${filePath}"`;
          execSync(cmd, { stdio: "pipe" });
          console.log(`   ✅ Signed: ${file}`);
        } catch (error) {
          console.log(`   ⚠️  Could not sign: ${file}`);
          console.log(`      ${error.stderr?.toString() || error.message}`);
        }
      }
    } else {
      console.log(`   ⚠️  chrome-headless-shell directory not found at: ${chromeDir}`);
    }
  }

  console.log(`\n🔧 Fixing FFmpeg library paths in: ${appPath}`);

  const ffmpegLibs = [
    "libavcodec.dylib",
    "libavformat.dylib",
    "libavutil.dylib",
    "libswscale.dylib",
    "libswresample.dylib",
    "libavdevice.dylib",
    "libavfilter.dylib",
  ];

  const binaries = ["remotion", "ffmpeg", "ffprobe"];

  try {
    // Find compositor directory - it's inside @remotion scoped package
    const remotionPath = path.join(
      appPath,
      "Contents/Resources/app.asar.unpacked/node_modules/@remotion"
    );

    if (!fs.existsSync(remotionPath)) {
      console.log("⚠️  @remotion path not found, skipping");
      return;
    }

    const dirs = fs.readdirSync(remotionPath);
    const compositorDir = dirs.find((d) =>
      d.startsWith("compositor-darwin")
    );

    if (!compositorDir) {
      console.log("⚠️  Compositor directory not found, skipping");
      return;
    }

    const compositorPath = path.join(remotionPath, compositorDir);
    console.log(`📁 Compositor directory: ${compositorPath}`);

    // Update each binary
    for (const binary of binaries) {
      const binaryPath = path.join(compositorPath, binary);

      if (!fs.existsSync(binaryPath)) {
        console.log(`   ⏭️  Skipping ${binary} (not found)`);
        continue;
      }

      for (const lib of ffmpegLibs) {
        const command = `install_name_tool -change ${lib} @loader_path/${lib} "${binaryPath}"`;
        try {
          execSync(command, { stdio: "pipe" });
        } catch (error) {
          // Some libs might not be referenced by all binaries
        }
      }
      console.log(`   ✅ Updated ${binary}`);
    }

    console.log("✅ FFmpeg library paths fixed successfully!\n");
  } catch (error) {
    console.error(`❌ Error fixing FFmpeg paths: ${error.message}\n`);
  }
};
