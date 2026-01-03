import { app, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import type {
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'

const { autoUpdater } = createRequire(import.meta.url)('electron-updater');

// Public R2 URL where updates are hosted
const RELEASES_URL = 'https://cdn.nekta-studio.com'

// Check interval: 1 hour in milliseconds
const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function update(win: Electron.BrowserWindow) {

  // Configure update feed URL (public R2 bucket)
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: RELEASES_URL,
  })

  // When set to false, the update download will be triggered through the API
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false

  // Notify renderer when checking starts
  autoUpdater.on('checking-for-update', () => {
    win.webContents.send('update-checking')
  })

  // Update available
  autoUpdater.on('update-available', (arg: UpdateInfo) => {
    win.webContents.send('update-can-available', {
      update: true,
      version: app.getVersion(),
      newVersion: arg?.version,
      releaseNotes: arg?.releaseNotes,
    })
  })

  // Update not available
  autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
    win.webContents.send('update-can-available', {
      update: false,
      version: app.getVersion(),
      newVersion: arg?.version
    })
  })

  // Auto-check for updates function
  const checkForUpdates = async () => {
    if (!app.isPackaged) {
      return
    }

    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      // Silently fail for auto-checks - don't spam user with errors
      console.error('Auto update check failed:', error)
    }
  }

  // Check on startup (with a small delay to let app initialize)
  setTimeout(() => {
    checkForUpdates()
  }, 15000)

  // Check every hour
  setInterval(() => {
    checkForUpdates()
  }, CHECK_INTERVAL_MS)

  // Manual check from renderer
  ipcMain.handle('check-update', async () => {
    if (!app.isPackaged) {
      const error = new Error('The update feature is only available after the package.')
      return { message: error.message, error }
    }

    try {
      return await autoUpdater.checkForUpdatesAndNotify()
    } catch (error) {
      return { message: 'Network error', error }
    }
  })

  // Start downloading and feedback on progress
  ipcMain.handle('start-download', (event: Electron.IpcMainInvokeEvent) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          // feedback download error message
          event.sender.send('update-error', { message: error.message, error })
        } else {
          // feedback update progress message
          event.sender.send('download-progress', progressInfo)
        }
      },
      () => {
        // feedback update downloaded message
        event.sender.send('update-downloaded')
      }
    )
  })

  // Install now
  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  autoUpdater.on('download-progress', (info: ProgressInfo) => callback(null, info))
  autoUpdater.on('error', (error: Error) => callback(error, null))
  autoUpdater.on('update-downloaded', complete)
  autoUpdater.downloadUpdate()
}
