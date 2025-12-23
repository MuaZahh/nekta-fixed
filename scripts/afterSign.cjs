const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * electron-builder afterSign hook
 * Signs chrome-headless-shell binaries that were skipped by signIgnore
 */
exports.default = async function (context) {
  // Only run on macOS
  if (process.platform !== "darwin") {
    console.log("⏭️  Skipping afterSign (not macOS)");
    return;
  }

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  const chromeDir = path.join(
    appPath,
    "Contents/Resources/app.asar.unpacked/out/chrome-headless-shell"
  );

  if (!fs.existsSync(chromeDir)) {
    console.log("⏭️  chrome-headless-shell not found, skipping afterSign");
    return;
  }

  console.log(`\n🔏 Signing chrome-headless-shell binaries (afterSign)...`);

  // Get signing info from electron-builder context
  const keychainFile = context.keychainFile;
  const cscName = context.cscName || process.env.CSC_NAME;

  if (!cscName) {
    console.log("⏭️  No signing identity (CSC_NAME) found, skipping");
    return;
  }

  console.log(`   📋 Identity: ${cscName}`);
  if (keychainFile) {
    console.log(`   🔑 Keychain: ${keychainFile}`);
  }

  const entitlementsPath = path.join(process.cwd(), "build/entitlements.mac.plist");

  // Build codesign base command
  let codesignBase = `codesign --force --sign "${cscName}" --options runtime --timestamp --entitlements "${entitlementsPath}"`;
  if (keychainFile) {
    codesignBase += ` --keychain "${keychainFile}"`;
  }

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
      execSync(cmd, { stdio: "pipe" });
      console.log(`   ✅ Signed: ${path.basename(binary)}`);
    } catch (error) {
      const stderr = error.stderr?.toString() || error.message;
      console.log(`   ⚠️  Failed to sign ${path.basename(binary)}: ${stderr}`);
    }
  }

  console.log("✅ chrome-headless-shell signing complete!\n");
};
