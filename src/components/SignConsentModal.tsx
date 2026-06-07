import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FileCheck2, Eraser } from 'lucide-react'
import { toast } from 'react-toastify'
import { consentsApi, type ConsentTemplate } from '@/api/consents'
import { tabletDemo, type WacomRoot, type WacomSession } from '@/lib/wacomStu500.ts'

declare global {
  interface Window {
    WacomGSS?: WacomRoot
  }
}

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

const WACOM_SCRIPT_PATHS = {
  q: '/q.js',
  sdk: '/wgssStuSdk.js',
}

const loadedScripts = new Map<string, Promise<void>>()

const loadScript = async (key: string, src: string) => {
  if (loadedScripts.has(key)) {
    await loadedScripts.get(key)
    return
  }

  const task = (async () => {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[data-wacom-script="${src}"]`) as HTMLScriptElement | null
      if (existing?.dataset.loaded === 'true') {
        resolve()
        return
      }

      const script = existing || document.createElement('script')
      if (!existing) {
        script.src = src
        script.async = true
        script.dataset.wacomScript = src
        document.body.appendChild(script)
      }

      script.onload = () => {
        script.dataset.loaded = 'true'
        resolve()
      }
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    })
  })()

  loadedScripts.set(key, task)

  try {
    await task
  } catch (error) {
    loadedScripts.delete(key)
    throw error
  }
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
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [signing, setSigning] = useState(false)
  const [template, setTemplate] = useState<ConsentTemplate | null>(null)
  const [editableContent, setEditableContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [wacomSignature, setWacomSignature] = useState<string | null>(null)
  const [isWacomModalOpen, setIsWacomModalOpen] = useState(false)
  const [wacomStatus, setWacomStatus] = useState('')
  const wacomSessionRef = useRef<WacomSession | null>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const isHebrew = i18n.language?.startsWith('he')
  const dir = isHebrew ? 'rtl' : 'ltr'
  const currentDate = new Date().toLocaleDateString(i18n.language || undefined)


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
        console.error(error)
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
    const dynamicText = t('consent.dynamicText', {
      date: currentDate,
      clientName,
      serviceName: serviceName || '-',
    })

    if (!template?.content) return `<p>${dynamicText}</p>`

    return fillTemplate(template.content, {
      clientName,
      serviceName: serviceName || '',
      date: currentDate,
      dynamicText,
    })
  }, [template, clientName, serviceName, currentDate, t])

  useEffect(() => {
    setEditableContent(renderedHtml)
  }, [renderedHtml])

  useEffect(() => {
    const onSignatureCaptured = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      if (typeof customEvent.detail === 'string' && customEvent.detail.trim()) {
        setWacomSignature(customEvent.detail)
        setIsWacomModalOpen(false)
        setWacomStatus('')
      }
    }

    window.addEventListener('wacom-signature-captured', onSignatureCaptured)
    return () => {
      window.removeEventListener('wacom-signature-captured', onSignatureCaptured)
    }
  }, [])

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
    setWacomSignature(null)
    const signatureCanvas = signatureCanvasRef.current
    if (signatureCanvas) {
      const signatureCtx = signatureCanvas.getContext('2d')
      signatureCtx?.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height)
    }
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

  const disconnect = async () => {
    if (wacomSessionRef.current) {
      try {
        await wacomSessionRef.current.disconnect()
      } catch {
        // Ignore disconnect failures because the modal should still close.
      }
      wacomSessionRef.current = null
    }

    setIsWacomModalOpen(false)
    setWacomStatus('')
  }

  const handleWacomSign = async () => {
    try {
      setWacomStatus('Loading Wacom components...')
      await loadScript('wacom-sdk', WACOM_SCRIPT_PATHS.sdk)

      const wacom = window.WacomGSS
      if (!wacom) {
        throw new Error('Wacom SDK global is unavailable')
      }

      const signatureCanvas = signatureCanvasRef.current
      if (!signatureCanvas) {
        throw new Error('Signature canvas is unavailable')
      }

      if (wacomSessionRef.current) {
        await wacomSessionRef.current.disconnect()
        wacomSessionRef.current = null
      }

      wacomSessionRef.current = await tabletDemo(wacom, {
        createModalWindow: (message?: string) => {
          setIsWacomModalOpen(true)
          setWacomStatus(message || 'Please sign on your Wacom device and press OK.')
        },
        setStatus: (message: string) => {
          setWacomStatus(message)
        },
        closeModalWindow: () => {
          setIsWacomModalOpen(false)
          setWacomStatus('')
          wacomSessionRef.current = null
        },
      }, signatureCanvas)
    } catch (error) {
      console.error(error)
      await disconnect()
      toast.error('Wacom device not connected')
    }
  }

  const handleSign = async () => {
    const canvasSignature = getSignatureBase64()
    const signature = wacomSignature ?? canvasSignature

    if (!template?.id) {
      alert(t('consent.noTemplate'))
      return
    }

    if (!editableContent.trim()) {
      alert(t('consent.emptyContent'))
      return
    }

    if (!signature) {
      alert(t('consent.signatureRequired'))
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
      console.error(error)
      alert(t('consent.signFailed'))
    } finally {
      setSigning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 sm:p-6" dir={dir}>
      <div className="w-full max-w-4xl max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('consent.title')}</h3>
            <p className="text-sm text-slate-500">{clientName} • {serviceName || '-'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 overflow-y-auto">
          <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 min-h-[320px]">
            {loading ? (
              <div className="text-slate-500 text-sm">{t('common.loading')}</div>
            ) : !template ? (
              <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                {t('consent.noTemplate')}
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
                    {t('consent.edit')}
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
                    {t('consent.preview')}
                  </button>
                </div>

                {isEditing ? (
                  <textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    className="w-full h-full min-h-[300px] p-4 border rounded-lg text-sm font-mono"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: editableContent }} />
                )}
              </>
            )}
          </div>

          <div className="space-y-3">
            <canvas ref={signatureCanvasRef} width={700} height={260} className="hidden" />
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-800">{t('consent.clientSignature')}</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWacomSign}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  Sign with Wacom
                </button>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <Eraser className="w-3 h-3" />
                  {t('consent.clear')}
                </button>
              </div>
            </div>
            {wacomSignature ? (
              <div className="w-full h-[190px] border border-dashed border-slate-300 rounded-xl bg-white p-2 flex items-center justify-center">
                <img src={wacomSignature} alt="Wacom signature preview" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={700}
                height={260}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                className="w-full h-[190px] border border-dashed border-slate-300 rounded-xl bg-white touch-none"
              />
            )}
            <p className="text-xs text-slate-500">{t('consent.signInstruction')}</p>
            <p className="text-xs text-slate-600">{t('consent.confirmText')}</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700"
            disabled={signing}
          >
            {t('consent.cancelButton')}
          </button>
          <button
            onClick={handleSign}
            disabled={loading || !template || signing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <FileCheck2 className="w-4 h-4" />
            {signing ? t('consent.signing') : t('consent.signButton')}
          </button>
        </div>
      </div>

      {isWacomModalOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-3">
            <h4 className="text-base font-semibold text-slate-900">Wacom Signature Capture</h4>
            <p className="text-sm text-slate-600">{wacomStatus || 'Waiting for Wacom device...'}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void disconnect()
                }}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
