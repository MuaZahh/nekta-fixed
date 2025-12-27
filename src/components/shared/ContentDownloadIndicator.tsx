import { useContentStore, contentManager } from '@/lib/contentManager'
import { CircleNotchIcon, DownloadSimpleIcon, CheckCircleIcon } from '@phosphor-icons/react'

export const ContentDownloadIndicator = () => {
  const isLoading = useContentStore((s) => s.isLoading)
  const isSyncing = useContentStore((s) => s.isSyncing)
  const isDownloading = useContentStore((s) => s.isDownloading)
  const error = useContentStore((s) => s.error)
  const downloadProgress = useContentStore((s) => s.downloadProgress)

  if (!isLoading && !isSyncing && !isDownloading && !error) {
    return null
  }

  const formatBytes = (bytes: number) => contentManager.formatBytes(bytes)

  const getRealTimeProgress = () => {
    if (!downloadProgress) return 0
    const completedBytes = downloadProgress.downloadedSize + downloadProgress.currentItemBytes
    if (downloadProgress.totalSize > 0) {
      return (completedBytes / downloadProgress.totalSize) * 100
    }
    const itemProgress = downloadProgress.currentItemTotalBytes > 0
      ? downloadProgress.currentItemBytes / downloadProgress.currentItemTotalBytes
      : 0
    return ((downloadProgress.completedItems + itemProgress) / downloadProgress.totalItems) * 100
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3 min-w-[280px]">
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <span className="font-medium">Error:</span>
            <span className="truncate">{error}</span>
          </div>
        )}

        {(isLoading || isSyncing) && !error && (
          <div className="flex items-center gap-2 text-neutral-600 text-sm">
            <CircleNotchIcon className="animate-spin" size={16} />
            <span>
              {isLoading ? 'Checking for content updates...' : 'Syncing content...'}
            </span>
          </div>
        )}

        {isDownloading && downloadProgress && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-neutral-700 text-sm">
              <DownloadSimpleIcon size={16} />
              <span className="font-medium">Downloading content</span>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>
                {downloadProgress.completedItems}/{downloadProgress.totalItems} files
              </span>
              {downloadProgress.totalSize > 0 && (
                <span>
                  {formatBytes(downloadProgress.downloadedSize + downloadProgress.currentItemBytes)} / {formatBytes(downloadProgress.totalSize)}
                </span>
              )}
            </div>

            {/* Current file progress */}
            {downloadProgress.currentItemTotalBytes > 0 && (
              <div className="text-xs text-neutral-400 truncate">
                {formatBytes(downloadProgress.currentItemBytes)} / {formatBytes(downloadProgress.currentItemTotalBytes)}
              </div>
            )}

            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all duration-75 ease-out"
                style={{
                  width: `${Math.min(100, getRealTimeProgress())}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const ContentDownloadComplete = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3 min-w-[280px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircleIcon size={16} weight="fill" />
            <span>Content download complete</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-neutral-400 hover:text-neutral-600 text-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
