import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'

type PdfViewerModalProps = {
  isOpen: boolean
  blob: Blob | null
  loading?: boolean
  error?: string | null
  title: string
  onClose: () => void
}

export default function PdfViewerModal({
  isOpen,
  blob,
  loading = false,
  error,
  title,
  onClose,
}: PdfViewerModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !blob) {
      setObjectUrl(null)
      return
    }

    const nextObjectUrl = URL.createObjectURL(blob)
    setObjectUrl(nextObjectUrl)

    return () => URL.revokeObjectURL(nextObjectUrl)
  }, [blob, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl" dir="rtl">
        <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} title="סגירה" aria-label="סגירה" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-slate-100">
          {loading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-red-700"><AlertCircle className="mb-3 h-7 w-7" />{error}</div>
          ) : objectUrl ? (
            <iframe title={title} src={objectUrl} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">אין קובץ PDF זמין להצגה.</div>
          )}
        </div>
      </div>
    </div>
  )
}