import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clientPhotosService, type ClientPhoto } from '@/api/clientPhotosService'

type Props = {
  clientId: string
  onCountChange?: (count: number) => void
}

type UploadSlotProps = {
  id: string
  label: string
  placeholder: string
  file: File | null
  previewUrl: string
  onFileSelect: (file: File | null) => void
  onClear: () => void
}

function UploadSlot({
  id,
  label,
  placeholder,
  file,
  previewUrl,
  onFileSelect,
  onClear,
}: UploadSlotProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped && dropped.type.startsWith('image/')) {
      onFileSelect(dropped)
    }
  }

  return (
    <div className="space-y-2 group">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`block border-2 border-dashed rounded-xl p-3 cursor-pointer transition ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/40'
        }`}
      >
        <div className="relative">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="w-full h-40 object-cover rounded-lg"
            />
          ) : (
            <div className="h-40 rounded-lg bg-slate-50 text-slate-500 flex flex-col items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              <span className="text-xs text-center">{placeholder}</span>
            </div>
          )}

          {file && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onClear()
              }}
              aria-label={label}
              className="absolute top-2 end-2 p-1.5 rounded-full bg-white/90 border border-slate-200 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <input
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  )
}

export default function ClientBeforeAfterPhotos({ clientId, onCountChange }: Props) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'

  const [photos, setPhotos] = useState<ClientPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)

  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)

  const resolveImageUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const baseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5146'
    return `${baseUrl}${url}`
  }

  const beforePreview = useMemo(
    () => (beforeFile ? URL.createObjectURL(beforeFile) : ''),
    [beforeFile]
  )
  const afterPreview = useMemo(
    () => (afterFile ? URL.createObjectURL(afterFile) : ''),
    [afterFile]
  )

  useEffect(() => {
    return () => {
      if (beforePreview) URL.revokeObjectURL(beforePreview)
      if (afterPreview) URL.revokeObjectURL(afterPreview)
    }
  }, [beforePreview, afterPreview])

  const loadPhotos = async () => {
    if (!clientId || clientId === 'new') return

    setLoading(true)
    try {
      const result = await clientPhotosService.getPhotos(clientId)
      setPhotos(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error(t('clientPhotos.errors.loadFailed'), error)
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPhotos()
  }, [clientId])

  useEffect(() => {
    onCountChange?.(photos.length)
  }, [photos.length, onCountChange])

  const handleSave = async () => {
    if ((!beforeFile && !afterFile) || !clientId || clientId === 'new') return

    const formData = new FormData()
    formData.append('clientId', clientId)
    if (beforeFile) {
      formData.append('beforeImage', beforeFile)
    }
    if (afterFile) {
      formData.append('afterImage', afterFile)
    }

    setSaving(true)
    try {
      await clientPhotosService.uploadPhotos(formData)
      setBeforeFile(null)
      setAfterFile(null)
      setIsUploadOpen(false)
      await loadPhotos()
    } catch (error) {
      console.error(t('clientPhotos.errors.uploadFailed'), error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteImage = async (id: string, type: 'before' | 'after') => {
    const key = `${id}-${type}`
    setDeletingKey(key)
    try {
      if (type === 'before') {
        await clientPhotosService.deleteBefore(id)
      } else {
        await clientPhotosService.deleteAfter(id)
      }
      await loadPhotos()
    } catch (err) {
      console.error(t('clientPhotos.errors.deleteFailed'), err)
    } finally {
      setDeletingKey(null)
    }
  }

  const handleDeleteAll = async (id: string) => {
    if (!window.confirm(t('clientPhotos.confirmDeleteAll'))) return

    setDeletingKey(`${id}-all`)
    try {
      await clientPhotosService.deleteAll(id)
      await loadPhotos()
    } catch (err) {
      console.error(t('clientPhotos.errors.deleteAllFailed'), err)
    } finally {
      setDeletingKey(null)
    }
  }

  const handleCancelUpload = () => {
    setBeforeFile(null)
    setAfterFile(null)
    setIsUploadOpen(false)
  }

  const formatUploadDate = (createdAt?: string) => {
    if (!createdAt) return '-'
    const date = new Date(createdAt)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString(i18n.language)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsUploadOpen((prev) => !prev)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-gray-100 hover:bg-gray-200 text-slate-800 transition-all duration-200 cursor-pointer ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <Plus className="w-4 h-4" />
          {t('clientPhotos.addPhotos')}
        </button>
      </div>

      {isUploadOpen && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UploadSlot
              id="before-image-upload"
              label={t('clientPhotos.before')}
              placeholder={t('clientPhotos.uploadPlaceholder')}
              file={beforeFile}
              previewUrl={beforePreview}
              onFileSelect={setBeforeFile}
              onClear={() => setBeforeFile(null)}
            />
            <UploadSlot
              id="after-image-upload"
              label={t('clientPhotos.after')}
              placeholder={t('clientPhotos.uploadPlaceholder')}
              file={afterFile}
              previewUrl={afterPreview}
              onFileSelect={setAfterFile}
              onClear={() => setAfterFile(null)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelUpload}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={(!beforeFile && !afterFile) || saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('common.saving') : t('clientPhotos.save')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">{t('common.loading')}</div>
      ) : photos.length === 0 ? (
        <div className="text-slate-500 text-sm">{t('clientPhotos.empty')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative border border-slate-200 rounded-xl p-3 bg-white transition-transform duration-200 hover:scale-[1.01]"
            >
              {(photo.beforeImageUrl || photo.afterImageUrl) && (
                <button
                  type="button"
                  onClick={() => handleDeleteAll(photo.id)}
                  disabled={deletingKey === `${photo.id}-all`}
                  aria-label={t('clientPhotos.deleteAll')}
                  title={t('clientPhotos.deleteAll')}
                  className="absolute top-2 end-2 z-10 p-1.5 rounded-full bg-white/90 border border-slate-200 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2 group">
                  <p className="text-xs font-medium text-slate-600">{t('clientPhotos.before')}</p>
                  <div className="group relative">
                    {photo.beforeImageUrl ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setPreviewImage({
                            src: resolveImageUrl(photo.beforeImageUrl),
                            alt: t('clientPhotos.before'),
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setPreviewImage({
                              src: resolveImageUrl(photo.beforeImageUrl),
                              alt: t('clientPhotos.before'),
                            })
                          }
                        }}
                        className="cursor-pointer overflow-hidden rounded-lg"
                      >
                        <img
                          src={resolveImageUrl(photo.beforeImageUrl)}
                          alt={t('clientPhotos.before')}
                          className="w-full h-40 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center text-xs">
                        {t('clientPhotos.uploadPlaceholder')}
                      </div>
                    )}
                    {photo.beforeImageUrl && (
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(photo.id, 'before')}
                        disabled={deletingKey === `${photo.id}-before`}
                        aria-label={t('clientPhotos.deleteBefore')}
                        title={t('clientPhotos.deleteBefore')}
                        className="absolute top-2 end-2 p-1.5 rounded-full bg-white/90 border border-slate-200 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {t('clientPhotos.uploadDate')}: {formatUploadDate(photo.createdAt)}
                  </p>
                </div>

                <div className="space-y-2 group">
                  <p className="text-xs font-medium text-slate-600">{t('clientPhotos.after')}</p>
                  <div className="group relative">
                    {photo.afterImageUrl ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setPreviewImage({
                            src: resolveImageUrl(photo.afterImageUrl),
                            alt: t('clientPhotos.after'),
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setPreviewImage({
                              src: resolveImageUrl(photo.afterImageUrl),
                              alt: t('clientPhotos.after'),
                            })
                          }
                        }}
                        className="cursor-pointer overflow-hidden rounded-lg"
                      >
                        <img
                          src={resolveImageUrl(photo.afterImageUrl)}
                          alt={t('clientPhotos.after')}
                          className="w-full h-40 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center text-xs">
                        {t('clientPhotos.uploadPlaceholder')}
                      </div>
                    )}
                    {photo.afterImageUrl && (
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(photo.id, 'after')}
                        disabled={deletingKey === `${photo.id}-after`}
                        aria-label={t('clientPhotos.deleteAfter')}
                        title={t('clientPhotos.deleteAfter')}
                        className="absolute top-2 end-2 p-1.5 rounded-full bg-white/90 border border-slate-200 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {t('clientPhotos.uploadDate')}: {formatUploadDate(photo.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 end-4 w-9 h-9 rounded-full bg-white/15 text-white text-xl leading-none hover:bg-white/25"
            aria-label={t('common.close')}
          >
            ×
          </button>
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            className="max-w-[90%] max-h-[80vh] object-contain rounded-xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
