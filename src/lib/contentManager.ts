import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const MANIFEST_URL = 'https://cdn.nekta-studio.com/content-manifest.json'

export interface MediaContentItem {
  uid: string
  url: string
  type: 'video' | 'image' | 'audio'
  category: string
  tags: string[]
  name: string | null
  size: number | null
  localPath: string | null
  mediaUrl: string | null
  isDownloaded: boolean
  metadata?: Record<string, unknown>
}

interface DownloadProgress {
  totalItems: number
  completedItems: number
  currentItem: string | null
  totalSize: number
  downloadedSize: number
  currentItemBytes: number
  currentItemTotalBytes: number
}

interface ContentState {
  isInitialized: boolean
  isLoading: boolean
  isSyncing: boolean
  isDownloading: boolean
  error: string | null
  items: MediaContentItem[]
  downloadProgress: DownloadProgress | null
}

interface ContentActions {
  setInitialized: (initialized: boolean) => void
  setLoading: (loading: boolean) => void
  setSyncing: (syncing: boolean) => void
  setDownloading: (downloading: boolean) => void
  setError: (error: string | null) => void
  setItems: (items: MediaContentItem[]) => void
  updateItem: (uid: string, updates: Partial<MediaContentItem>) => void
  setDownloadProgress: (progress: DownloadProgress | null) => void
  updateDownloadProgress: (updates: Partial<DownloadProgress>) => void
  getItemsByCategory: (type: string, category: string) => MediaContentItem[]
  getDownloadedItemsByCategory: (type: string, category: string) => MediaContentItem[]
}

export const useContentStore = create<ContentState & ContentActions>()(
  immer((set, get) => ({
    isInitialized: false,
    isLoading: false,
    isSyncing: false,
    isDownloading: false,
    error: null,
    items: [],
    downloadProgress: null,

    setInitialized: (initialized) =>
      set((state) => {
        state.isInitialized = initialized
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading
      }),

    setSyncing: (syncing) =>
      set((state) => {
        state.isSyncing = syncing
      }),

    setDownloading: (downloading) =>
      set((state) => {
        state.isDownloading = downloading
      }),

    setError: (error) =>
      set((state) => {
        state.error = error
      }),

    setItems: (items) =>
      set((state) => {
        state.items = items
      }),

    updateItem: (uid, updates) =>
      set((state) => {
        const index = state.items.findIndex((item) => item.uid === uid)
        if (index !== -1) {
          Object.assign(state.items[index], updates)
        }
      }),

    setDownloadProgress: (progress) =>
      set((state) => {
        state.downloadProgress = progress
      }),

    updateDownloadProgress: (updates) =>
      set((state) => {
        if (state.downloadProgress) {
          Object.assign(state.downloadProgress, updates)
        }
      }),

    getItemsByCategory: (type, category) => {
      return get().items.filter(
        (item) => item.type === type && item.category === category
      )
    },

    getDownloadedItemsByCategory: (type, category) => {
      return get().items.filter(
        (item) =>
          item.type === type && item.category === category && item.isDownloaded
      )
    },
  }))
)

class ContentManager {
  private static instance: ContentManager
  private manifestUrl: string

  private constructor() {
    this.manifestUrl = MANIFEST_URL
  }

  static getInstance(): ContentManager {
    if (!ContentManager.instance) {
      ContentManager.instance = new ContentManager()
    }
    return ContentManager.instance
  }

  async initialize(): Promise<void> {
    const store = useContentStore.getState()

    if (store.isInitialized) {
      return
    }

    store.setLoading(true)
    store.setError(null)

    try {
      const fetchResult = await window.ipcRenderer.invoke(
        'CONTENT_FETCH_MANIFEST',
        this.manifestUrl
      )

      console.log(fetchResult.manifest)

      if (!fetchResult.ok) {
        throw new Error(fetchResult.error || 'Failed to fetch manifest')
      }

      const checkResult = await window.ipcRenderer.invoke(
        'CONTENT_CHECK_MANIFEST',
        this.manifestUrl,
        fetchResult.contentHash
      )

      if (!checkResult.ok) {
        throw new Error(checkResult.error || 'Failed to check manifest')
      }

      if (checkResult.changed) {
        store.setSyncing(true)

        const syncResult = await window.ipcRenderer.invoke(
          'CONTENT_SYNC_FROM_MANIFEST',
          fetchResult.manifest
        )

        if (!syncResult.ok) {
          throw new Error(syncResult.error || 'Failed to sync content')
        }

        await window.ipcRenderer.invoke(
          'CONTENT_UPDATE_MANIFEST',
          this.manifestUrl,
          fetchResult.contentHash,
          fetchResult.manifest.version
        )

        store.setSyncing(false)
      }

      await this.refreshItems()

      const pending = await this.getPendingDownloads()
      if (pending.items.length > 0) {
        this.startDownloads()
      }

      store.setInitialized(true)
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Unknown error')
      console.error('ContentManager initialization failed:', error)
    } finally {
      store.setLoading(false)
    }
  }

