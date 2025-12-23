import { useCallback, useEffect, useState } from "react";
import { Loader2, Download, CheckCircle2, XCircle } from "lucide-react";

type DownloadState = "idle" | "downloading" | "complete" | "error";

interface DownloadProgress {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BrowserDownloadModal() {
  const [state, setState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDownloadStart = useCallback(() => {
    setState("downloading");
    setProgress({ percent: 0, downloadedBytes: 0, totalBytes: 0 });
    setError(null);
  }, []);

  const onDownloadProgress = useCallback(
    (_event: Electron.IpcRendererEvent, data: DownloadProgress) => {
      setProgress(data);
    },
    []
  );

  const onDownloadComplete = useCallback(() => {
    setState("complete");
    // Auto-hide after 2 seconds
    setTimeout(() => {
      setState("idle");
    }, 2000);
  }, []);

  const onDownloadError = useCallback(
    (_event: Electron.IpcRendererEvent, data: { message: string }) => {
      setState("error");
      setError(data.message);
    },
    []
  );

  useEffect(() => {
    window.ipcRenderer.on("BROWSER_DOWNLOAD_START", onDownloadStart);
    window.ipcRenderer.on("BROWSER_DOWNLOAD_PROGRESS", onDownloadProgress);
    window.ipcRenderer.on("BROWSER_DOWNLOAD_COMPLETE", onDownloadComplete);
    window.ipcRenderer.on("BROWSER_DOWNLOAD_ERROR", onDownloadError);

    return () => {
      window.ipcRenderer.off("BROWSER_DOWNLOAD_START", onDownloadStart);
      window.ipcRenderer.off("BROWSER_DOWNLOAD_PROGRESS", onDownloadProgress);
      window.ipcRenderer.off("BROWSER_DOWNLOAD_COMPLETE", onDownloadComplete);
      window.ipcRenderer.off("BROWSER_DOWNLOAD_ERROR", onDownloadError);
    };
  }, [onDownloadStart, onDownloadProgress, onDownloadComplete, onDownloadError]);

  if (state === "idle") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 w-[400px] max-w-[90vw]">
        {state === "downloading" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Downloading Renderer
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  First-time setup for video rendering
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  {progress && progress.totalBytes > 0
                    ? `${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`
                    : "Starting download..."}
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {progress ? `${Math.round(progress.percent * 100)}%` : "0%"}
                </span>
              </div>
              <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(progress?.percent ?? 0) * 100}%` }}
                />
              </div>
            </div>

            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
              This only happens once. Please wait...
            </p>
          </>
        )}

        {state === "complete" && (
          <div className="flex flex-col items-center py-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Download Complete
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ready to render videos
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center py-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-3">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Download Failed
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-1">
              {error || "An error occurred while downloading"}
            </p>
            <button
              onClick={() => setState("idle")}
              className="mt-4 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
