import { app, BrowserWindow, ipcMain, shell, Menu, protocol, net } from "electron";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { update } from "./update";

// IMPORTANT: Set up Remotion cache directory BEFORE importing any Remotion-related modules
// In packaged macOS apps, process.cwd() returns "/" which breaks Remotion's cache directory detection
// We need to change cwd to a writable directory with a package.json before Remotion modules load
if (app.isPackaged) {
  const remotionCacheDir = path.join(app.getPath("userData"), "remotion-cache");
  if (!fs.existsSync(remotionCacheDir)) {
    fs.mkdirSync(remotionCacheDir, { recursive: true });
  }
  // Create a fake package.json so Remotion finds a valid project root
  const fakePackageJson = path.join(remotionCacheDir, "package.json");
  if (!fs.existsSync(fakePackageJson)) {
    fs.writeFileSync(fakePackageJson, JSON.stringify({ name: "remotion-cache", version: "1.0.0" }));
  }
  // Change to the cache directory before any Remotion imports
  process.chdir(remotionCacheDir);
  console.log(`Changed cwd to: ${remotionCacheDir} for Remotion cache`);
}

import "../handlers/renderHandler";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
let healthBeatInterval: NodeJS.Timeout | null = null;
const preload = path.join(__dirname, "../preload/index.mjs");
const indexHtml = path.join(RENDERER_DIST, "index.html");

function startHealthBeat() {
  const sendHealthBeat = () => {
    net.fetch("https://api.nekta-studio.com/api/v1/app/status/health").catch(() => {});
  };
  sendHealthBeat();
  healthBeatInterval = setInterval(sendHealthBeat, 60000);
}

function stopHealthBeat() {
  if (healthBeatInterval) {
    clearInterval(healthBeatInterval);
    healthBeatInterval = null;
  }
}

async function createWindow() {
  win = new BrowserWindow({
    title: "Main window",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }

  // Catch renderer errors
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Auto update
  update(win);

  // Enable context menu (right-click)
  win.webContents.on("context-menu", (_, params) => {
    const contextMenu = Menu.buildFromTemplate([
      { role: "undo", enabled: params.editFlags.canUndo },
      { role: "redo", enabled: params.editFlags.canRedo },
      { type: "separator" },
      { role: "cut", enabled: params.editFlags.canCut },
      { role: "copy", enabled: params.editFlags.canCopy },
      { role: "paste", enabled: params.editFlags.canPaste },
      { role: "selectAll", enabled: params.editFlags.canSelectAll },
    ]);
    contextMenu.popup();
  });
}

function createMenu() {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.getName(),
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
        {
          label: "File",
          submenu: [{ role: "close" }],
        },
        {
          label: "Edit",
          submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "selectAll" },
          ],
        },
      ]
    : [
        {
          label: "File",
          submenu: [{ role: "quit" }],
        },
        {
          label: "Edit",
          submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "selectAll" },
          ],
        },
      ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  protocol.handle("media", async (request) => {
    const filePath = decodeURIComponent(request.url.replace("media://", ""));

    try {
      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      // Determine content type based on extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // Use net.fetch to get the file and handle ranges properly
      const fileUrl = `file://${filePath}`;

      const rangeHeader = request.headers.get('Range');
      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
          const chunkSize = end - start + 1;

          // Read the specific range using a file handle
          const fileHandle = await fs.promises.open(filePath, 'r');
          const uint8Array = new Uint8Array(chunkSize);
          await fileHandle.read(uint8Array, 0, chunkSize, start);
          await fileHandle.close();

          return new Response(uint8Array, {
            status: 206,
            headers: {
              'Content-Type': contentType,
              'Content-Length': chunkSize.toString(),
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
            },
          });
        }
      }

      // Full file response - use net.fetch for file:// URL
      const fileResponse = await net.fetch(fileUrl);

      return new Response(fileResponse.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
        },
      });
    } catch (error) {
      console.error('Error serving media file:', filePath, error);
      return new Response('File not found', { status: 404 });
    }
  });

  createMenu();
  createWindow();
  startHealthBeat();
});

app.on("window-all-closed", () => {
  win = null;
  stopHealthBeat();
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
    startHealthBeat();
  }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