  async refreshItems(): Promise<void> {
    const result = await window.ipcRenderer.invoke('CONTENT_GET_ALL')
    if (result.ok) {
      useContentStore.getState().setItems(result.items)
    }
  }

  async getPendingDownloads(): Promise<{
    items: Array<{ uid: string; url: string; type: string; size: number | null }>
    totalSize: number
  }> {
    const result = await window.ipcRenderer.invoke('CONTENT_GET_PENDING_DOWNLOADS')
    if (result.ok) {
      return { items: result.items, totalSize: result.totalSize }
    }
    return { items: [], totalSize: 0 }
  }

  async startDownloads(): Promise<void> {
    const store = useContentStore.getState()

    if (store.isDownloading) {
      return
    }

    store.setDownloading(true)

    const progressHandler = (
      _event: unknown,
      data: { uid: string; downloadedBytes: number; totalBytes: number }
    ) => {
      store.updateDownloadProgress({
        currentItemBytes: data.downloadedBytes,
        currentItemTotalBytes: data.totalBytes,
      })
    }

    window.ipcRenderer.on('CONTENT_DOWNLOAD_PROGRESS', progressHandler)

    try {
      const pending = await this.getPendingDownloads()

      if (pending.items.length === 0) {
        store.setDownloading(false)
        store.setDownloadProgress(null)
        return
      }

      store.setDownloadProgress({
        totalItems: pending.items.length,
        completedItems: 0,
        currentItem: null,
        totalSize: pending.totalSize,
        downloadedSize: 0,
        currentItemBytes: 0,
        currentItemTotalBytes: 0,
      })

      let completedItems = 0
      let downloadedSize = 0

      for (const item of pending.items) {
        store.updateDownloadProgress({
          currentItem: item.url,
          currentItemBytes: 0,
          currentItemTotalBytes: item.size || 0,
        })

        const result = await window.ipcRenderer.invoke(
          'CONTENT_DOWNLOAD_ITEM',
          item.uid
        )

        if (result.ok) {
          completedItems++
          downloadedSize += result.size || item.size || 0

          store.updateDownloadProgress({
            completedItems,
            downloadedSize,
            currentItemBytes: 0,
            currentItemTotalBytes: 0,
          })

          store.updateItem(item.uid, {
            isDownloaded: true,
            localPath: result.localPath,
            mediaUrl: result.localPath
              ? `media://${encodeURIComponent(result.localPath)}`
              : null,
            size: result.size || item.size,
          })
        } else {
          console.error(`Failed to download ${item.url}:`, result.error)
        }
      }

      await this.refreshItems()
    } catch (error) {
      console.error('Download failed:', error)
      store.setError(error instanceof Error ? error.message : 'Download failed')
    } finally {
      window.ipcRenderer.removeListener('CONTENT_DOWNLOAD_PROGRESS', progressHandler)
      store.setDownloading(false)
      store.setDownloadProgress(null)
    }
  }

  async getContentByCategory(
    type: string,
    category: string
  ): Promise<MediaContentItem[]> {
    const result = await window.ipcRenderer.invoke(
      'CONTENT_GET_BY_CATEGORY',
      type,
      category
    )
    if (result.ok) {
      return result.items
    }
    return []
  }

  getDownloadedBackgroundVideos(): MediaContentItem[] {
    return useContentStore
      .getState()
      .getDownloadedItemsByCategory('video', 'background')
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }
}

export const contentManager = ContentManager.getInstance()
