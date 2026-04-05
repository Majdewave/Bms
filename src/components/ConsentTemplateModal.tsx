import { useEffect, useState } from 'react'
import { X, FileText } from 'lucide-react'
import { consentsApi } from '@/api/consents'

type Props = {
  isOpen: boolean
  serviceId: string
  serviceName: string
  onClose: () => void
  onSaved?: () => void
}

const DEFAULT_TEMPLATE = `<h2>Consent Form</h2>\n<p>I, <strong>{{clientName}}</strong>, consent to receive <strong>{{serviceName}}</strong> on {{date}}.</p>\n<p>I confirm I understand the procedure and possible outcomes.</p>`

export default function ConsentTemplateModal({
  isOpen,
  serviceId,
  serviceName,
  onClose,
  onSaved,
}: Props) {
  const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATE)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !serviceId) return

    const loadTemplate = async () => {
      setLoading(true)
      try {
        const template = await consentsApi.getTemplateByService(serviceId)
        setTemplateContent(template?.content || DEFAULT_TEMPLATE)
      } catch {
        setTemplateContent(DEFAULT_TEMPLATE)
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [isOpen, serviceId])

  const handleSave = async () => {
    if (!templateContent.trim()) {
      alert('Template cannot be empty')
      return
    }

    try {
      setSaving(true)
      await consentsApi.createTemplate({
        name: serviceName,                
        serviceId: serviceId,
        content: templateContent.trim()
        })
      onSaved?.()
      onClose()
    } catch (error) {
      console.error('Save template failed:', error)
      alert('Failed to save consent template')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Consent Template</h3>
              <p className="text-sm text-slate-500">{serviceName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
            Placeholders: <span className="font-medium">{'{{clientName}}'}</span>,{' '}
            <span className="font-medium">{'{{serviceName}}'}</span>, <span className="font-medium">{'{{date}}'}</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading template...</div>
          ) : (
            <textarea
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              className="w-full min-h-[360px] rounded-xl border border-slate-200 p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write consent template (HTML supported)"
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
