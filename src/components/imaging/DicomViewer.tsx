import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { imagingService } from '@/api'
import type { ImagingInstanceDetail } from '@/api/imaging'

let cornerstoneCoreModule: any = null
let cornerstoneLoaderModule: any = null
let cornerstoneReady = false

const ensureCornerstoneReady = async () => {
  if (cornerstoneReady) {
    console.log('[DicomViewer] 02 using cached cornerstone modules')
    return {
      core: cornerstoneCoreModule,
      loader: cornerstoneLoaderModule,
    }
  }

  try {
    console.log('[DicomViewer] 02 importing cornerstone core')
    const coreModule = await import('@cornerstonejs/core')
    console.log('[DicomViewer] 03 cornerstone core imported', {
      hasInit: typeof coreModule.init,
      hasRenderingEngine: typeof coreModule.RenderingEngine,
      hasEnums: !!coreModule.Enums,
      keys: Object.keys(coreModule).slice(0, 20),
    })

    console.log('[DicomViewer] 04 calling core.init')
    if (typeof coreModule.init === 'function') {
      await coreModule.init()
    }
    console.log('[DicomViewer] 05 core.init completed')

    console.log('[DicomViewer] 06 importing dicom-image-loader')
    const loaderModule = await import('@cornerstonejs/dicom-image-loader')
    const loaderExport = loaderModule && typeof loaderModule.default !== 'undefined' ? loaderModule.default : loaderModule
    console.log('[DicomViewer] 07 dicom-image-loader imported', {
      hasDefault: !!loaderModule.default,
      keys: Object.keys(loaderModule).slice(0, 20),
      loaderType: typeof loaderExport,
      hasInit: typeof loaderExport?.init,
      hasWadouri: !!loaderExport?.wadouri,
      hasWadors: !!loaderExport?.wadors,
    })

    console.log('[DicomViewer] 08 calling dicom loader init')
    if (typeof loaderExport.init === 'function') {
      await loaderExport.init({ maxWebWorkers: 1 })
    }
    console.log('[DicomViewer] 09 dicom loader init completed')

    cornerstoneCoreModule = coreModule
    cornerstoneLoaderModule = loaderExport
    cornerstoneReady = true

    return {
      core: coreModule,
      loader: loaderExport,
    }
  } catch (error) {
    console.error('[DicomViewer] FAILED AT STAGE: cornerstone import/init', error)
    throw error
  }
}

interface DicomViewerProps {
  instances: ImagingInstanceDetail[]
  currentIndex?: number
  onCurrentIndexChange?: (nextIndex: number) => void
}

const getFileManagerIndexFromImageId = (imageId: string): number | null => {
  const match = imageId.match(/:(\d+)$/)
  if (!match) {
    return null
  }

  const index = Number(match[1])
  return Number.isFinite(index) ? index : null
}

