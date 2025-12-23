import { ipcMain, shell, dialog, net } from "electron";
import log from "electron-log/main";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import { eq, desc } from "drizzle-orm";
import render, { ensureBrowserWithProgress } from "../remotion/render";
import { initDb, getDb, schema } from "../libs/db";

initDb();

// Persistent media server for preview
let previewMediaServer: http.Server | null = null;
let previewMediaServerPort: number | null = null;

function startPreviewMediaServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    if (previewMediaServer && previewMediaServerPort) {
      resolve(previewMediaServerPort);
      return;
    }


    setInterval(() => {
      const memoryInfo = process.memoryUsage();
      console.log('Memory:', {
        heapUsed: `${Math.round(memoryInfo.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryInfo.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryInfo.rss / 1024 / 1024)} MB`
      });
    }, 5000);

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
        log.error(`Preview media server: File not found: ${decodedPath}`);
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
      const fileSize = stat.size;

      // Handle Range requests for video seeking
      const range = req.headers.range;
      if (range) {
        const match = range.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
          const chunkSize = end - start + 1;

          res.writeHead(206, {
            "Content-Type": contentType,
            "Content-Length": chunkSize,
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
          });

          fs.createReadStream(decodedPath, { start, end }).pipe(res);
          return;
        }
      }

      // Full file response
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      });

      fs.createReadStream(decodedPath).pipe(res);
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        previewMediaServer = server;
        previewMediaServerPort = address.port;
        log.info(`Preview media server started on port ${address.port}`);
        resolve(address.port);
      } else {
        reject(new Error("Failed to get server address"));
      }
    });

    server.on("error", reject);
  });
}

// Start server immediately on module load
startPreviewMediaServer().catch((err) => {
  log.error("Failed to start preview media server:", err);
});

// IPC handler to get the media server port
ipcMain.handle("GET_MEDIA_SERVER_PORT", async () => {
  const port = await startPreviewMediaServer();
  return port;
});

