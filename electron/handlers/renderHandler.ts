import { ipcMain, shell, dialog, net, app } from "electron";
import log from "electron-log/main";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import crypto from "crypto";
import { eq, desc, and, isNotNull } from "drizzle-orm";
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

ipcMain.handle("SELECT_IMAGE", async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, canceled: true };
    }

    const sourcePath = result.filePaths[0];
    const ext = path.extname(sourcePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const mimeType = mimeTypes[ext] || "image/png";

    const appDataPath = app.getPath("userData");
    const genImagesDir = path.join(appDataPath, "gen", "images");

    if (!fs.existsSync(genImagesDir)) {
      fs.mkdirSync(genImagesDir, { recursive: true });
    }

    const filename = `uploaded_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const destPath = path.join(genImagesDir, filename);

    fs.copyFileSync(sourcePath, destPath);
    const stats = fs.statSync(destPath);

    const db = getDb();
    const uid = crypto.randomUUID();
    db.insert(schema.cacheFiles)
      .values({
        uid,
        filePath: destPath,
        fileName: filename,
        mimeType,
        size: stats.size,
        category: "uploaded_image",
      })
      .run();

    log.info("Copied uploaded image to:", destPath);

    return {
      ok: true,
      filePath: destPath,
      mediaUrl: `media://${encodeURIComponent(destPath)}`,
    };
  } catch (error) {
    log.error("Failed to select/copy image:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

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

// ============================================================================
// Content Management Handlers
// ============================================================================

interface ManifestContent {
  version: string;
  video?: Array<{
    url: string;
    category: string;
    tags: string[];
    size?: number;
    name?: string;
    metadata?: Record<string, unknown>;
  }>;
  image?: Array<{
    url: string;
    category: string;
    tags: string[];
    size?: number;
    name?: string;
    metadata?: Record<string, unknown>;
  }>;
  audio?: Array<{
    url: string;
    category: string;
    tags: string[];
    size?: number;
    name?: string;
    metadata?: Record<string, unknown>;
  }>;
}

function getContentDir(): string {
  const appDataPath = app.getPath("userData");
  const contentDir = path.join(appDataPath, "content");
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }
  return contentDir;
}

function computeManifestHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function generateUidFromUrl(url: string): string {
  return crypto.createHash("md5").update(url).digest("hex").slice(0, 16);
}

ipcMain.handle("CONTENT_FETCH_MANIFEST", async (_event, manifestUrl: string) => {
  try {
    const response = await net.fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }

    const text = await response.text();
    const manifest = JSON.parse(text) as ManifestContent;
    const contentHash = computeManifestHash(text);

    return { ok: true, manifest, contentHash };
  } catch (error) {
    log.error("Failed to fetch manifest:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("CONTENT_CHECK_MANIFEST", async (_event, manifestUrl: string, contentHash: string) => {
  try {
    const db = getDb();
    const existing = db
      .select()
      .from(schema.contentManifest)
      .where(eq(schema.contentManifest.manifestUrl, manifestUrl))
      .get();

    if (!existing) {
      return { ok: true, changed: true, isNew: true };
    }

    const changed = existing.contentHash !== contentHash;
    return { ok: true, changed, isNew: false };
  } catch (error) {
    log.error("Failed to check manifest:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle(
  "CONTENT_UPDATE_MANIFEST",
  async (_event, manifestUrl: string, contentHash: string, version?: string) => {
    try {
      const db = getDb();
      const existing = db
        .select()
        .from(schema.contentManifest)
        .where(eq(schema.contentManifest.manifestUrl, manifestUrl))
        .get();

      if (existing) {
        db.update(schema.contentManifest)
          .set({
            contentHash,
            version,
            lastCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.contentManifest.manifestUrl, manifestUrl))
          .run();
      } else {
        db.insert(schema.contentManifest)
          .values({
            manifestUrl,
            contentHash,
            version,
          })
          .run();
      }

      return { ok: true };
    } catch (error) {
      log.error("Failed to update manifest:", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

ipcMain.handle(
  "CONTENT_SYNC_FROM_MANIFEST",
  async (
    _event,
    manifest: ManifestContent
  ) => {
    try {
      const db = getDb();
      const allUrls: string[] = [];

      for (const type of ["video", "image", "audio"] as const) {
        const items = manifest[type];
        if (!items) continue;

        for (const item of items) {
          allUrls.push(item.url);
          const uid = generateUidFromUrl(item.url);

          const existing = db
            .select()
            .from(schema.mediaContent)
            .where(eq(schema.mediaContent.url, item.url))
            .get();

          if (existing) {
            // Update existing
            db.update(schema.mediaContent)
              .set({
                category: item.category,
                tags: item.tags,
                size: item.size,
                name: item.name,
                metadata: item.metadata,
                updatedAt: new Date(),
              })
              .where(eq(schema.mediaContent.url, item.url))
              .run();
          } else {
            db.insert(schema.mediaContent)
              .values({
                uid,
                url: item.url,
                type,
                category: item.category,
                tags: item.tags,
                size: item.size,
                name: item.name,
                metadata: item.metadata,
              })
              .run();
          }
        }
      }

      const pendingDownloads = db
        .select()
        .from(schema.mediaContent)
        .all()
        .filter((c) => allUrls.includes(c.url) && !c.localPath);

      return {
        ok: true,
        totalItems: allUrls.length,
        pendingDownloads: pendingDownloads.length,
      };
    } catch (error) {
      log.error("Failed to sync content from manifest:", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

ipcMain.handle("CONTENT_GET_PENDING_DOWNLOADS", async () => {
  try {
    const db = getDb();
    const allContent = db.select().from(schema.mediaContent).all();

    const pending = allContent.filter((c) => {
      if (!c.localPath) return true;
      if (!fs.existsSync(c.localPath)) {
        db.update(schema.mediaContent)
          .set({ localPath: null, downloadedAt: null })
          .where(eq(schema.mediaContent.uid, c.uid))
          .run();
        return true;
      }
      return false;
    });

    const totalSize = pending.reduce((sum, c) => sum + (c.size || 0), 0);

    return {
      ok: true,
      items: pending.map((p) => ({
        uid: p.uid,
        url: p.url,
        type: p.type,
        size: p.size,
      })),
      totalSize,
    };
  } catch (error) {
    log.error("Failed to get pending downloads:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("CONTENT_DOWNLOAD_ITEM", async (event, uid: string) => {
  try {
    const db = getDb();
    const content = db
      .select()
      .from(schema.mediaContent)
      .where(eq(schema.mediaContent.uid, uid))
      .get();

    if (!content) {
      throw new Error("Content not found");
    }

    if (content.localPath && fs.existsSync(content.localPath)) {
      return { ok: true, alreadyDownloaded: true, localPath: content.localPath, size: content.size };
    }

    if (content.localPath && !fs.existsSync(content.localPath)) {
      db.update(schema.mediaContent)
        .set({ localPath: null, downloadedAt: null })
        .where(eq(schema.mediaContent.uid, uid))
        .run();
    }

    const response = await net.fetch(content.url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const contentLength = response.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : content.size || 0;

    const urlPath = new URL(content.url).pathname;
    const ext = path.extname(urlPath) || `.${content.type === "video" ? "mp4" : content.type === "audio" ? "mp3" : "png"}`;

    const contentDir = getContentDir();
    const typeDir = path.join(contentDir, content.type);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    const filename = `${content.uid}${ext}`;
    const localPath = path.join(typeDir, filename);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    const writeStream = fs.createWriteStream(localPath);
    let downloadedBytes = 0;
    let lastProgressUpdate = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        downloadedBytes += value.length;
        writeStream.write(value);

        const now = Date.now();
        if (now - lastProgressUpdate > 100) {
          event.sender.send("CONTENT_DOWNLOAD_PROGRESS", {
            uid,
            downloadedBytes,
            totalBytes,
            progress: totalBytes > 0 ? downloadedBytes / totalBytes : 0,
          });
          lastProgressUpdate = now;
        }
      }
    } finally {
      writeStream.end();
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    }

    db.update(schema.mediaContent)
      .set({
        localPath,
        size: downloadedBytes,
        downloadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.mediaContent.uid, uid))
      .run();

    log.info(`Downloaded content: ${content.url} -> ${localPath} (${downloadedBytes} bytes)`);

    return { ok: true, localPath, size: downloadedBytes };
  } catch (error) {
    log.error("Failed to download content:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle(
  "CONTENT_GET_BY_CATEGORY",
  async (_event, type: string, category: string) => {
    try {
      const db = getDb();
      const content = db
        .select()
        .from(schema.mediaContent)
        .where(
          and(
            eq(schema.mediaContent.type, type),
            eq(schema.mediaContent.category, category),
            isNotNull(schema.mediaContent.localPath)
          )
        )
        .all();

      return {
        ok: true,
        items: content.map((c) => ({
          uid: c.uid,
          url: c.url,
          type: c.type,
          category: c.category,
          tags: c.tags,
          name: c.name,
          size: c.size,
          localPath: c.localPath,
          mediaUrl: c.localPath ? `media://${encodeURIComponent(c.localPath)}` : null,
          metadata: c.metadata,
        })),
      };
    } catch (error) {
      log.error("Failed to get content by category:", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

ipcMain.handle("CONTENT_GET_ALL", async () => {
  try {
    const db = getDb();
    const content = db.select().from(schema.mediaContent).all();

    return {
      ok: true,
      items: content.map((c) => ({
        uid: c.uid,
        url: c.url,
        type: c.type,
        category: c.category,
        tags: c.tags,
        name: c.name,
        size: c.size,
        localPath: c.localPath,
        mediaUrl: c.localPath ? `media://${encodeURIComponent(c.localPath)}` : null,
        isDownloaded: !!c.localPath,
        metadata: c.metadata,
      })),
    };
  } catch (error) {
    log.error("Failed to get all content:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("CONTENT_GET_SIZE", async () => {
  try {
    const contentDir = getContentDir();
    let totalSize = 0;

    function calculateSize(dir: string) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          calculateSize(filePath);
        } else {
          totalSize += stat.size;
        }
      }
    }

    calculateSize(contentDir);

    return { ok: true, totalSize };
  } catch (error) {
    log.error("Failed to get content size:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("CONTENT_OPEN_FOLDER", async () => {
  try {
    const contentDir = getContentDir();
    shell.openPath(contentDir);
    return { ok: true };
  } catch (error) {
    log.error("Failed to open content folder:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});
