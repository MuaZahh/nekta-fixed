import { bundle } from "@remotion/bundler";
import path from "path";
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

        // Add @ alias to resolve src/* paths
        config.resolve = {
          ...config.resolve,
          alias: {
            ...config.resolve?.alias,
            "@": path.resolve("src"),
          },
        };

        // return enableTailwind(config);
        return config;
      },
    });
    console.log("Bundle location:", bundleLocation);

    // Note: Chrome Headless Shell is downloaded at runtime via ensureBrowser()
    // This avoids macOS code signing issues with bundled Chromium binaries
    console.log("Chrome Headless Shell will be downloaded at runtime on first use.");

  } catch (err) {
    console.error("Failed to bundle Remotion:", err);
  }
}

bundleRemotion();
