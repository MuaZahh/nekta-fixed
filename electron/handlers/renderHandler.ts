import { ipcMain, shell, dialog } from "electron";
import log from "electron-log/main";
import fs from "fs";
import path from "path";
import os from "os";
import { eq, desc } from "drizzle-orm";
import render from "../remotion/render";
import { initDb, getDb, schema } from "../libs/db";

initDb();

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
