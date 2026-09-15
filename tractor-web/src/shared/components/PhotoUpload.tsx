import { useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { PhotoImg } from './PhotoImg'

export interface UploadItem {
  id:       string
  file?:    File       // absent for items seeded from server
  url?:     string
  status:   'uploading' | 'done' | 'error'
  progress: number    // 0–100; 100 when done
}

interface Props {
  items:    UploadItem[]
  onAdd:    (files: File[]) => void
  onRemove: (id: string) => void
}

export default function PhotoUpload({ items, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length) onAdd(picked)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              {item.file ? (
                <img
                  src={URL.createObjectURL(item.file)}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
              ) : item.url ? (
                <PhotoImg src={item.url} className="w-full h-full object-cover" />
              ) : null}

              {/* Upload in-progress overlay */}
              {item.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5 px-3">
                  <span className="text-white text-xs font-bold tabular-nums">{item.progress}%</span>
                  <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-150"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {item.status === 'error' && (
                <div className="absolute inset-0 bg-red-900/50 flex flex-col items-center justify-center gap-1">
                  <AlertCircle className="w-5 h-5 text-red-300" />
                  <p className="text-[9px] text-red-200 font-semibold">Failed</p>
                </div>
              )}

              {/* Remove button — hidden while uploading */}
              {item.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <div className="absolute bottom-0 inset-x-0 bg-black/40 px-1.5 py-0.5">
                <p className="text-[9px] text-white truncate">{item.file?.name ?? '✓ Saved'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAdd}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#E76124] hover:bg-[#fef4ef] transition-colors group"
      >
        <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#fde9df] flex items-center justify-center transition-colors">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-[#E76124]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-500 group-hover:text-[#E76124]">
            {items.length === 0 ? 'Add Photos' : 'Add More'}
          </p>
          <p className="text-xs text-gray-300 mt-0.5">Tap to open camera or gallery</p>
        </div>
      </button>

      {items.length > 0 && (
        <p className="text-[10px] text-gray-400 text-center">
          {items.filter(i => i.status === 'done').length}/{items.length} uploaded
        </p>
      )}
    </div>
  )
}
