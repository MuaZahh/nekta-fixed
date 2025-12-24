import { useCallback, useEffect, useState } from "react";
import Lottie from 'react-lottie'
import * as animationData from '../../assets/arrow_right_line.json'
import { CheckIcon, XIcon } from "@phosphor-icons/react";

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

  const defaultAnimIconOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  }

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
    
    setTimeout(() => {
      setState("idle");
    }, 1000);
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
      <div className="bg-white border border-neutral-100 rounded-2xl p-4 w-[400px] max-w-[90vw]">
        {state === "downloading" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-[6px] bg-black  rounded-lg rotate-90">
                <Lottie
                    options={defaultAnimIconOptions}
                    height={20}
                    width={20}
                    isStopped={false}
                    isPaused={false}
                  />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Downloading Renderer
                </h3>
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
              <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(progress?.percent ?? 0) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}

        {state === "complete" && (
          <div className="flex gap-3 items-center justify-center py-4">
           <div className="p-[6px] bg-black  rounded-lg  text-white">
              <CheckIcon size={20} />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Download Complete
            </h3>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col justify-center items-center">
            <div className="flex items-center justify-center gap-2">
              <div className="p-[6px] bg-red-500  rounded-lg  text-white">
                <XIcon size={20} />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Download Failed
              </h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-1">
              {error || "An error occurred while downloading"}
            </p>
            <div className="flex justify-center w-full">
              <button
              onClick={() => setState("idle")}
              className="mt-4 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Close
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
