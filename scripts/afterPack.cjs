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

  // Sign chrome-headless-shell binaries with ad-hoc signatures
  // This fixes signing order issues - dylibs must be signed before executables
  // electron-builder will re-sign them with the proper identity
  const chromeHeadlessShellDir = path.join(
    appPath,
    "Contents/Resources/app.asar.unpacked/out/chrome-headless-shell"
  );

  if (fs.existsSync(chromeHeadlessShellDir)) {
    console.log(`\n🔏 Pre-signing chrome-headless-shell binaries (ad-hoc)...`);

    const dylibs = [];
    const executables = [];

    function findBinaries(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findBinaries(fullPath);
        } else {
          const ext = path.extname(entry.name);
          if (ext === ".dylib" || ext === ".so") {
            dylibs.push(fullPath);
          } else if (ext === "" && !entry.name.includes(".")) {
            try {
              const stats = fs.statSync(fullPath);
              if (stats.mode & fs.constants.S_IXUSR) {
                executables.push(fullPath);
              }
            } catch (e) {}
          }
        }
      }
    }

    findBinaries(chromeHeadlessShellDir);

    // Sign dylibs first, then executables (order matters!)
    const allBinaries = [...dylibs, ...executables];

    for (const binary of allBinaries) {
      try {
        // Remove existing signature first
        try {
          execSync(`codesign --remove-signature "${binary}"`, { stdio: "pipe" });
        } catch (e) {}

        // Sign with ad-hoc signature (-)
        execSync(`codesign --sign - --force --timestamp=none "${binary}"`, { stdio: "pipe" });
        console.log(`   ✅ Pre-signed: ${path.basename(binary)}`);
      } catch (error) {
        console.log(`   ⚠️  Failed to pre-sign ${path.basename(binary)}: ${error.message}`);
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
