const fs = require("fs");
const path = require("path");

/**
 * Generates a combined manifest from all platform build artifacts
 * Usage: node generateCombinedManifest.cjs <artifacts-dir> <version>
 */

const artifactsDir = process.argv[2];
const version = process.argv[3];

if (!artifactsDir || !version) {
  console.error("Usage: node generateCombinedManifest.cjs <artifacts-dir> <version>");
  process.exit(1);
}

const baseUrl = process.env.RELEASES_BASE_URL || "https://cdn.nekta-studio.com";
const releasePath = `builds/${version}`;

console.log("\n📦 Generating combined releases manifest...");
console.log(`   Version: ${version}`);
console.log(`   Artifacts dir: ${artifactsDir}`);
console.log(`   Base URL: ${baseUrl}`);

const manifest = {
  version,
  releaseDate: new Date().toISOString(),
  platforms: {}
};

// Read all files in the artifacts directory
const files = fs.readdirSync(artifactsDir);

for (const filename of files) {
  const filePath = path.join(artifactsDir, filename);
  const stats = fs.statSync(filePath);

  // Skip directories and metadata files
  if (stats.isDirectory()) continue;

  const ext = path.extname(filename).toLowerCase();

  // Skip yml files, blockmap files, and existing json manifests
  if ([".yml", ".yaml", ".blockmap", ".json"].includes(ext)) {
    continue;
  }

  const url = `${baseUrl}/${releasePath}/${filename}`;

  // Windows
  if (ext === ".exe") {
    manifest.platforms.windows = manifest.platforms.windows || {};
    manifest.platforms.windows.installer = {
      url,
      filename,
      size: stats.size,
    };
    manifest.platforms.windows.url = url;
  }

  // macOS DMG
  if (ext === ".dmg") {
    manifest.platforms.macos = manifest.platforms.macos || {};
    manifest.platforms.macos.dmg = {
      url,
      filename,
      size: stats.size,
    };
    manifest.platforms.macos.url = url;
  }

  // macOS ZIP (for auto-update)
  if (ext === ".zip" && (filename.includes("mac") || filename.includes("darwin"))) {
    manifest.platforms.macos = manifest.platforms.macos || {};
    manifest.platforms.macos.zip = {
      url,
      filename,
      size: stats.size,
    };
  }

  // Linux AppImage
  if (ext === ".appimage" || filename.toLowerCase().endsWith(".appimage")) {
    manifest.platforms.linux = manifest.platforms.linux || {};
    manifest.platforms.linux.appImage = {
      url,
      filename,
      size: stats.size,
    };
    if (!manifest.platforms.linux.url) {
      manifest.platforms.linux.url = url;
    }
  }

  // Linux Snap
  if (ext === ".snap") {
    manifest.platforms.linux = manifest.platforms.linux || {};
    manifest.platforms.linux.snap = {
      url,
      filename,
      size: stats.size,
    };
  }

  // Linux Deb
  if (ext === ".deb") {
    manifest.platforms.linux = manifest.platforms.linux || {};
    manifest.platforms.linux.deb = {
      url,
      filename,
      size: stats.size,
    };
  }
}

// Write manifest to artifacts directory
const manifestPath = path.join(artifactsDir, "app-build-manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`   ✅ Manifest written to: ${manifestPath}`);
console.log("\n📋 Generated manifest:");
console.log(JSON.stringify(manifest, null, 2));
console.log("");
