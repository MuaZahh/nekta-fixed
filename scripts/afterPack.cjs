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

  // Sign chrome-headless-shell binaries for notarization
  // These need to be signed with hardened runtime and timestamp before electron-builder's main signing
  const chromeHeadlessShellDir = path.join(
    appPath,
    "Contents/Resources/app.asar.unpacked/out/chrome-headless-shell"
  );

  if (fs.existsSync(chromeHeadlessShellDir)) {
    console.log(`\n🔏 Signing chrome-headless-shell binaries...`);

    const entitlements = path.join(process.cwd(), "build/entitlements.mac.plist");
    const identity = process.env.CSC_NAME || "Developer ID Application";

    // Find all binaries that need signing
    const binariesToSign = [];

    function findBinaries(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findBinaries(fullPath);
        } else {
          const ext = path.extname(entry.name);
          // Sign .dylib files and executables (no extension, executable bit)
          if (ext === ".dylib" || ext === ".so") {
            binariesToSign.push(fullPath);
          } else if (ext === "" && !entry.name.includes(".")) {
            // Check if it's an executable
            try {
              const stats = fs.statSync(fullPath);
              if (stats.mode & fs.constants.S_IXUSR) {
                binariesToSign.push(fullPath);
              }
            } catch (e) {}
          }
        }
      }
    }

    findBinaries(chromeHeadlessShellDir);

    for (const binary of binariesToSign) {
      try {
        // First, remove any existing signature
        try {
          execSync(`codesign --remove-signature "${binary}"`, { stdio: "pipe" });
        } catch (e) {
          // May not have a signature to remove
        }

        // Sign with hardened runtime and timestamp
        const signCmd = `codesign --sign "${identity}" --force --timestamp --options runtime --entitlements "${entitlements}" "${binary}"`;
        execSync(signCmd, { stdio: "pipe" });
        console.log(`   ✅ Signed: ${path.basename(binary)}`);
      } catch (error) {
        console.log(`   ⚠️  Failed to sign ${path.basename(binary)}: ${error.message}`);
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
