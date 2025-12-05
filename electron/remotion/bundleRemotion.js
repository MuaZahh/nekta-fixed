import { bundle } from "@remotion/bundler";
import { ensureBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";
// import { enableTailwind } from "@remotion/tailwind";

// https://github.com/TuanManhCao/electron-remotion
async function bundleRemotion() {
  console.log("Bundling Remotion...");

  try {
    // Create the bundle for the composition
    const bundleLocation = await bundle({
      entryPoint: path.resolve("src/remotion/index.ts"),
      outDir: path.resolve("out/remotion-bundle"),
      webpackOverride: (config) => {
        if (config.output) {
          config.output.chunkFormat = "commonjs";
        }

        // return enableTailwind(config);
        return config;
      },
    });
    console.log("Bundle location:", bundleLocation);

    // Download Chrome Headless Shell for packaging with the app
    console.log("Ensuring Chrome Headless Shell is downloaded...");
    const browserResult = await ensureBrowser({
      onBrowserDownload: () => {
        console.log("Downloading Chrome Headless Shell...");
        return () => {
          console.log("Chrome Headless Shell download complete.");
        };
      },
    });
    console.log("Chrome Headless Shell location:", browserResult);

    // ensureBrowser returns { path: string, type: string }
    const browserExecutable = browserResult.path;

    // Copy Chrome Headless Shell to out directory for packaging
    const chromeSource = path.dirname(browserExecutable);
    const chromeDest = path.resolve("out/chrome-headless-shell");

    // Remove existing chrome directory if it exists
    if (fs.existsSync(chromeDest)) {
      fs.rmSync(chromeDest, { recursive: true });
    }

    // Copy the chrome directory
    fs.cpSync(chromeSource, chromeDest, { recursive: true });
    console.log("Chrome Headless Shell copied to:", chromeDest);

  } catch (err) {
    console.error("Failed to bundle Remotion:", err);
  }
}

bundleRemotion();
