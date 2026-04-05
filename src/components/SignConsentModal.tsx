import { useEffect, useMemo, useRef, useState } from 'react'
import { X, FileCheck2, Eraser } from 'lucide-react'
import { consentsApi, type ConsentTemplate } from '@/api/consents'

type Props = {
  isOpen: boolean
  appointmentId: string
  clientId: string
  clientName: string
  serviceId?: string | null
  serviceName?: string | null
  onClose: () => void
  onSigned?: () => void
}

const fillTemplate = (template: string, vars: Record<string, string>) => {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => vars[key] || '')
}

export default function SignConsentModal({
  isOpen,
  appointmentId,
  clientId,
  clientName,
  serviceId,
  serviceName,
  onClose,
  onSigned,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [signing, setSigning] = useState(false)
  const [template, setTemplate] = useState<ConsentTemplate | null>(null)
  const [editableContent, setEditableContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)


  useEffect(() => {
    if (!isOpen) return

    if (!serviceId) {
      setTemplate(null)
      setEditableContent('')
      return
    }

    let isActive = true

    setLoading(true)
    setTemplate(null)

    consentsApi
      .getTemplateByService(serviceId)
      .then((result) => {
        if (isActive) {
          setTemplate(result)
        }
      })
      .catch((error) => {
        console.error('Failed to load template:', error)
        if (isActive) {
          setTemplate(null)
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [isOpen, serviceId])

  const renderedHtml = useMemo(() => {
    if (!template?.content) return ''
    return fillTemplate(template.content, {
      clientName,
      serviceName: serviceName || '',
      date: new Date().toLocaleDateString(),
    })
  }, [template, clientName, serviceName])

  useEffect(() => {
    setEditableContent(renderedHtml)
  }, [renderedHtml])

  const getPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const point = getPoint(e)
    if (!point) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawingRef.current = true
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const point = getPoint(e)
    if (!point) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(point.x, point.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const endDraw = () => {
    drawingRef.current = false
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getSignatureBase64 = () => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const empty = document.createElement('canvas')
    empty.width = canvas.width
    empty.height = canvas.height
    if (canvas.toDataURL() === empty.toDataURL()) return null
    return canvas.toDataURL('image/png')
  }

  const handleSign = async () => {
    const signature = getSignatureBase64()

    if (!template?.id) {
      alert('No consent template found for this service')
      return
    }

    if (!editableContent.trim()) {
      alert('Rendered consent content is empty')
      return
    }

    if (!signature) {
      alert('Signature is required')
      return
    }

    try {
      setSigning(true)
      await consentsApi.signConsent({
        templateId: template.id,
        clientId,
        appointmentId,
        serviceId: serviceId || undefined,
        consentContent: editableContent,
        clientSignatureBase64: signature,
      })
      onSigned?.()
      onClose()
    } catch (error) {
      console.error('Failed to sign consent:', error)
      alert('Failed to sign consent')
    } finally {
      setSigning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Sign Consent</h3>
            <p className="text-sm text-slate-500">{clientName} • {serviceName || '-'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[72vh] overflow-y-auto">
          <div className="border border-slate-200 rounded-xl bg-slate-50 p-5 min-h-[420px]">
            {loading ? (
              <div className="text-slate-500 text-sm">Loading template...</div>
            ) : !template ? (
              <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                No consent template is configured for this service.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${
                      isEditing
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${
                      !isEditing
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Preview
                  </button>
                </div>

                {isEditing ? (
                  <textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    className="w-full h-full min-h-[400px] p-4 border rounded-lg text-sm font-mono"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: editableContent }} />
                )}
              </>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-800">Client Signature</h4>
              <button
                type="button"
                onClick={clearSignature}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <Eraser className="w-3 h-3" />
                Clear
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={700}
              height={260}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              className="w-full h-[220px] border border-dashed border-slate-300 rounded-xl bg-white touch-none"
            />
            <p className="text-xs text-slate-500">Sign inside the box, then click “Sign Consent”.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
            disabled={signing}
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={loading || !template || signing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <FileCheck2 className="w-4 h-4" />
            {signing ? 'Signing...' : 'Sign Consent'}
          </button>
        </div>
      </div>
    </div>
  )
}
