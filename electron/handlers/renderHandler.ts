import { ipcMain } from "electron";
import log from "electron-log/main";
import render from "../remotion/render";

ipcMain.handle(
  "RENDER_MEDIA",
  async (event, inputProps: Record<string, unknown> = {}) => {
    try {
      log.info("Rendering media...");
      log.info("Input props:", JSON.stringify(inputProps, null, 2));
      await render(inputProps, (progress) => {
        event.sender.send("RENDER_PROGRESS", progress);
      });
      return true;
    } catch (error) {
      log.error("Failed to render media:");
      if (error instanceof Error) {
        log.error("Error name:", error.name);
        log.error("Error message:", error.message);
        log.error("Error stack:", error.stack);
      } else {
        log.error("Unknown error:", error);
      }
      // Send error details to renderer for debugging
      event.sender.send("RENDER_ERROR", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }
);
