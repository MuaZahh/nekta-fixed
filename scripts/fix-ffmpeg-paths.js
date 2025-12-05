#!/usr/bin/env node

/**
 * Script to update FFmpeg library paths in Remotion compositor binaries
 * Run this script after the app has been built but before signing
 *
 * This fixes the "relative path not allowed in hardened program" error
 * that occurs with notarized macOS apps.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// FFmpeg libraries to update paths for
const ffmpegLibs = [
  "libavcodec.dylib",
  "libavformat.dylib",
  "libavutil.dylib",
  "libswscale.dylib",
  "libswresample.dylib",
  "libavdevice.dylib",
  "libavfilter.dylib",
];

// Binaries that need path updates
const binaries = ["remotion", "ffmpeg", "ffprobe"];

/**
 * Find the compositor directory in the built app
 */
function findCompositorDir(appPath) {
  const resourcesPath = path.join(appPath, "Contents/Resources/app.asar.unpacked/node_modules");

  if (!fs.existsSync(resourcesPath)) {
    throw new Error(`Resources path not found: ${resourcesPath}`);
  }

  const dirs = fs.readdirSync(resourcesPath);
  const compositorDir = dirs.find(d => d.startsWith("@remotion/compositor-darwin"));

  if (!compositorDir) {
    throw new Error("Compositor directory not found");
  }

  return path.join(resourcesPath, compositorDir);
}

/**
 * Update library paths in a binary
 */
function updateBinaryPaths(binaryPath) {
  if (!fs.existsSync(binaryPath)) {
    console.log(`   ⏭️  Skipping ${path.basename(binaryPath)} (not found)`);
    return;
  }

  for (const lib of ffmpegLibs) {
    const command = `install_name_tool -change ${lib} @loader_path/${lib} "${binaryPath}"`;
    try {
      execSync(command, { stdio: "pipe" });
    } catch (error) {
      // Some libs might not be referenced by all binaries, that's OK
    }
  }
  console.log(`   ✅ Updated ${path.basename(binaryPath)}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Try to find the app in the release directory
    const releaseDir = path.join(__dirname, "..", "release");
    if (!fs.existsSync(releaseDir)) {
      console.error("Usage: node fix-ffmpeg-paths.js <path-to-app.app>");
      console.error("Or run from project root after building");
      process.exit(1);
    }

    // Find .app files in release subdirectories
    const versions = fs.readdirSync(releaseDir);
    for (const version of versions) {
      const versionDir = path.join(releaseDir, version);
      if (!fs.statSync(versionDir).isDirectory()) continue;

      const macDir = path.join(versionDir, "mac-arm64");
      if (fs.existsSync(macDir)) {
        const apps = fs.readdirSync(macDir).filter(f => f.endsWith(".app"));
        for (const app of apps) {
          processApp(path.join(macDir, app));
        }
      }

      const macX64Dir = path.join(versionDir, "mac");
      if (fs.existsSync(macX64Dir)) {
        const apps = fs.readdirSync(macX64Dir).filter(f => f.endsWith(".app"));
        for (const app of apps) {
          processApp(path.join(macX64Dir, app));
        }
      }
    }
  } else {
    processApp(args[0]);
  }
}

function processApp(appPath) {
  console.log(`\n🔧 Fixing FFmpeg paths in: ${appPath}`);

  try {
    const compositorDir = findCompositorDir(appPath);
    console.log(`📁 Compositor directory: ${compositorDir}`);

    for (const binary of binaries) {
      updateBinaryPaths(path.join(compositorDir, binary));
    }

    console.log("✅ Library paths updated successfully!");
    console.log("🚨 Remember to re-sign the app after these modifications.\n");
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
}

main();
