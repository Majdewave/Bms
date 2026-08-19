import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Enums, RenderingEngine, StackViewport, init as initCore } from '@cornerstonejs/core'
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'
import { imagingService } from '@/api'
import type { ImagingInstanceDetail } from '@/api/imaging'

interface DicomViewerProps {
  instance: ImagingInstanceDetail | null
  instanceIndex?: number
  totalInstances?: number
}

let cornerstoneReady = false

const getFileManagerIndexFromImageId = (imageId: string): number | null => {
  const match = imageId.match(/:(\d+)$/)
  if (!match) {
    return null
  }

  const index = Number(match[1])
  return Number.isFinite(index) ? index : null
}

const ensureCornerstoneReady = () => {
  if (cornerstoneReady) {
    return
  }

  initCore()
  cornerstoneDICOMImageLoader.init({ maxWebWorkers: 1 })
  cornerstoneReady = true
}

const DicomViewer = ({ instance, instanceIndex = 1, totalInstances = 1 }: DicomViewerProps) => {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)
  const loadedImageIdRef = useRef<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    const cleanupEngine = () => {
      if (loadedImageIdRef.current) {
        const fileIndex = getFileManagerIndexFromImageId(loadedImageIdRef.current)

        if (fileIndex !== null) {
          cornerstoneDICOMImageLoader.wadouri.fileManager.remove(fileIndex)
        }

        loadedImageIdRef.current = null
      }

      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy()
        renderingEngineRef.current = null
      }
    }

    const loadInstance = async () => {
      if (!instance) {
        setStatus('unavailable')
        setErrorMessage('')
        cleanupEngine()
        return
      }

      if (instance.StorageStatus !== 'LocalAndS3') {
        setStatus('unavailable')
        setErrorMessage('')
        cleanupEngine()
        return
      }

      try {
        setStatus('loading')
        setErrorMessage('')
        ensureCornerstoneReady()
        cleanupEngine()

        const blob = await imagingService.getInstanceFileBlob(instance.id)

        if (cancelled) {
          return
        }

        const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(blob)
        loadedImageIdRef.current = imageId

        if (!containerRef.current) {
          setStatus('error')
          setErrorMessage(t('imaging.unableToLoadImage'))
          cleanupEngine()
          return
        }

        const renderingEngine = new RenderingEngine(`dicom-viewer-${instance.id}`)
        renderingEngineRef.current = renderingEngine

        renderingEngine.enableElement({
          element: containerRef.current,
          viewportId: 'dicom-viewport',
          type: Enums.ViewportType.STACK,
        })

        const viewport = renderingEngine.getViewport('dicom-viewport') as StackViewport
        await viewport.setStack([imageId])
        viewport.setProperties({
          voiRange: undefined,
          interpolationType: 'nearest',
        })
        viewport.resetCamera()
        renderingEngine.render()

        if (!cancelled) {
          setStatus('ready')
        }
      } catch (error) {
        console.error('Unable to load DICOM image', error)
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(t('imaging.unableToLoadImage'))
        }
      }
    }

    void loadInstance()

    return () => {
      cancelled = true
      cleanupEngine()
    }
  }, [instance, t])

  const handleZoomIn = () => {
    const viewport = renderingEngineRef.current?.getViewport('dicom-viewport') as StackViewport | undefined
    if (!viewport) {
      return
    }

    const nextZoom = (viewport.getZoom() || 1) * 1.25
    viewport.setZoom(nextZoom)
    renderingEngineRef.current?.render()
  }

  const handleZoomOut = () => {
    const viewport = renderingEngineRef.current?.getViewport('dicom-viewport') as StackViewport | undefined
    if (!viewport) {
      return
    }

    const nextZoom = (viewport.getZoom() || 1) / 1.25
    viewport.setZoom(nextZoom)
    renderingEngineRef.current?.render()
  }

  const handlePanReset = () => {
    const viewport = renderingEngineRef.current?.getViewport('dicom-viewport') as StackViewport | undefined
    if (!viewport) {
      return
    }

    viewport.resetCamera()
    renderingEngineRef.current?.render()
  }

  if (!instance) {
    return null
  }

  if (status === 'unavailable') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {t('imaging.imageUnavailable')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-sm text-slate-600">
          {t('imaging.imageXOfY', { current: instanceIndex, total: totalInstances })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
          >
            {t('imaging.zoomOut')}
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
          >
            {t('imaging.zoomIn')}
          </button>
          <button
            type="button"
            onClick={handlePanReset}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
          >
            {t('imaging.reset')}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-black"
        style={{
          width: '100%',
          maxHeight: '70vh',
        }}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 text-sm text-slate-600">
            {t('imaging.loadingImage')}
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50/90 p-4 text-center text-sm text-red-700">
            {errorMessage || t('imaging.unableToLoadImage')}
          </div>
        )}
      </div>
    </div>
  )
}

export default DicomViewer
