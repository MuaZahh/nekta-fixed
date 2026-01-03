import { useState, useEffect, useCallback } from 'react'
import { ArrowsClockwiseIcon, DownloadSimpleIcon, RocketLaunchIcon } from '@phosphor-icons/react'

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

interface VersionInfo {
  update: boolean
  version: string
  newVersion?: string
  releaseNotes?: string
}

interface ProgressInfo {
  percent: number
  bytesPerSecond: number
  total: number
  transferred: number
}

interface ErrorInfo {
  message: string
  error: Error
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

interface AppUpdateIndicatorProps {
  testMode?: boolean
}

const TEST_DATA = {
  state: 'available' as UpdateState,
  versionInfo: {
    update: true,
    version: '1.0.0',
    newVersion: '1.0.1',
  },
  progress: {
    percent: 45,
    bytesPerSecond: 2500000,
    total: 150000000,
    transferred: 67500000,
  },
}

export const AppUpdateIndicator = ({ testMode = false }: AppUpdateIndicatorProps) => {
  const [state, setState] = useState<UpdateState>(testMode ? TEST_DATA.state : 'idle')
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(testMode ? TEST_DATA.versionInfo : null)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handleChecking = () => {
      setState('checking')
    }

    const handleUpdateAvailable = (_: unknown, info: VersionInfo) => {
      if (info.update) {
        setState('available')
        setVersionInfo(info)
        setDismissed(false)
      } else {
        setState('idle')
      }
    }

    const handleProgress = (_: unknown, info: ProgressInfo) => {
      setState('downloading')
      setProgress(info)
    }

    const handleDownloaded = () => {
      setState('ready')
      setProgress(null)
    }

    const handleError = (_: unknown, info: ErrorInfo) => {
      setState('error')
      setError(info.message)
    }

    window.ipcRenderer.on('update-checking', handleChecking)
    window.ipcRenderer.on('update-can-available', handleUpdateAvailable)
    window.ipcRenderer.on('download-progress', handleProgress)
    window.ipcRenderer.on('update-downloaded', handleDownloaded)
    window.ipcRenderer.on('update-error', handleError)

    return () => {
      window.ipcRenderer.off('update-checking', handleChecking)
      window.ipcRenderer.off('update-can-available', handleUpdateAvailable)
      window.ipcRenderer.off('download-progress', handleProgress)
      window.ipcRenderer.off('update-downloaded', handleDownloaded)
      window.ipcRenderer.off('update-error', handleError)
    }
  }, [])

  const handleDownload = useCallback(() => {
    window.ipcRenderer.invoke('start-download')
    setState('downloading')
  }, [])

  const handleInstall = useCallback(() => {
    window.ipcRenderer.invoke('quit-and-install')
  }, [])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  // Don't show if idle, checking briefly, or dismissed (unless in test mode)
  if (!testMode && (state === 'idle' || state === 'checking' || dismissed)) {
    return null
  }

  return (
    <div className="fixed bottom-20 right-4 z-[60]">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-lg p-3 min-w-[300px] max-w-[340px]">
        {/* Error state */}
        {state === 'error' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <span className="font-medium">Update failed</span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-neutral-400 hover:text-neutral-600 text-xs"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-neutral-500 truncate">{error}</p>
          </div>
        )}

        {/* Update available state */}
        {state === 'available' && versionInfo && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-neutral-700">
                <ArrowsClockwiseIcon size={18} weight="bold" />
                <div>
                  <p className="text-sm font-medium">Update available</p>
                  <p className="text-xs text-neutral-500">
                    v{versionInfo.version} → v{versionInfo.newVersion}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-neutral-400 hover:text-neutral-600 text-xs shrink-0"
              >
                Later
              </button>
            </div>
            <button
              onClick={handleDownload}
              className="w-full bg-black text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <DownloadSimpleIcon size={16} />
              Download Update
            </button>
          </div>
        )}

        {/* Downloading state */}
        {state === 'downloading' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-neutral-700 text-sm">
              <DownloadSimpleIcon size={16} className="animate-pulse" />
              <span className="font-medium">Downloading update...</span>
            </div>

            {progress && (
              <>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{Math.round(progress.percent)}%</span>
                  <span>
                    {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
                  </span>
                </div>

                <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-150 ease-out"
                    style={{ width: `${Math.min(100, progress.percent)}%` }}
                  />
                </div>

                {progress.bytesPerSecond > 0 && (
                  <p className="text-xs text-neutral-400">
                    {formatBytes(progress.bytesPerSecond)}/s
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Ready to install state */}
        {state === 'ready' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-green-600">
              <RocketLaunchIcon size={18} weight="fill" />
              <div>
                <p className="text-sm font-medium">Update ready</p>
                <p className="text-xs text-neutral-500">
                  Restart to apply the update
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 bg-neutral-100 text-neutral-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Later
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 bg-black text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Install Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
