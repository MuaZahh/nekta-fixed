const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * electron-builder afterPack hook
 * Fixes FFmpeg library paths for macOS notarization
 */
exports.default = async function (context) {
  // Only run on macOS
  if (process.platform !== "darwin") {
    console.log("⏭️  Skipping FFmpeg path fix (not macOS)");
    return;
  }

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

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
