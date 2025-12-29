import {
  renderMedia,
  RenderMediaOnProgress,
  selectComposition,
  ensureBrowser,
} from "@remotion/renderer";
import { app, BrowserWindow } from "electron";
import log from "electron-log/main";
import fs from "fs";
import path from "path";
import http from "http";
import { eq } from "drizzle-orm";
import { getDb, generateUid, schema } from "../libs/db";

// Cache the browser executable path once downloaded
let cachedBrowserExecutable: string | null = null;

/**
 * Creates a simple HTTP server to serve local media files during rendering
 */
function createMediaServer(): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad request");
        return;
      }

      const url = new URL(req.url, "http://localhost");
      const filePath = url.searchParams.get("path");

      if (!filePath) {
        res.writeHead(400);
        res.end("Missing path parameter");
        return;
      }

      const decodedPath = decodeURIComponent(filePath);

      if (!fs.existsSync(decodedPath)) {
        log.error(`Media server: File not found: ${decodedPath}`);
        res.writeHead(404);
        res.end("File not found");
        return;
      }

      const ext = path.extname(decodedPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
      };

      const contentType = mimeTypes[ext] || "application/octet-stream";
      const stat = fs.statSync(decodedPath);

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": stat.size,
        "Access-Control-Allow-Origin": "*",
      });

      fs.createReadStream(decodedPath).pipe(res);
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        log.info(`Media server started on port ${address.port}`);
        resolve({ server, port: address.port });
      } else {
        reject(new Error("Failed to get server address"));
      }
    });

    server.on("error", reject);
  });
}

/**
 * Transform media:// URLs in inputProps to http://localhost URLs
 */
function transformMediaUrls(
  inputProps: Record<string, unknown>,
  serverPort: number
): Record<string, unknown> {
  const transform = (value: unknown): unknown => {
    if (typeof value === "string" && value.startsWith("media://")) {
      const encodedPath = value.slice("media://".length);
      const filePath = decodeURIComponent(encodedPath);
      const httpUrl = `http://127.0.0.1:${serverPort}/?path=${encodeURIComponent(filePath)}`;
      log.info(`Transformed: ${value} -> ${httpUrl}`);
      return httpUrl;
    }
    if (Array.isArray(value)) {
      return value.map(transform);
    }
    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = transform(val);
      }
      return result;
    }
    return value;
  };

  return transform(inputProps) as Record<string, unknown>;
}

let warned = false;

export type BrowserDownloadProgress = {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
};

/**
 * Ensures Chrome Headless Shell is available, downloading if necessary.
 * Sends download progress to all renderer windows only when actually downloading.
 */
