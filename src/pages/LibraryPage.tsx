import { useEffect, useState, useRef } from 'react'
import { DownloadSimpleIcon, TrashIcon, PlayIcon } from '@phosphor-icons/react'

interface MediaAsset {
  id: number
  uid: string
  libraryId: number
  name: string
  filePath: string
  type: string
  duration: number | null
  createdAt: Date
}

export const LibraryPage = () => {
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [playingUid, setPlayingUid] = useState<string | null>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  const loadMedia = async () => {
    setLoading(true)
    const result = await window.ipcRenderer.invoke('GET_LIBRARY_MEDIA')
    setMedia(result)
    setLoading(false)
  }

  useEffect(() => {
    loadMedia()
  }, [])

  const handleDownload = async (uid: string) => {
    await window.ipcRenderer.invoke('DOWNLOAD_MEDIA', uid)
  }

  const handleDelete = async (uid: string) => {
    const result = await window.ipcRenderer.invoke('DELETE_MEDIA', uid)
    if (result.success) {
      setMedia((prev) => prev.filter((m) => m.uid !== uid))
    }
  }

  const handlePlayToggle = (uid: string) => {
    const video = videoRefs.current.get(uid)
    if (!video) return

    if (playingUid === uid) {
      video.pause()
      setPlayingUid(null)
    } else {
      // Pause any currently playing video
      if (playingUid) {
        const currentVideo = videoRefs.current.get(playingUid)
        currentVideo?.pause()
      }
      video.play()
      setPlayingUid(uid)
    }
  }

  const setVideoRef = (uid: string) => (el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(uid, el)
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '--:--'
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-neutral-900">Library</h1>
        <p className="text-neutral-500 mt-1">Your rendered videos and media</p>
      </div>

      {media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-4">
            <PlayIcon size={32} className="text-neutral-400" />
          </div>
          <p className="text-neutral-500">No media yet</p>
          <p className="text-sm text-neutral-400 mt-1">Rendered videos will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {media.map((item) => (
            <div
              key={item.uid}
              className="bg-white rounded-2xl overflow-hidden group"
            >
              {/* Video Preview */}
              <div
                className="relative aspect-video bg-neutral-900 cursor-pointer"
                onClick={() => handlePlayToggle(item.uid)}
              >
                <video
                  ref={setVideoRef(item.uid)}
                  src={`media://${encodeURIComponent(item.filePath)}`}
                  className="w-full h-full object-contain"
                  onEnded={() => setPlayingUid(null)}
                  playsInline
                />
                {playingUid !== item.uid && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                      <PlayIcon size={24} className="text-black ml-1" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                  {formatDuration(item.duration)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-medium text-neutral-900 truncate">{item.name}</h3>
                <p className="text-sm text-neutral-500 mt-1">{formatDate(item.createdAt)}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleDownload(item.uid)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <DownloadSimpleIcon size={16} weight="bold" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(item.uid)}
                    className="flex items-center justify-center w-9 h-9 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    aria-label="Delete"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
