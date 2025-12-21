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

  console.log(`\n🔏 Signing chrome-headless-shell directory (afterSign)...`);

  // Find the Developer ID identity from keychain
  let signingIdentity = "Developer ID Application";

  try {
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
    return;
  }

  // Find chrome-headless-shell directory
  const chromeDir = path.join(
    appPath,
    "Contents/Resources/app.asar.unpacked/out/chrome-headless-shell"
  );

  if (!fs.existsSync(chromeDir)) {
    console.log(`   ⚠️  chrome-headless-shell directory not found at: ${chromeDir}`);
    return;
  }

  const entitlementsPath = path.join(process.cwd(), "build/entitlements.mac.plist");

  // Get all files in the directory
  const files = fs.readdirSync(chromeDir);

  // Sign dylibs first (dependencies before main binary)
  const dylibs = files.filter(f => f.endsWith('.dylib'));
  const otherBinaries = files.filter(f => !f.includes('.') && f !== 'chrome-headless-shell');
  const mainBinary = files.filter(f => f === 'chrome-headless-shell');

  const toSign = [...dylibs, ...otherBinaries, ...mainBinary];

  for (const file of toSign) {
    const filePath = path.join(chromeDir, file);

    // Skip directories
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

  console.log(`✅ chrome-headless-shell signing complete!\n`);
};