export async function ensureBrowserWithProgress(): Promise<string> {
  // Return cached path if already downloaded
  if (cachedBrowserExecutable && fs.existsSync(cachedBrowserExecutable)) {
    log.info(`Using cached browser executable: ${cachedBrowserExecutable}`);
    return cachedBrowserExecutable;
  }

  log.info("Ensuring Chrome Headless Shell is available...");

  // Track whether a download actually occurred
  let downloadStarted = false;

  try {
    const result = await ensureBrowser({
      onBrowserDownload: () => {
        log.info("Starting Chrome Headless Shell download...");
        downloadStarted = true;

        // Send start event only when download actually begins
        const windows = BrowserWindow.getAllWindows();
        windows.forEach((win) => {
          win.webContents.send("BROWSER_DOWNLOAD_START");
        });

        return {
          onProgress: (progress) => {
            // Send progress to all renderer windows
            const windows = BrowserWindow.getAllWindows();
            windows.forEach((win) => {
              win.webContents.send("BROWSER_DOWNLOAD_PROGRESS", {
                percent: progress.percent,
                downloadedBytes: progress.downloadedBytes,
                totalBytes: progress.totalSizeInBytes,
              });
            });
          },
          version: null,
        };
      },
    });

    // Handle different result types from ensureBrowser
    let browserPath: string;
    if ("path" in result) {
      browserPath = result.path;
    } else {
      throw new Error("Browser not available and could not be downloaded");
    }

    cachedBrowserExecutable = browserPath;
    log.info(`Chrome Headless Shell ready at: ${browserPath}`);

    // Send completion only if download actually occurred
    if (downloadStarted) {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        win.webContents.send("BROWSER_DOWNLOAD_COMPLETE");
      });
    }

    return browserPath;
  } catch (error) {
    log.error("Failed to ensure browser:", error);

    // Send error only if download was attempted
    if (downloadStarted) {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        win.webContents.send("BROWSER_DOWNLOAD_ERROR", {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }

    throw error;
  }
}

/**
 * Checks if the current system is using musl or glibc.
 * Copied and modified from @remotion/renderer/dist/compositor/is-musl.js
 *
 * @returns A boolean indicating whether the system is using musl.
 */
function isMusl(): boolean {
  if (!process.report && typeof Bun !== "undefined") {
    if (!warned) {
      log.warn(
        "Bun limitation: Could not determine if your Linux is using musl or glibc. Assuming glibc."
      );
    }
    warned = true;
    return false;
  }
  const report = process.report?.getReport();
  if (report && typeof report === "string") {
    if (!warned) {
      log.warn(
        "Bun limitation: Could not determine if your system is using musl or glibc. Assuming glibc."
      );
    }
    warned = true;
    return false;
  }

  if (!report) {
    return false;
  }

  try {
    // @ts-ignore
    const parsedReprot = JSON.parse(report);
    // Assuming glibcVersionRuntime is not present in musl
    const { glibcVersionRuntime } = parsedReprot.header || {};
    return !glibcVersionRuntime;
  } catch (error) {
    console.error("Failed to parse report as JSON", error);
    return false;
  }
}

/**
 * Retrieves the module name based on the current os and architecture.
 *
 * Copied and modified from @remotion/renderer/dist/compositor/get-executable-path.js
 *
 * @returns The module name.
 * @throws An error if the operating system or architecture is unsupported.
 */
function getModuleName(): string {
  switch (process.platform) {
    case "win32":
      switch (process.arch) {
        case "x64":
          return "@remotion/compositor-win32-x64-msvc";
        default:
          throw new Error(
            `Unsupported architecture on Windows: ${process.arch}`
          );
      }
    case "darwin":
      switch (process.arch) {
        case "x64":
          return "@remotion/compositor-darwin-x64";
        case "arm64":
          return "@remotion/compositor-darwin-arm64";
        default:
          throw new Error(`Unsupported architecture on macOS: ${process.arch}`);
      }
    case "linux": {
      const musl = isMusl();
      switch (process.arch) {
        case "x64":
          if (musl) {
            return "@remotion/compositor-linux-x64-musl";
          }
          return "@remotion/compositor-linux-x64-gnu";
        case "arm64":
          if (musl) {
            return "@remotion/compositor-linux-arm64-musl";
          }
          return "@remotion/compositor-linux-arm64-gnu";
        default:
          throw new Error(`Unsupported architecture on Linux: ${process.arch}`);
      }
    }
    default:
      throw new Error(
        `Unsupported OS: ${process.platform}, architecture: ${process.arch}`
      );
  }
}

// Get the binaries directory
let binariesDirectory: string | null = null;
if (app.isPackaged) {
  const pathName = `node_modules/${getModuleName()}`;

  // Set the binaries directory
  binariesDirectory = path.join(
    app.getAppPath().replace("app.asar", "app.asar.unpacked"),
    pathName
  );
  log.info(`Binaries directory: ${binariesDirectory}`);
}

/**
 * Renders a video composition with the given input props.
 * @param inputProps - The input props for the composition.
 * @returns A Promise that resolves when the video rendering is complete.
 */
export default async function render(
  inputProps: Record<string, unknown>,
  onProgress?: RenderMediaOnProgress,
  compositionId: string = "HelloWorld",
  title?: string
) {
  // Start media server to serve local files during rendering
  const { server: mediaServer, port: mediaServerPort } = await createMediaServer();

  try {
    // Transform media:// URLs to http://localhost URLs
    const transformedProps = transformMediaUrls(inputProps, mediaServerPort);
    log.info("Transformed inputProps for rendering");

    log.info(`App is packaged: ${app.isPackaged}`);
    log.info(`App path: ${app.getAppPath()}`);

    // When packaged, the bundle is unpacked from asar, so we need to use the unpacked path
    const bundleLocation = app.isPackaged
      ? path.join(
          app.getAppPath().replace("app.asar", "app.asar.unpacked"),
          "out/remotion-bundle"
        )
      : path.join(app.getAppPath(), "out/remotion-bundle");
    log.info(`Bundle location: ${bundleLocation}`);
    log.info(`Binaries directory: ${binariesDirectory}`);

    // Check if bundle location exists
    const bundleExists = fs.existsSync(bundleLocation);
    log.info(`Bundle exists: ${bundleExists}`);
    if (bundleExists) {
      const bundleContents = fs.readdirSync(bundleLocation);
      log.info(`Bundle contents: ${bundleContents.join(", ")}`);
    }

    // Check if binaries directory exists
    if (binariesDirectory) {
      const binariesExist = fs.existsSync(binariesDirectory);
      log.info(`Binaries directory exists: ${binariesExist}`);
      if (binariesExist) {
        const binariesContents = fs.readdirSync(binariesDirectory);
        log.info(`Binaries contents: ${binariesContents.join(", ")}`);
      }
    }

    // Get browser executable (downloads at runtime if needed)
    const browserExecutable = await ensureBrowserWithProgress();
    log.info(`Browser executable: ${browserExecutable}`);

    // Configure chromium options
    const chromiumOptions = {
      enableMultiProcessOnLinux: true,
    };

    log.info(`Selecting composition: ${compositionId}`);
    // Get the composition to render
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: transformedProps,
      binariesDirectory,
      browserExecutable,
      chromiumOptions,
    });
    log.info(`Composition selected: ${composition.id}`);

    const contentDir = path.join(app.getPath("userData"), "media");
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    const mediaUid = generateUid();
    const fileName = `${mediaUid}.mp4`;
    const outputPath = path.join(contentDir, fileName);
    log.info(`Output path: ${outputPath}`);

    log.info(`Rendering video: ${compositionId}.mp4`);
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: transformedProps,
      binariesDirectory,
      browserExecutable,
      chromiumOptions,
      onProgress,
    });
    log.info(`Video rendered: ${compositionId}.mp4`);

    const db = getDb();

    const defaultLibrary = db
      .select()
      .from(schema.libraries)
      .where(eq(schema.libraries.isDefault, true))
      .get();

    if (!defaultLibrary) {
      throw new Error("Default library not found");
    }

    const durationMs = Math.round((composition.durationInFrames / composition.fps) * 1000);

    const videoName = title
      ? `${title} (${new Date().toLocaleDateString()})`
      : `Video ${new Date().toLocaleDateString()}`;

    db.insert(schema.mediaAssets).values({
      uid: mediaUid,
      libraryId: defaultLibrary.id,
      name: videoName,
      filePath: outputPath,
      type: "video",
      duration: durationMs,
    }).run();

    log.info(`Media asset saved to database with uid: ${mediaUid}`);

    return { uid: mediaUid, filePath: outputPath };
  } finally {
    // Always shut down the media server
    mediaServer.close();
    log.info("Media server stopped");
  }
}
