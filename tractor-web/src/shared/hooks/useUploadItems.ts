import { useState } from 'react'
import { directGCSUpload } from '../lib/api'
import type { UploadItem } from '../components/PhotoUpload'

export function useUploadItems(
  bucket: string,
  onUploaded?: (url: string) => Promise<void>
) {
  const [items, setItems] = useState<UploadItem[]>([])

  function add(files: File[]) {
    const newItems: UploadItem[] = files.map(f => ({
      id:       `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file:     f,
      status:   'uploading' as const,
      progress: 0,
    }))
    setItems(prev => [...prev, ...newItems])
    newItems.forEach(item => {
      directGCSUpload(item.file!, bucket, item.file!.type, (pct) => {
        setItems(prev => prev.map(x => x.id === item.id ? { ...x, progress: pct } : x))
      })
        .then(async url => {
          if (onUploaded) {
            try { await onUploaded(url) } catch { /* confirm failed — still mark done visually */ }
          }
          setItems(prev => prev.map(x => x.id === item.id ? { ...x, url, status: 'done', progress: 100 } : x))
        })
        .catch(() => setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'error' } : x)))
    })
  }

  function remove(id: string) {
    setItems(prev => prev.filter(x => x.id !== id))
  }

  function seed(urls: string[]) {
    if (!urls.length) return
    setItems(prev => {
      const existing = new Set(prev.map(x => x.url).filter(Boolean))
      const toAdd = urls.filter(u => !existing.has(u))
      if (!toAdd.length) return prev
      return [
        ...prev,
        ...toAdd.map(url => ({ id: `seed-${url}`, url, status: 'done' as const, progress: 100 })),
      ]
    })
  }

  const uploading = items.some(x => x.status === 'uploading')
  const doneUrls  = items.filter(x => x.status === 'done').map(x => x.url!)

  return { items, setItems, add, remove, seed, uploading, doneUrls }
}