// Transform media:// URL to http:// URL
function transformMediaUrl(mediaUrl: string, port: number): string {
  if (!mediaUrl.startsWith("media://")) {
    return mediaUrl;
  }
  const encodedPath = mediaUrl.slice("media://".length);
  const filePath = decodeURIComponent(encodedPath);
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(filePath)}`;
}

// Proxy fetch requests to bypass CORS
ipcMain.handle(
  "FETCH_PROXY",
  async (
    _event,
    options: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
    }
  ) => {
    try {
      const response = await net.fetch(options.url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
      });

      const data = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
      };
    } catch (error) {
      log.error("Fetch proxy error:", error);
      return {
        ok: false,
        status: 500,
        statusText: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }
);

ipcMain.handle("FETCH_IMAGE_BASE64", async (_event, url: string) => {
  try {
    const response = await net.fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return { ok: true, data: base64 };
  } catch (error) {
    log.error("Fetch image error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Ensure browser is downloaded (can be called on app startup or before rendering)
ipcMain.handle("ENSURE_BROWSER", async () => {
  try {
    log.info("Ensuring browser is available...");
    const browserPath = await ensureBrowserWithProgress();
    return { success: true, path: browserPath };
  } catch (error) {
    log.error("Failed to ensure browser:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle(
  "RENDER_MEDIA",
  async (event, inputProps: Record<string, unknown> = {}, compositionId?: string, title?: string) => {
    try {
      log.info("Rendering media...");
      log.info("Input props:", JSON.stringify(inputProps, null, 2));
      log.info("Composition ID:", compositionId);
      log.info("Title:", title);
      const result = await render(
        inputProps,
        (progress) => {
          event.sender.send("RENDER_PROGRESS", progress);
        },
        compositionId,
        title
      );
      return { success: true, ...result };
    } catch (error) {
      log.error("Failed to render media:");
      if (error instanceof Error) {
        log.error("Error name:", error.name);
        log.error("Error message:", error.message);
        log.error("Error stack:", error.stack);
      } else {
        log.error("Unknown error:", error);
      }
      event.sender.send("RENDER_ERROR", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return { success: false };
    }
  }
);

// Get all media assets from library
ipcMain.handle("GET_LIBRARY_MEDIA", async () => {
  try {
    const db = getDb();
    const media = db
      .select()
      .from(schema.mediaAssets)
      .orderBy(desc(schema.mediaAssets.createdAt))
      .all();
    return media;
  } catch (error) {
    log.error("Failed to get library media:", error);
    return [];
  }
});

ipcMain.handle("DOWNLOAD_MEDIA", async (_event, uid: string) => {
  try {
    const db = getDb();
    const media = db
      .select()
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.uid, uid))
      .get();

    if (!media) {
      throw new Error("Media not found");
    }

    const result = await dialog.showSaveDialog({
      defaultPath: path.join(
        os.homedir(),
        "Downloads",
        `${media.name.replace(/[^a-z0-9]/gi, "_")}.mp4`
      ),
      filters: [{ name: "Video", extensions: ["mp4"] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    fs.copyFileSync(media.filePath, result.filePath);
    shell.showItemInFolder(result.filePath);

    return { success: true, filePath: result.filePath };
  } catch (error) {
    log.error("Failed to download media:", error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle("DELETE_MEDIA", async (_event, uid: string) => {
  try {
    const db = getDb();
    const media = db
      .select()
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.uid, uid))
      .get();

    if (!media) {
      throw new Error("Media not found");
    }

    if (fs.existsSync(media.filePath)) {
      fs.unlinkSync(media.filePath);
    }

    db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.uid, uid)).run();

    return { success: true };
  } catch (error) {
    log.error("Failed to delete media:", error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle("GET_MEDIA_PATH", async (_event, uid: string) => {
  try {
    const db = getDb();
    const media = db
      .select()
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.uid, uid))
      .get();

    if (!media) {
      return null;
    }

    return media.filePath;
  } catch (error) {
    log.error("Failed to get media path:", error);
    return null;
  }
});

ipcMain.handle(
  "SAVE_GENERATED_IMAGE",
  async (_event, options: { base64Data: string; filename?: string }) => {
    try {
      const { base64Data, filename } = options;

      const { app } = await import("electron");
      const appDataPath = app.getPath("userData");
      const genImagesDir = path.join(appDataPath, "gen", "images");

      if (!fs.existsSync(genImagesDir)) {
        fs.mkdirSync(genImagesDir, { recursive: true });
      }

      const finalFilename =
        filename || `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
      const filePath = path.join(genImagesDir, finalFilename);

      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(filePath, buffer);

      const db = getDb();
      const uid = crypto.randomUUID();
      db.insert(schema.cacheFiles)
        .values({
          uid,
          filePath,
          fileName: finalFilename,
          mimeType: "image/png",
          size: buffer.length,
          category: "generated_image",
        })
        .run();

      log.info("Saved generated image to:", filePath);

      return {
        ok: true,
        filePath,
        mediaUrl: `media://${encodeURIComponent(filePath)}`,
      };
    } catch (error) {
      log.error("Failed to save generated image:", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

ipcMain.handle("GET_CACHE_STATS", async () => {
  try {
    const db = getDb();
    const files = db
      .select()
      .from(schema.cacheFiles)
      .all();

    const activeFiles = files.filter((f) => !f.deletedAt);
    const totalSize = activeFiles.reduce((sum, f) => sum + f.size, 0);

    return {
      ok: true,
      fileCount: activeFiles.length,
      totalSize,
    };
  } catch (error) {
    log.error("Failed to get cache stats:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("CLEAR_CACHE", async () => {
  try {
    const db = getDb();
    const files = db
      .select()
      .from(schema.cacheFiles)
      .all();

    const activeFiles = files.filter((f) => !f.deletedAt);
    let deletedCount = 0;

    for (const file of activeFiles) {
      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
        }
        db.update(schema.cacheFiles)
          .set({ deletedAt: new Date() })
          .where(eq(schema.cacheFiles.id, file.id))
          .run();
        deletedCount++;
      } catch (err) {
        log.error(`Failed to delete cache file ${file.filePath}:`, err);
      }
    }

    log.info(`Cleared ${deletedCount} cached files`);

    return {
      ok: true,
      deletedCount,
    };
  } catch (error) {
    log.error("Failed to clear cache:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("OPEN_CACHE_FOLDER", async () => {
  try {
    const { app } = await import("electron");
    const appDataPath = app.getPath("userData");
    const genImagesDir = path.join(appDataPath, "gen");

    if (!fs.existsSync(genImagesDir)) {
      fs.mkdirSync(genImagesDir, { recursive: true });
    }

    shell.openPath(genImagesDir);

    return { ok: true };
  } catch (error) {
    log.error("Failed to open cache folder:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle(
  "SAVE_GENERATED_AUDIO",
  async (_event, options: { base64Data: string; filename?: string }) => {
    try {
      const { base64Data, filename } = options;

      const { app } = await import("electron");
      const appDataPath = app.getPath("userData");
      const genAudioDir = path.join(appDataPath, "gen", "audio");

      if (!fs.existsSync(genAudioDir)) {
        fs.mkdirSync(genAudioDir, { recursive: true });
      }

      const finalFilename =
        filename || `audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
      const filePath = path.join(genAudioDir, finalFilename);

      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(filePath, buffer);

      const db = getDb();
      const uid = crypto.randomUUID();
      db.insert(schema.cacheFiles)
        .values({
          uid,
          filePath,
          fileName: finalFilename,
          mimeType: "audio/mpeg",
          size: buffer.length,
          category: "generated_audio",
        })
        .run();

      log.info("Saved generated audio to:", filePath);

      return {
        ok: true,
        filePath,
        mediaUrl: `media://${encodeURIComponent(filePath)}`,
      };
    } catch (error) {
      log.error("Failed to save generated audio:", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

// Transform timeline media:// URLs to http:// URLs for preview
ipcMain.handle(
  "TRANSFORM_TIMELINE_FOR_PREVIEW",
  async (_event, timeline: {
    shortTitle: string;
    elements: Array<{ imageUrl: string; [key: string]: unknown }>;
    text: Array<unknown>;
    audio: Array<{ audioUrl: string; [key: string]: unknown }>;
  }) => {
    try {
      const port = await startPreviewMediaServer();

      const transformedTimeline = {
        ...timeline,
        elements: timeline.elements.map((el) => ({
          ...el,
          imageUrl: transformMediaUrl(el.imageUrl, port),
        })),
        audio: timeline.audio.map((el) => ({
          ...el,
          audioUrl: transformMediaUrl(el.audioUrl, port),
        })),
      };

      return { ok: true, timeline: transformedTimeline };
    } catch (error) {
      log.error("Failed to transform timeline:", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);
