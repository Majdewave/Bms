import { Fragment, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import {
  deleteProjectFile,
  downloadProjectFile,
  getProjectProposals,
  updateProjectProposalTitle,
  uploadProjectProposal,
  viewProjectProposal,
  type ClientFileRecord,
} from '@/pm/api/clientFiles'
import { displayTitle, fileErrorKey, fileExtension, formatFileSize, saveBlob } from '@/pm/utils/fileHelpers'
import type { Project } from '@/types/pm'
import { Check, Download, Eye, FileText, Pencil, Trash2, Upload, X } from 'lucide-react'

const MAX_TITLE_LENGTH = 200
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx'])
const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.xls,.xlsx'

type Props = { project: Project }

const hasAllowedExtension = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return !!extension && ALLOWED_EXTENSIONS.has(extension)
}

export default function PmProjectProposalsSection({ project }: Props) {
  const { t, i18n } = useTranslation()
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
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!canManage) return
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)
    getProjectProposals(project.id)
      .then((items) => { if (!cancelled) setFiles(items) })
      .catch((error) => {
        console.error('Failed to load project proposals:', error)
        if (!cancelled) { setFiles([]); setLoadFailed(true) }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [project.id, canManage])

  if (!canManage) return null

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file)
    if (file && !hasAllowedExtension(file.name)) {
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
      setNotice({ kind: 'error', text: t('pm.projectProposals.invalidFileType') })
    } else {
      setNotice(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || uploading) return
    if (!hasAllowedExtension(selectedFile.name)) {
      setNotice({ kind: 'error', text: t('pm.projectProposals.invalidFileType') })
      return
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      setNotice({ kind: 'error', text: t('pm.projectProposals.invalidTitle') })
      return
    }
    setUploading(true)
    setNotice(null)
    try {
      const created = await uploadProjectProposal(project.id, selectedFile, title)
      setFiles((current) => [created, ...current])
      setSelectedFile(null)
      setTitle('')
      if (inputRef.current) inputRef.current.value = ''
      setNotice({ kind: 'success', text: t('pm.projectProposals.uploadSuccess') })
    } catch (error) {
      console.error('Project proposal upload failed:', error)
      const text = error instanceof ApiError && error.status === 400
        ? t('pm.projectProposals.invalidUpload')
        : t(fileErrorKey(error, 'upload'))
      setNotice({ kind: 'error', text })
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (file: ClientFileRecord) => {
    try {
      saveBlob(await downloadProjectFile(project.id, file.id), file.fileName)
    } catch (error) {
      console.error('Project proposal download failed:', error)
      setNotice({ kind: 'error', text: t(fileErrorKey(error, 'download')) })
    }
  }

  const handleView = async (file: ClientFileRecord) => {
    const preview = window.open('about:blank', '_blank')
    if (!preview) {
      setNotice({ kind: 'error', text: t('pm.projectProposals.viewBlocked') })
      return
    }
    preview.opener = null
    try {
      const blob = await viewProjectProposal(project.id, file.id)
      const url = window.URL.createObjectURL(blob)
      preview.location.href = url
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      preview.close()
      console.error('Project proposal view failed:', error)
      setNotice({ kind: 'error', text: t(fileErrorKey(error, 'download')) })
    }
  }

  const saveTitle = async (file: ClientFileRecord) => {
    if (savingId) return
    if (!editTitle.trim() || editTitle.trim().length > MAX_TITLE_LENGTH) {
      setNotice({ kind: 'error', text: t('pm.projectProposals.invalidTitle') })
      return
    }
    setSavingId(file.id)
    setNotice(null)
    try {
      const updated = await updateProjectProposalTitle(project.id, file.id, editTitle)
      setFiles((current) => current.map((item) => item.id === file.id ? updated : item))
      setEditingId(null)
      setNotice({ kind: 'success', text: t('pm.projectProposals.renameSuccess') })
    } catch (error) {
      console.error('Project proposal title update failed:', error)
      const text = error instanceof ApiError && error.status === 400
        ? t('pm.projectProposals.invalidTitle')
        : t(fileErrorKey(error, 'rename'))
      setNotice({ kind: 'error', text })
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (file: ClientFileRecord) => {
    if (!window.confirm(t('pm.projectProposals.confirmDelete', { name: displayTitle(file) }))) return
    try {
      await deleteProjectFile(project.id, file.id)
      setFiles((current) => current.filter((item) => item.id !== file.id))
      setNotice({ kind: 'success', text: t('pm.projectProposals.deleteSuccess') })
    } catch (error) {
      console.error('Project proposal delete failed:', error)
      setNotice({ kind: 'error', text: t(fileErrorKey(error, 'delete')) })
    }
  }

  return (
    <section className="space-y-3 border-t border-slate-100 pt-3" aria-labelledby={`project-proposals-${project.id}`}>
      <h5 id={`project-proposals-${project.id}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <FileText className="h-4 w-4 text-primary-600" />
        {t('pm.projectProposals.title')}
      </h5>

      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <input
          type="text"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          disabled={uploading}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('pm.projectProposals.titlePlaceholder')}
          aria-label={t('pm.projectProposals.titleInput')}
          required
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          disabled={uploading}
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          aria-label={t('pm.projectProposals.chooseFile')}
          className="w-full min-w-0 rounded-md border border-slate-300 bg-white text-xs file:me-2 file:border-0 file:bg-slate-100 file:px-2 file:py-1.5 file:text-xs"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || !title.trim() || uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? t('pm.projectProposals.uploading') : t('pm.projectProposals.upload')}
        </button>
      </div>

      {notice && <p role="status" className={`text-xs ${notice.kind === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{notice.text}</p>}

      {loading ? <p className="text-sm text-slate-500">{t('common.loading')}</p>
        : loadFailed ? <p className="text-xs text-amber-700">{t('pm.projectProposals.loadError')}</p>
          : files.length === 0 ? <p className="py-2 text-sm text-slate-500">{t('pm.projectProposals.empty')}</p>
            : (
              <ul className="space-y-2">
                {files.map((file) => {
                  const editing = editingId === file.id
                  const isPdf = file.fileName.toLowerCase().endsWith('.pdf')
                  return (
                    <li key={file.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-[12rem] flex-1 items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            {editing ? (
                              <input type="text" autoFocus value={editTitle} maxLength={MAX_TITLE_LENGTH}
                                onChange={(event) => setEditTitle(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter') void saveTitle(file); if (event.key === 'Escape') setEditingId(null) }}
                                aria-label={t('pm.projectProposals.titleInput')}
                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                            ) : <p className="break-words text-sm font-medium text-slate-900"><bdi>{displayTitle(file)}</bdi></p>}
                            <p className="mt-1 break-all text-xs text-slate-500">{t('pm.projectProposals.originalFilename')}: <bdi>{file.fileName}</bdi></p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {[fileExtension(file.fileName), formatFileSize(file.fileSize), file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString(i18n.language) : null]
                                .filter(Boolean).map((part, index) => <Fragment key={index}>{index > 0 && ' | '}<bdi>{part}</bdi></Fragment>)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {editing ? <>
                            <button type="button" onClick={() => void saveTitle(file)} disabled={savingId === file.id} title={t('pm.projectProposals.save')} className="rounded-md border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setEditingId(null)} title={t('pm.projectProposals.cancel')} className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /></button>
                          </> : <>
                            {isPdf && <button type="button" onClick={() => void handleView(file)} title={t('pm.projectProposals.view')} className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4" /></button>}
                            <button type="button" onClick={() => void handleDownload(file)} title={t('pm.projectProposals.download')} className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"><Download className="h-4 w-4" /></button>
                            <button type="button" onClick={() => { setEditingId(file.id); setEditTitle(file.title ?? '') }} title={t('pm.projectProposals.editTitle')} className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => void handleDelete(file)} title={t('pm.projectProposals.delete')} className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                          </>}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
    </section>
  )
}