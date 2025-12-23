const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * electron-builder afterSign hook
 * Signs chrome-headless-shell binaries that were skipped by signIgnore
 */
exports.default = async function (context) {
  console.log("\n🔏 afterSign hook started");

  try {
    // Only run on macOS
    if (process.platform !== "darwin") {
      console.log("⏭️  Skipping afterSign (not macOS)");
      return;
    }

    console.log("   Platform: darwin ✓");
    console.log("   appOutDir:", context.appOutDir);
    console.log("   productFilename:", context.packager?.appInfo?.productFilename);

    const appPath = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`
    );
    console.log("   appPath:", appPath);

    const chromeDir = path.join(
      appPath,
      "Contents/Resources/app.asar.unpacked/out/chrome-headless-shell"
    );
    console.log("   chromeDir:", chromeDir);
    console.log("   chromeDir exists:", fs.existsSync(chromeDir));

    if (!fs.existsSync(chromeDir)) {
      console.log("⏭️  chrome-headless-shell not found, skipping afterSign");
      return;
    }

    console.log(`\n🔏 Signing chrome-headless-shell binaries...`);

    // Use standard Developer ID Application identity
    const identity = "Developer ID Application";
    const entitlementsPath = path.join(process.cwd(), "build/entitlements.mac.plist");

    console.log(`   📋 Identity: ${identity}`);
    console.log(`   📋 Entitlements: ${entitlementsPath}`);
    console.log(`   📋 Entitlements exists: ${fs.existsSync(entitlementsPath)}`);

    // Build codesign base command
    const codesignBase = `codesign --force --sign "${identity}" --options runtime --timestamp --entitlements "${entitlementsPath}"`;

    // Find all Mach-O binaries
    const dylibs = [];
    const executables = [];

    function findBinaries(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findBinaries(fullPath);
        } else {
          // Check if it's a Mach-O binary
          try {
            const result = execSync(`file "${fullPath}"`, { encoding: "utf8" });
            if (result.includes("Mach-O")) {
              const ext = path.extname(entry.name);
              if (ext === ".dylib" || ext === ".so") {
                dylibs.push(fullPath);
              } else {
                executables.push(fullPath);
              }
            }
          } catch (e) {}
        }
      }
    }

    findBinaries(chromeDir);

    // Sign dylibs first, then executables (order matters!)
    const allBinaries = [...dylibs, ...executables];
    console.log(`   📦 Found ${dylibs.length} dylibs and ${executables.length} executables`);

    for (const binary of allBinaries) {
      try {
        const cmd = `${codesignBase} "${binary}"`;
        console.log(`   Running: codesign for ${path.basename(binary)}`);
        execSync(cmd, { stdio: "pipe" });
        console.log(`   ✅ Signed: ${path.basename(binary)}`);
      } catch (error) {
        const stderr = error.stderr?.toString() || error.message;
        console.log(`   ⚠️  Failed to sign ${path.basename(binary)}: ${stderr}`);
      }
    }

    console.log("✅ chrome-headless-shell signing complete!\n");
  } catch (error) {
    console.error("❌ afterSign error:", error.message);
    console.error("   Stack:", error.stack);
    throw error;
  }
};
