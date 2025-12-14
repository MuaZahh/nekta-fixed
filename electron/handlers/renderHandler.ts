import { ipcMain, shell, dialog, net } from "electron";
import log from "electron-log/main";
import fs from "fs";
import path from "path";
import os from "os";
import { eq, desc } from "drizzle-orm";
import render from "../remotion/render";
import { initDb, getDb, schema } from "../libs/db";

initDb();

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

ipcMain.handle(
  "RENDER_MEDIA",
  async (event, inputProps: Record<string, unknown> = {}) => {
    try {
      log.info("Rendering media...");
      log.info("Input props:", JSON.stringify(inputProps, null, 2));
      const result = await render(inputProps, (progress) => {
        event.sender.send("RENDER_PROGRESS", progress);
      });
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
