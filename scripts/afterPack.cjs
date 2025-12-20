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

  // Sign chrome-headless-shell with --deep to handle data file subcomponents
  // electron-builder is configured to skip this binary (signIgnore), so we sign it ourselves
  console.log(`\n🔏 Signing chrome-headless-shell binaries with --deep...`);

  // Find the Developer ID identity from keychain
  let signingIdentity = null;
  try {
    const identityOutput = execSync(
      'security find-identity -v -p codesigning | grep "Developer ID Application" | head -1',
      { encoding: "utf8" }
    );
    // Extract the hash (first 40-char hex string) from the output
    const match = identityOutput.match(/([A-F0-9]{40})/i);
    if (match) {
      signingIdentity = match[1];
      console.log(`   📋 Found signing identity: ${signingIdentity.substring(0, 8)}...`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not find Developer ID identity, skipping chrome-headless-shell signing`);
  }

  if (signingIdentity) {
    const chromeHeadlessShells = findFiles(appPath, "chrome-headless-shell");
    const entitlementsPath = path.join(process.cwd(), "build/entitlements.mac.plist");

    for (const chromeBinary of chromeHeadlessShells) {
      // Skip if it's a directory, we only want the binary
      if (fs.statSync(chromeBinary).isDirectory()) continue;

      try {
        // Sign with --deep, hardened runtime, timestamp, and entitlements
        const cmd = `codesign --force --deep --sign "${signingIdentity}" --options runtime --timestamp --entitlements "${entitlementsPath}" "${chromeBinary}"`;
        execSync(cmd, { stdio: "pipe" });
        console.log(`   ✅ Signed: ${chromeBinary}`);
      } catch (error) {
        console.log(`   ⚠️  Could not sign: ${chromeBinary}`);
        // Log the actual error for debugging
        console.log(`      Error: ${error.message}`);
      }
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
