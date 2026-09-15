import { useState, useEffect } from 'react'
import { api, API_BASE } from '../lib/api'

const cache = new Map<string, Promise<string>>()

function toRaw(src: string): string {
  return src.startsWith('http') ? src : `${API_BASE}${src}`
}

function resolve(rawUrl: string): Promise<string> {
  if (!rawUrl.startsWith('https://storage.googleapis.com/')) {
    return Promise.resolve(rawUrl)
  }
  // Strip query params so pre-signed URLs and raw URLs share the same cache key
  const baseUrl = rawUrl.split('?')[0]
  const path = baseUrl.split('/').slice(4).join('/')
  if (!cache.has(baseUrl)) {
    const promise = api
      .post<Record<string, string>>('/api/gcs/sign', { paths: [path] })
      .then(map => map[path] ?? baseUrl)
      .catch(() => baseUrl)
    cache.set(baseUrl, promise)
  }
  return cache.get(baseUrl)!
}

interface Props {
  src: string
  alt?: string
  className?: string
  onClick?: (resolvedUrl: string) => void
  onError?: () => void
}

export function PhotoImg({ src, alt = '', className = '', onClick, onError }: Props) {
  const raw = toRaw(src)
  const [url, setUrl] = useState(() => raw.split('?')[0])

  useEffect(() => {
    let cancelled = false
    resolve(raw).then(u => { if (!cancelled) setUrl(u) })
    return () => { cancelled = true }
  }, [raw])

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onClick={onClick ? () => onClick(url) : undefined}
      onError={onError}
    />
  )
}

interface VideoProps {
  src:       string
  className?: string
}

export function SignedVideo({ src, className = '' }: VideoProps) {
  const raw = toRaw(src)
  const [url, setUrl] = useState(() => raw.split('?')[0])

  useEffect(() => {
    let cancelled = false
    resolve(raw).then(u => { if (!cancelled) setUrl(u) })
    return () => { cancelled = true }
  }, [raw])

  return <video src={url} controls className={className} preload="metadata" />
}
