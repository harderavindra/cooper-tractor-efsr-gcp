// Empty string uses the same-origin API in production.
// Set VITE_API_URL=http://localhost:3001 for local dev
const BASE = import.meta.env.VITE_API_URL ?? ''
export const API_BASE = BASE

export interface ApiErrorBody {
  code: string
  message: string
  retryAfter?: number
}

export class ApiError extends Error {
  code: string
  status: number
  retryAfter?: number

  constructor(body: ApiErrorBody, status: number) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.status = status
    this.retryAfter = body.retryAfter
  }
}

function getToken() {
  return localStorage.getItem('token')
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json() as { token: string; refreshToken: string }
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    return data.token
  } catch {
    return null
  }
}

function clearAuth() {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    // Fire-and-forget logout to invalidate refresh token on server
    fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getToken()

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    if (!navigator.onLine) throw new ApiError({ code: 'NO_INTERNET', message: 'No internet connection' }, 0)
    throw new ApiError({ code: 'CONNECTION_FAILED', message: 'Cannot reach server' }, 0)
  }

  if (res.status === 401 && !isRetry && !path.startsWith('/api/auth/')) {
    // Try to refresh the token once
    if (!isRefreshing) {
      isRefreshing = true
      const newToken = await attemptRefresh()
      isRefreshing = false
      refreshQueue.forEach(cb => cb(newToken))
      refreshQueue = []
      if (newToken) {
        return request<T>(path, options, true)
      }
    } else {
      // Queue the request until the ongoing refresh completes
      await new Promise<void>((resolve) => {
        refreshQueue.push(() => resolve())
      })
      return request<T>(path, options, true)
    }
    // Refresh failed — clear auth and redirect
    clearAuth()
    window.location.href = '/login'
    throw new ApiError({ code: 'UNAUTHORIZED', message: 'Session expired' }, 401)
  }

  if (res.status === 503) {
    throw new ApiError({ code: 'SERVER_UNAVAILABLE', message: 'Service temporarily unavailable' }, 503)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: ApiErrorBody; message?: string }
    const errorBody: ApiErrorBody = body.error ?? {
      code: 'ERROR',
      message: body.message ?? `HTTP ${res.status}`,
    }
    throw new ApiError(errorBody, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function uploadFiles<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
  } catch {
    if (!navigator.onLine) throw new ApiError({ code: 'NO_INTERNET', message: 'No internet connection' }, 0)
    throw new ApiError({ code: 'CONNECTION_FAILED', message: 'Cannot reach server' }, 0)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: ApiErrorBody; message?: string }
    const errorBody: ApiErrorBody = body.error ?? { code: 'UPLOAD_ERROR', message: body.message ?? `HTTP ${res.status}` }
    throw new ApiError(errorBody, res.status)
  }
  return res.json()
}

export async function directGCSUpload(
  file: File | Blob,
  folder: string,
  contentType?: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const filename = (file instanceof File && file.name) ? file.name : 'upload'
  const ct = contentType || (file instanceof File ? file.type : '') || 'application/octet-stream'
  const { uploadUrl, gcsUrl, contentLengthRange } = await request<{ uploadUrl: string; gcsUrl: string; contentLengthRange?: string }>(
    `/api/gcs/upload-url`,
    { method: 'POST', body: JSON.stringify({ folder, filename, contentType: ct }) }
  )
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', ct)
    // Must match exactly what the server baked into the signed URL's signature, or GCS rejects the PUT.
    if (contentLengthRange) xhr.setRequestHeader('X-Goog-Content-Length-Range', contentLengthRange)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded * 100) / e.total))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new ApiError({ code: 'UPLOAD_ERROR', message: `GCS upload failed: ${xhr.status}` }, xhr.status))
    }
    xhr.onerror = () => reject(new ApiError({ code: 'UPLOAD_ERROR', message: 'GCS upload network error' }, 0))
    xhr.send(file)
  })
  return gcsUrl
}

export const api = {
  get:    <T>(path: string)                          => request<T>(path),
  post:   <T>(path: string, body: unknown)           => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)           => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)           => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)                          => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData)      => uploadFiles<T>(path, formData),
}
