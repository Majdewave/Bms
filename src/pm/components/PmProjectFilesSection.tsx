import { useEffect, useRef, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Download, FileText, Pencil, Trash2, Upload, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getProjectFiles,
  uploadProjectFile,
  downloadProjectFile,
  updateProjectFileTitle,
  deleteProjectFile,
  type ClientFileRecord,
} from '@/pm/api/clientFiles'
import { displayTitle, fileErrorKey, fileExtension, formatFileSize, saveBlob } from '@/pm/utils/fileHelpers'
import type { Project } from '@/types/pm'

const MAX_TITLE_LENGTH = 200

type Props = { project: Project }
type Notice = { kind: 'success' | 'error'; text: string }

// Phase 7B - project-scoped documents. Client and project are implied by the current project; never user-selected.
export default function PmProjectFilesSection({ project }: Props) {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canManage = hasPermission('manage_projects')
  const [files, setFiles] = useState<ClientFileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!canManage) return
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)
    getProjectFiles(project.id)
      .then((items) => { if (!cancelled) setFiles(items) })
      .catch((error) => {
        console.error('Failed to load project files:', error)
        if (!cancelled) { setFiles([]); setLoadFailed(true) }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [project.id, canManage])

  const fail = (error: unknown, kind: 'upload' | 'rename' | 'delete' | 'download') => {
    console.error(`Project file ${kind} failed:`, error)
    setNotice({ kind: 'error', text: t(fileErrorKey(error, kind)) })
  }

  const handleUpload = async () => {
    if (!selectedFile || uploading) return
    if (title.trim().length > MAX_TITLE_LENGTH) {
      setNotice({ kind: 'error', text: t('pm.files.errors.invalidTitle') })
      return
    }
    setUploading(true)
    setNotice(null)
    try {
      const created = await uploadProjectFile(project.id, selectedFile, title)
      setFiles((current) => [created, ...current])
      setSelectedFile(null)
      setTitle('')
      if (inputRef.current) inputRef.current.value = ''
      setNotice({ kind: 'success', text: t('pm.files.uploadSuccess') })
    } catch (error) {
      fail(error, 'upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (file: ClientFileRecord) => {
    try {
      saveBlob(await downloadProjectFile(project.id, file.id), file.fileName)
    } catch (error) {
      fail(error, 'download')
    }
  }

  const startEdit = (file: ClientFileRecord) => {
    setEditingId(file.id)
    setEditTitle(file.title ?? '')
  }

  const saveTitle = async (file: ClientFileRecord) => {
    if (savingId) return
    if (editTitle.trim().length > MAX_TITLE_LENGTH) {
      setNotice({ kind: 'error', text: t('pm.files.errors.invalidTitle') })
      return
    }
    setSavingId(file.id)
    setNotice(null)
    try {
      const updated = await updateProjectFileTitle(project.id, file.id, editTitle)
      setFiles((current) => current.map((item) => (item.id === file.id ? updated : item)))
      setEditingId(null)
      setNotice({ kind: 'success', text: t('pm.files.renameSuccess') })
    } catch (error) {
      fail(error, 'rename')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (file: ClientFileRecord) => {
    if (!window.confirm(t('pm.files.confirmDeleteDocument', { name: displayTitle(file) }))) return
    try {
      await deleteProjectFile(project.id, file.id)
      setFiles((current) => current.filter((item) => item.id !== file.id))
      setNotice({ kind: 'success', text: t('pm.files.deleteSuccess') })
    } catch (error) {
      fail(error, 'delete')
    }
  }

  // Backend requires manage_projects for every project-file route, so hide the section without it.
  if (!canManage) return null

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      <h5 className="text-xs font-semibold text-slate-600">{t('pm.files.documents')}</h5>

      {canManage && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              ref={inputRef}
              type="file"
              disabled={uploading}
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              aria-label={t('pm.files.chooseFile')}
              className="w-full min-w-0 rounded-md border border-slate-300 bg-white text-xs file:me-2 file:border-0 file:bg-slate-100 file:px-2 file:py-1.5 file:text-xs"
            />
            <input
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              disabled={uploading}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('pm.files.documentTitlePlaceholder')}
              aria-label={t('pm.files.documentTitle')}
              className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? t('pm.files.uploading') : t('pm.files.uploadDocument')}
          </button>
        </div>
      )}

      {notice && (
        <p role="status" className={`text-xs ${notice.kind === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{notice.text}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      ) : loadFailed ? (
        <p className="text-xs text-amber-700">{t('pm.files.errors.load')}</p>
      ) : files.length === 0 ? (
        <p className="py-3 text-center text-sm text-slate-500">{t('pm.files.projectEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => {
            const editing = editingId === file.id
            return (
              <li key={file.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-[12rem] flex-1 items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      {editing ? (
                        <input
                          type="text"
                          autoFocus
                          value={editTitle}
                          maxLength={MAX_TITLE_LENGTH}
                          onChange={(event) => setEditTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') saveTitle(file)
                            if (event.key === 'Escape') setEditingId(null)
                          }}
                          placeholder={file.fileName}
                          aria-label={t('pm.files.documentTitle')}
                          className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <p className="break-words text-sm font-medium text-slate-900">{displayTitle(file)}</p>
                      )}
                      {file.title && file.title.trim() && !editing && (
                        <p className="break-all text-xs text-slate-500">{t('pm.files.originalFilename')}: {file.fileName}</p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[
                          fileExtension(file.fileName),
                          formatFileSize(file.fileSize),
                          new Date(file.uploadedAt).toLocaleDateString(),
                          file.uploadedByName ? `${t('pm.files.uploadedBy')}: ${file.uploadedByName}` : null,
                        ].filter(Boolean).map((segment, index) => (
                          <Fragment key={index}>{index > 0 && ' | '}<bdi>{segment}</bdi></Fragment>
                        ))}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {editing ? (
                      <>
                        <button type="button" onClick={() => saveTitle(file)} disabled={savingId === file.id} className="rounded-md border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50" title={t('pm.files.save')}>
                          <Check className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50" title={t('pm.files.cancel')}>
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => handleDownload(file)} className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50" title={t('pm.files.download')}>
                          <Download className="h-4 w-4" />
                        </button>
                        {canManage && (
                          <>
                            <button type="button" onClick={() => startEdit(file)} className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50" title={t('pm.files.rename')}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => handleDelete(file)} className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50" title={t('pm.files.deleteDocument')}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
