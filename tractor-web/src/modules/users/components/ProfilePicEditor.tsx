import { useState, useRef, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area as CropArea } from 'react-easy-crop'
import { api, directGCSUpload } from '../../../shared/lib/api'
import { PhotoImg } from '../../../shared/components/PhotoImg'
import { useAuth } from '../../../shared/context/AuthContext'

interface Props {
  userId:     string
  currentUrl?: string
  userName:   string
  onUpdated:  (url: string | null) => void
}

async function getCroppedBlob(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })
  const canvas = document.createElement('canvas')
  canvas.width  = 240
  canvas.height = 240
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 240, 240)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas is empty')), 'image/jpeg', 0.85)
  )
}

function Initials({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#1E1951] text-white text-2xl font-bold select-none">
      {initials}
    </div>
  )
}

export function ProfilePicEditor({ userId, currentUrl, userName, onUpdated }: Props) {
  const { userId: selfId, setProfilePic } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc,    setCropSrc]    = useState<string | null>(null)
  const [crop,       setCrop]       = useState({ x: 0, y: 0 })
  const [zoom,       setZoom]       = useState(1)
  const [pixelCrop,  setPixelCrop]  = useState<CropArea | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [error,      setError]      = useState('')
  const [displayUrl, setDisplayUrl] = useState(currentUrl)

  useEffect(() => { setDisplayUrl(currentUrl) }, [currentUrl])

  function openPicker() { fileInputRef.current?.click() }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setPixelCrop(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: CropArea, pixels: CropArea) => {
    setPixelCrop(pixels)
  }, [])

  async function handleApplyCrop() {
    if (!cropSrc || !pixelCrop) return
    setSaving(true)
    setError('')
    try {
      const blob = await getCroppedBlob(cropSrc, pixelCrop)
      const gcsUrl = await directGCSUpload(blob, 'profiles', 'image/jpeg')
      const result = await api.patch<{ profilePic: string }>(`/api/users/${userId}/profile-pic`, { gcsUrl })
      setDisplayUrl(result.profilePic)
      onUpdated(result.profilePic)
      if (userId === selfId) setProfilePic(result.profilePic)
      setCropSrc(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Remove profile picture?')) return
    setDeleting(true)
    setError('')
    try {
      await api.delete(`/api/users/${userId}/profile-pic`)
      setDisplayUrl(undefined)
      onUpdated(null)
      if (userId === selfId) setProfilePic(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar circle */}
      <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-gray-100 group cursor-pointer" onClick={openPicker}>
        {displayUrl
          ? <PhotoImg src={displayUrl} alt={userName} className="w-full h-full object-cover" />
          : <Initials name={userName} />
        }
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] text-white font-medium">Change</span>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {displayUrl && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-[11px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Removing…' : 'Remove photo'}
        </button>
      )}

      {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}

      {/* Crop modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-[420px] max-w-[95vw]">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1E1951]">Crop Photo</p>
              <button type="button" onClick={() => setCropSrc(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Crop area */}
            <div className="relative w-full" style={{ height: 320 }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{ containerStyle: { borderRadius: 0 } }}
              />
            </div>

            {/* Zoom slider */}
            <div className="px-5 py-3 flex items-center gap-3 border-t border-gray-100">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#E76124]"
              />
              <svg className="w-4.5 h-4.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zM11 8v6M8 11h6" />
              </svg>
            </div>

            <div className="px-5 pb-4 flex gap-3">
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#E76124] hover:bg-[#cf5520] disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </>
                ) : 'Apply Crop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
