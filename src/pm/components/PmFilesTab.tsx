import { useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Trash2, Upload } from 'lucide-react'
import { getClientFiles, uploadClientFile, downloadClientFile, deleteClientFile, type ClientFileRecord } from '@/pm/api/clientFiles'
import { displayTitle, formatFileSize as formatSize } from '@/pm/utils/fileHelpers'

type Props = { clientId: string }

// PM Phase 2 - Files remain Client-scoped; reuses the existing FilesController endpoints.
export default function PmFilesTab({ clientId }: Props) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<ClientFileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('all')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Filter options come from the already-loaded client files; 'general' = projectId is null.
  const projectOptions = useMemo(() => {
    const map = new Map<string, string>()
    files.forEach((file) => { if (file.projectId) map.set(file.projectId, file.projectName ?? '') })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [files])

  const visibleFiles = files.filter((file) =>
    filter === 'all' ? true : filter === 'general' ? !file.projectId : file.projectId === filter)

  const load = () => {
    setLoading(true)
    getClientFiles(clientId)
      .then(setFiles)
      .catch((error) => {
        console.error('Failed to load client files:', error)
        setFiles([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadClientFile(clientId, file)
      load()
    } catch (error) {
      console.error('Failed to upload file:', error)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDownload = async (file: ClientFileRecord) => {
    try {
      const blob = await downloadClientFile(clientId, file.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

  const handleDelete = async (file: ClientFileRecord) => {
    if (!window.confirm(t('pm.files.confirmDelete', { name: displayTitle(file) }))) return
    try {
      await deleteClientFile(clientId, file.id)
      setFiles((current) => current.filter((item) => item.id !== file.id))
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{t('pm.tabs.files')}</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <Upload className="h-4 w-4" />
          {uploading ? t('common.loading') : t('pm.files.upload')}
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {files.length > 0 && (
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label={t('pm.files.filterLabel')}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-auto"
        >
          <option value="all">{t('pm.files.allFiles')}</option>
          <option value="general">{t('pm.files.general')}</option>
          {projectOptions.map((option) => (
            <option key={option.id} value={option.id}>{t('pm.files.project', { name: option.name })}</option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="py-6 text-center text-slate-500">{t('common.loading')}</div>
      ) : files.length === 0 ? (
        <div className="py-6 text-center text-slate-500">{t('pm.files.empty')}</div>
      ) : visibleFiles.length === 0 ? (
        <div className="py-6 text-center text-slate-500">{t('pm.files.empty')}</div>
      ) : (
        <div className="space-y-2">
          {visibleFiles.map((file) => (
            <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium text-slate-900">{displayTitle(file)}</p>
                {file.title && file.title.trim() && (
                  <p className="break-all text-xs text-slate-500">{file.fileName}</p>
                )}
                <p className="mt-0.5">
                  <span className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium ${file.projectId ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                    {file.projectId ? t('pm.files.project', { name: file.projectName ?? '' }) : t('pm.files.general')}
                  </span>
                </p>
                <p className="text-xs text-slate-500">{[formatSize(file.fileSize), new Date(file.uploadedAt).toLocaleDateString(), file.uploadedByName].filter(Boolean).map((segment, index) => (
                  <Fragment key={index}>{index > 0 && ' | '}<bdi>{segment}</bdi></Fragment>
                ))}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(file)}
                  className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                  title={t('admin.clientProfile.download')}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(file)}
                  className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
