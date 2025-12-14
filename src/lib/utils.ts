import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export const urlToBase64 = async (url: string): Promise<string> => {
  const result = await window.ipcRenderer.invoke('FETCH_IMAGE_BASE64', url)
  if (!result.ok) {
    throw new Error(result.error || 'Failed to fetch image')
  }
  return result.data
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
