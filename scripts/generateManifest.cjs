const fs = require("fs");
const path = require("path");

/**
 * electron-builder afterAllArtifactBuild hook
 * Generates a releases.json manifest for API consumption and download tracking
 */
exports.default = async function (buildResult) {
  const { outDir, artifactPaths } = buildResult;

  // Get version from package.json
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
  );
  const version = packageJson.version;

  // Base URL for your R2 bucket (configure this)
  const baseUrl = process.env.RELEASES_BASE_URL || "https://cdn.nekta-studio.com";
  const releasePath = `builds/${version}`;

  console.log("\n📦 Generating releases manifest...");
  console.log(`   Version: ${version}`);
  console.log(`   Artifacts: ${artifactPaths.length}`);

  const manifest = {
    version,
    releaseDate: new Date().toISOString(),
    platforms: {}
  };

  // Map artifacts to platforms
  for (const artifactPath of artifactPaths) {
    const filename = path.basename(artifactPath);
    const ext = path.extname(filename).toLowerCase();

    // Skip yml files and blockmap files
    if (ext === ".yml" || ext === ".yaml" || ext === ".blockmap") {
      continue;
    }

    const url = `${baseUrl}/${releasePath}/${filename}`;
    const stats = fs.statSync(artifactPath);

    // Determine platform and type
    if (ext === ".exe" || filename.includes("Setup")) {
      manifest.platforms.windows = manifest.platforms.windows || {};
      manifest.platforms.windows.installer = {
        url,
        filename,
        size: stats.size,
      };
    } else if (ext === ".dmg") {
      manifest.platforms.macos = manifest.platforms.macos || {};
      manifest.platforms.macos.dmg = {
        url,
        filename,
        size: stats.size,
      };
    } else if (ext === ".zip" && artifactPath.includes("mac")) {
      manifest.platforms.macos = manifest.platforms.macos || {};
      manifest.platforms.macos.zip = {
        url,
        filename,
        size: stats.size,
      };
    } else if (ext === ".appimage") {
      manifest.platforms.linux = manifest.platforms.linux || {};
      manifest.platforms.linux.appImage = {
        url,
        filename,
        size: stats.size,
      };
    } else if (ext === ".snap") {
      manifest.platforms.linux = manifest.platforms.linux || {};
      manifest.platforms.linux.snap = {
        url,
        filename,
        size: stats.size,
      };
    } else if (ext === ".deb") {
      manifest.platforms.linux = manifest.platforms.linux || {};
      manifest.platforms.linux.deb = {
        url,
        filename,
        size: stats.size,
      };
    }
  }

  // Add primary download URL for each platform (for simple API responses)
  if (manifest.platforms.windows?.installer) {
    manifest.platforms.windows.url = manifest.platforms.windows.installer.url;
  }
  if (manifest.platforms.macos?.dmg) {
    manifest.platforms.macos.url = manifest.platforms.macos.dmg.url;
  }
  if (manifest.platforms.linux?.appImage) {
    manifest.platforms.linux.url = manifest.platforms.linux.appImage.url;
  }

  // Write manifest to release directory
  const manifestPath = path.join(outDir, "releases.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`   ✅ Manifest written to: ${manifestPath}`);

  // Also write a "latest.json" that can be uploaded to root of bucket
  const latestPath = path.join(outDir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(manifest, null, 2));
  console.log(`   ✅ Latest manifest written to: ${latestPath}`);

  console.log("\n📋 Generated manifest:");
  console.log(JSON.stringify(manifest, null, 2));
  console.log("");

  // Return the manifest path so it gets uploaded too
  return [manifestPath, latestPath];
};
