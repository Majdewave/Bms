import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, RotateCcw, X } from 'lucide-react'

interface DocumentScannerModalProps {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

type ScannerState = 'starting' | 'ready' | 'captured' | 'error'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const stopMediaStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop())
}

const getCameraErrorMessage = (error: unknown) => {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'לא ניתנה הרשאה להשתמש במצלמה. יש לאפשר גישה למצלמה בדפדפן.'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'לא נמצאה מצלמה או סורק מסמכים מחובר.'
      case 'NotReadableError':
      case 'TrackStartError':
        return 'לא ניתן לפתוח את המצלמה. ייתכן שהיא נמצאת בשימוש בתוכנה אחרת.'
      case 'OverconstrainedError':
        return 'המצלמה אינה תומכת בהגדרות הצילום המבוקשות.'
      default:
        break
    }
  }

  return 'לא ניתן להפעיל את המצלמה. בדוק שהסורק מחובר ונסה שוב.'
}

export default function DocumentScannerModal({
  open,
  onClose,
  onCapture,
}: DocumentScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [state, setState] = useState<ScannerState>('starting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')

  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const cleanupStream = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const cleanupPreview = useCallback(() => {
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
      return null
    })

    setCapturedFile(null)
  }, [])

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices([])
      return
    }

    const allDevices = await navigator.mediaDevices.enumerateDevices()
    const cameras = allDevices.filter((device) => device.kind === 'videoinput')

    setDevices(cameras)

    setSelectedDeviceId((currentDeviceId) => {
      if (
        currentDeviceId &&
        cameras.some((device) => device.deviceId === currentDeviceId)
      ) {
        return currentDeviceId
      }

      const documentCamera = cameras.find((device) =>
        /document|scanner|viisan/i.test(device.label),
      )

      return documentCamera?.deviceId ?? cameras[0]?.deviceId ?? ''
    })
  }, [])

  const startCamera = useCallback(
    async (deviceId?: string) => {
      cleanupStream()

      setState('starting')
      setErrorMessage(null)

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('MediaDevices API is not available')
        }

        const videoConstraints: MediaTrackConstraints = deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 3264 },
              height: { ideal: 2448 },
            }
          : {
              width: { ideal: 3264 },
              height: { ideal: 2448 },
            }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        })

        streamRef.current = stream

        if (!videoRef.current) {
          stopMediaStream(stream)
          streamRef.current = null
          throw new Error('Video element is not available')
        }

        videoRef.current.srcObject = stream
        await videoRef.current.play()

        await loadDevices()

        const activeVideoTrack = stream.getVideoTracks()[0]
        const activeSettings = activeVideoTrack?.getSettings()

        if (activeSettings?.deviceId) {
          setSelectedDeviceId(activeSettings.deviceId)
        }

        setState('ready')
      } catch (error) {
        console.error('Failed to start document camera:', error)
        cleanupStream()
        setErrorMessage(getCameraErrorMessage(error))
        setState('error')
      }
    },
    [cleanupStream, loadDevices],
  )

  useEffect(() => {
    if (!open) {
      cleanupStream()
      cleanupPreview()
      setErrorMessage(null)
      setState('starting')
      return
    }

    void startCamera()

    return () => {
      cleanupStream()
    }
  }, [open, startCamera, cleanupStream, cleanupPreview])

  useEffect(() => {
    if (!open || !navigator.mediaDevices?.addEventListener) {
      return
    }

    const handleDeviceChange = () => {
      void loadDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange,
      )
    }
  }, [open, loadDevices])

  useEffect(() => {
    return () => {
      cleanupStream()

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [cleanupStream, previewUrl])

  const handleDeviceChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const deviceId = event.target.value

    setSelectedDeviceId(deviceId)
    cleanupPreview()

    await startCamera(deviceId)
  }

  const captureDocument = () => {
    const video = videoRef.current

    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setErrorMessage('המצלמה עדיין לא מוכנה לצילום.')
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      setErrorMessage('לא ניתן לקבל את גודל התמונה מהמצלמה.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')

    if (!context) {
      setErrorMessage('לא ניתן ליצור את תמונת הסריקה.')
      return
    }

    context.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMessage('יצירת תמונת הסריקה נכשלה.')
          return
        }

        if (blob.size > MAX_FILE_SIZE) {
          setErrorMessage(
            'התמונה שצולמה גדולה מ־5MB. נסה לצלם שוב או להשתמש בהעלאת קובץ.',
          )
          return
        }

        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')

        const file = new File(
          [blob],
          `referral-scan-${timestamp}.jpg`,
          {
            type: 'image/jpeg',
            lastModified: Date.now(),
          },
        )

        const objectUrl = URL.createObjectURL(blob)

        setPreviewUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl)
          }

          return objectUrl
        })

        setCapturedFile(file)
        setErrorMessage(null)
        setState('captured')

        cleanupStream()
      },
      'image/jpeg',
      0.92,
    )
  }

  const retake = async () => {
    cleanupPreview()
    setErrorMessage(null)

    await startCamera(selectedDeviceId || undefined)
  }

  const acceptCapture = () => {
    if (!capturedFile) return

    const file = capturedFile

    cleanupStream()

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl(null)
    setCapturedFile(null)

    onCapture(file)
    onClose()
  }

  const handleClose = () => {
    cleanupStream()
    cleanupPreview()
    setErrorMessage(null)
    onClose()
  }

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="סריקת הפניה"
    >
      <div
        className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              סריקת הפניה
            </h2>
            <p className="text-sm text-slate-500">
              מקם את ההפניה מתחת לסורק וצלם אותה
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {devices.length > 1 && state !== 'captured' && (
            <div className="mb-4">
              <label
                htmlFor="document-camera-device"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                מצלמה / סורק
              </label>

              <select
                id="document-camera-device"
                value={selectedDeviceId}
                onChange={(event) => void handleDeviceChange(event)}
                disabled={state === 'starting'}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `מצלמה ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl bg-slate-950 sm:min-h-[480px]">
            {state !== 'captured' && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[65vh] w-full object-contain"
              />
            )}

            {state === 'captured' && previewUrl && (
              <img
                src={previewUrl}
                alt="תצוגה מקדימה של ההפניה שנסרקה"
                className="max-h-[65vh] w-full object-contain"
              />
            )}

            {state === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  מפעיל מצלמה...
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {state === 'ready' && videoRef.current && (
            <p className="mt-2 text-center text-xs text-slate-500">
              רזולוציית מצלמה פעילה:{' '}
              {videoRef.current.videoWidth || '—'} ×{' '}
              {videoRef.current.videoHeight || '—'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            ביטול
          </button>

          <div className="flex flex-wrap gap-2">
            {state === 'error' && (
              <button
                type="button"
                onClick={() => void startCamera(selectedDeviceId || undefined)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                נסה שוב
              </button>
            )}

            {state === 'ready' && (
              <button
                type="button"
                onClick={captureDocument}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
              >
                <Camera className="h-4 w-4" />
                צלם הפניה
              </button>
            )}

            {state === 'captured' && (
              <>
                <button
                  type="button"
                  onClick={() => void retake()}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  צלם מחדש
                </button>

                <button
                  type="button"
                  onClick={acceptCapture}
                  disabled={!capturedFile}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  השתמש בסריקה
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}