const DicomViewer = ({ instances, currentIndex = 0, onCurrentIndexChange }: DicomViewerProps) => {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const renderingEngineRef = useRef<any>(null)
  const viewportRef = useRef<any>(null)
  const activeFileManagerIndexRef = useRef<number | null>(null)
  const viewportReadyRef = useRef<Promise<any> | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const instance = instances[currentIndex] ?? instances[0] ?? null
  const instanceIndex = currentIndex + 1
  const totalInstances = instances.length || 1

  const removeActiveFileManagerEntry = () => {
    if (activeFileManagerIndexRef.current === null || !cornerstoneLoaderModule) {
      return
    }

    cornerstoneLoaderModule.wadouri.fileManager.remove(activeFileManagerIndexRef.current)
    activeFileManagerIndexRef.current = null
  }

  const ensureViewportReady = async () => {
    if (viewportRef.current && renderingEngineRef.current) {
      return viewportRef.current
    }

    if (!viewportReadyRef.current) {
      viewportReadyRef.current = (async () => {
        const { core } = await ensureCornerstoneReady()

        if (!containerRef.current) {
          throw new Error('DICOM viewport container is unavailable')
        }

        console.log('[DicomViewer] creating RenderingEngine')
        const renderingEngine = new core.RenderingEngine('dicom-viewer')
        renderingEngine.enableElement({
          element: containerRef.current,
          viewportId: 'dicom-viewport',
          type: core.Enums.ViewportType.STACK,
        })

        const viewport = renderingEngine.getViewport('dicom-viewport')
        renderingEngineRef.current = renderingEngine
        viewportRef.current = viewport
        console.log('[DicomViewer] viewport created')
        return viewport
      })()
    }

    return viewportReadyRef.current
  }

  useEffect(() => {
    return () => {
      removeActiveFileManagerEntry()
      renderingEngineRef.current?.destroy()
      renderingEngineRef.current = null
      viewportRef.current = null
      viewportReadyRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadInstance = async () => {
      console.log('[DicomViewer] 01 viewer started', { instanceId: instance?.id, storageStatus: instance?.storageStatus })

      if (!instance) {
        console.log('[DicomViewer] unavailable: no instance')
        setStatus('unavailable')
        setErrorMessage('')
        return
      }

      if (instance.storageStatus !== 'LocalAndS3') {
        console.log('[DicomViewer] unavailable: storageStatus not LocalAndS3', instance.storageStatus)
        setStatus('unavailable')
        setErrorMessage('')
        return
      }

      try {
        setStatus('loading')
        setErrorMessage('')
        const { loader } = await ensureCornerstoneReady()
        const viewport = await ensureViewportReady()

        if (cancelled) {
          return
        }

        console.log('[DicomViewer] loading instance', {
          index: instanceIndex,
          total: totalInstances,
          instanceId: instance.id,
          sopInstanceUID: instance.sopInstanceUID,
          storageStatus: instance.storageStatus,
        })
        removeActiveFileManagerEntry()
        const blob = await imagingService.getInstanceFileBlob(instance.id)
        console.log('[DicomViewer] blob received', {
          index: instanceIndex,
          size: blob.size,
          type: blob.type,
        })

        if (cancelled) {
          return
        }

        const imageId = loader.wadouri.fileManager.add(blob)
        const fileIndex = getFileManagerIndexFromImageId(imageId)
        activeFileManagerIndexRef.current = fileIndex
        console.log('[DicomViewer] imageId', imageId)
        console.log('[DicomViewer] setStack started')
        await viewport.setStack([imageId])
        console.log('[DicomViewer] setStack completed')
        viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true })
        console.log('[DicomViewer] camera reset')
        renderingEngineRef.current?.render()
        console.log('[DicomViewer] render completed')

        if (!cancelled) {
          setStatus('ready')
        }
      } catch (error) {
        console.error('[DicomViewer] FAILED AT STAGE: runtime initialization/render', error)
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(t('imaging.unableToLoadImage'))
        }
      }
    }

    void loadInstance()

    return () => {
      cancelled = true
    }
  }, [instance, instanceIndex, t, totalInstances])

  const handlePrevious = () => {
    if (!onCurrentIndexChange || currentIndex <= 0) {
      return
    }

    console.log('[DicomViewer] previous image', currentIndex - 1)
    onCurrentIndexChange(currentIndex - 1)
  }

  const handleNext = () => {
    if (!onCurrentIndexChange || currentIndex >= instances.length - 1) {
      return
    }

    console.log('[DicomViewer] next image', currentIndex + 1)
    onCurrentIndexChange(currentIndex + 1)
  }

  const handleZoomIn = () => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const nextZoom = Math.min((viewport.getZoom() || 1) * 1.2, 20)
    console.log('[DicomViewer] zoom in', { from: viewport.getZoom(), to: nextZoom })
    viewport.setZoom(nextZoom)
    renderingEngineRef.current?.render()
  }

  const handleZoomOut = () => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const nextZoom = Math.max((viewport.getZoom() || 1) / 1.2, 0.05)
    console.log('[DicomViewer] zoom out', { from: viewport.getZoom(), to: nextZoom })
    viewport.setZoom(nextZoom)
    renderingEngineRef.current?.render()
  }

  const handlePanReset = () => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    console.log('[DicomViewer] reset view')
    viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true })
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
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!onCurrentIndexChange || currentIndex <= 0}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('imaging.previous')}
          </button>
          <span>{t('imaging.imageXOfY', { current: instanceIndex, total: totalInstances })}</span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!onCurrentIndexChange || currentIndex >= instances.length - 1}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('imaging.next')}
          </button>
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
        className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-black sm:h-[520px] lg:h-[600px]"
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
