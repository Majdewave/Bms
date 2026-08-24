import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Expand, FlipHorizontal2, FlipVertical2, Maximize, Minimize, Minus, Move, Plus, Redo2, RefreshCw, RotateCcw, RotateCw, Square, SunMedium, Trash2, Undo2 } from 'lucide-react'
import { imagingService } from '@/api'
import type { ImagingInstanceDetail, ImagingSeriesDetail, ImagingStudyHierarchy } from '@/api/imaging'

let cornerstoneCoreModule: any = null
let cornerstoneLoaderModule: any = null
let cornerstoneToolsModule: any = null
let cornerstoneReady = false
let cornerstoneToolsInitialized = false
let cornerstoneToolsRegistered = false
let cornerstoneReadyPromise: Promise<{ core: any; loader: any; tools: any }> | null = null

const optionalToolNames = [
  'LengthTool',
  'BidirectionalTool',
  'AngleTool',
  'ProbeTool',
  'EllipticalROITool',
  'RectangleROITool',
  'ArrowAnnotateTool',
] as const

const ensureCornerstoneReady = () => {
  if (cornerstoneReady) {
    return Promise.resolve({
      core: cornerstoneCoreModule,
      loader: cornerstoneLoaderModule,
      tools: cornerstoneToolsModule,
    })
  }

  if (cornerstoneReadyPromise) {
    return cornerstoneReadyPromise
  }

  cornerstoneReadyPromise = (async () => {
    console.log('[DicomViewer] BUILD MARKER 2026-08-24-ROTATE-FIX-01')
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

    cornerstoneToolsModule = await import('@cornerstonejs/tools')

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

    if (!cornerstoneToolsInitialized) {
      cornerstoneToolsModule.init()
      cornerstoneToolsInitialized = true
    }

    const toolClasses = [
      cornerstoneToolsModule.WindowLevelTool,
      cornerstoneToolsModule.PanTool,
      cornerstoneToolsModule.ZoomTool,
      cornerstoneToolsModule.StackScrollTool,
      ...optionalToolNames.map((name) => cornerstoneToolsModule[name]).filter(Boolean),
    ]

    if (!cornerstoneToolsRegistered) {
      toolClasses.forEach((toolClass) => cornerstoneToolsModule.addTool(toolClass))
      cornerstoneToolsRegistered = true
    }

    console.log('[DicomViewer] cornerstone tools ready', {
      hasWindowLevelTool: typeof cornerstoneToolsModule.WindowLevelTool === 'function',
      hasPanTool: typeof cornerstoneToolsModule.PanTool === 'function',
      hasZoomTool: typeof cornerstoneToolsModule.ZoomTool === 'function',
      hasStackScrollTool: typeof cornerstoneToolsModule.StackScrollTool === 'function',
      optionalTools: optionalToolNames.reduce<Record<string, boolean>>((available, name) => {
        available[name] = typeof cornerstoneToolsModule[name] === 'function'
        return available
      }, {}),
    })

    cornerstoneCoreModule = coreModule
    cornerstoneLoaderModule = loaderExport
    cornerstoneReady = true

    return {
      core: coreModule,
      loader: loaderExport,
      tools: cornerstoneToolsModule,
    }
  })().catch((error) => {
    cornerstoneReadyPromise = null
    console.error('[DicomViewer] FAILED AT STAGE: cornerstone import/init', error)
    throw error
  })

  return cornerstoneReadyPromise
}

interface DicomViewerProps {
  instances: ImagingInstanceDetail[]
  currentIndex?: number
  onCurrentIndexChange?: (nextIndex: number) => void
  study?: ImagingStudyHierarchy | null
  series?: ImagingSeriesDetail[]
  selectedSeriesIndex?: number
  onSeriesChange?: (nextIndex: number) => void
}

const getFileManagerIndexFromImageId = (imageId: string): number | null => {
  const match = imageId.match(/:(\d+)$/)
  if (!match) {
    return null
  }

  const index = Number(match[1])
  return Number.isFinite(index) ? index : null
}

const DicomViewer = ({
  instances,
  currentIndex = 0,
  onCurrentIndexChange,
  study,
  series = [],
  selectedSeriesIndex = 0,
  onSeriesChange,
}: DicomViewerProps) => {
  console.log('[DicomViewer] BUILD MARKER 2026-08-24-ROTATE-FIX-01')
  const { t } = useTranslation()
  type ViewportState = {
    seriesIndex: number
    instanceIndex: number
    numberOfFrames: number
    currentFrameIndex: number
    isMultiFrame: boolean
    frameImageIds: string[]
    status: 'loading' | 'ready' | 'error' | 'unavailable'
    errorMessage: string
  }
  const emptyState = (seriesIndex: number, instanceIndex = 0): ViewportState => ({
    seriesIndex, instanceIndex, numberOfFrames: 1, currentFrameIndex: 0,
    isMultiFrame: false, frameImageIds: [], status: 'loading', errorMessage: '',
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const renderingEngineRef = useRef<any>(null)
  const toolGroupRef = useRef<any>(null)
  const imageCacheRef = useRef(new Map<string, { imageId: string; fileIndex: number | null }>())
  const fullscreenRef = useRef<HTMLDivElement | null>(null)
  const viewportElementsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const thumbnailElementsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const viewportGenerationRef = useRef<number[]>([0, 0, 0, 0])
  const cineTimerRef = useRef<number | null>(null)
  const cineViewportRef = useRef<number | null>(null)
  const annotationHistoryRef = useRef<any[][]>([])
  const annotationFutureRef = useRef<any[][]>([])
  const historyApplyingRef = useRef(false)
  const annotationEventsCleanupRef = useRef<(() => void) | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTool, setActiveTool] = useState('WindowLevel')
  const [cineFps, setCineFps] = useState(15)
  const [cinePlaying, setCinePlaying] = useState(false)
  const [layout, setLayout] = useState<'1x1' | '1x2' | '2x2'>('1x1')
  const [activeViewportIndex, setActiveViewportIndex] = useState(0)
  const [viewportAssignments, setViewportAssignments] = useState<number[]>([selectedSeriesIndex, selectedSeriesIndex, selectedSeriesIndex, selectedSeriesIndex])
  const [viewportStates, setViewportStates] = useState<ViewportState[]>([
    emptyState(selectedSeriesIndex, currentIndex), emptyState(selectedSeriesIndex), emptyState(selectedSeriesIndex), emptyState(selectedSeriesIndex),
  ])
  const [showMetadata] = useState(true)
  const viewportCount = layout === '1x1' ? 1 : layout === '1x2' ? 2 : 4
  const activeState = viewportStates[activeViewportIndex] ?? emptyState(selectedSeriesIndex)
  const viewportInstanceKey = viewportStates.map((state) => state.instanceIndex).join('|')
  const instance = instances[currentIndex] ?? instances[0] ?? null
  const instanceIdsKey = instances.map(({ id }) => id).join('|')
  const numberOfFrames = activeState.numberOfFrames
  const currentFrameIndex = activeState.currentFrameIndex
  const isMultiFrame = activeState.isMultiFrame
  const instanceIndex = activeState.instanceIndex + 1
  const activeInstances = (series[activeState.seriesIndex]?.instances ?? instances).filter((item) => item.storageStatus === 'LocalAndS3')
  const totalInstances = activeInstances.length || 1

  const updateState = (index: number, update: Partial<ViewportState>) => setViewportStates((current) => current.map((state, stateIndex) => stateIndex === index ? { ...state, ...update } : state))
  const registerViewportElement = useCallback((id: string, element: HTMLDivElement | null) => {
    if (viewportElementsRef.current[id] === element) return
    viewportElementsRef.current[id] = element
  }, [])
  const registerThumbnailElement = useCallback((id: string, element: HTMLDivElement | null) => {
    if (thumbnailElementsRef.current[id] === element) return
    thumbnailElementsRef.current[id] = element
  }, [])
  const viewportRefCallbacks = useMemo(
    () => Array.from({ length: 4 }, (_, index) => (element: HTMLDivElement | null) => {
      const id = viewportId(index)
      registerViewportElement(id, element)
      if (index === 0) {
        containerRef.current = element
      }
    }),
    [registerViewportElement]
  )
  const stopCine = () => {
    if (cineTimerRef.current !== null) window.clearInterval(cineTimerRef.current)
    cineTimerRef.current = null
    cineViewportRef.current = null
    setCinePlaying(false)
  }
  const viewportId = (index: number) => index === 0 ? 'dicom-viewport' : `dicom-viewport-${index}`
  const detectFrameCount = (loader: any, imageId: string) => {
    try {
      const parsed = loader.parseImageId(imageId)
      const count = Number(loader.dataSetCacheManager.get(parsed.url)?.intString?.('x00280008'))
      return Number.isInteger(count) && count > 1 ? count : 1
    } catch { return 1 }
  }
  const loadImageIds = async (loader: any, targetInstances: ImagingInstanceDetail[]) => {
    const imageIds: string[] = []
    for (const target of targetInstances) {
      const cached = imageCacheRef.current.get(target.id)
      if (cached) { imageIds.push(cached.imageId); continue }
      const imageId = loader.wadouri.fileManager.add(await imagingService.getInstanceFileBlob(target.id))
      imageCacheRef.current.set(target.id, { imageId, fileIndex: getFileManagerIndexFromImageId(imageId) })
      imageIds.push(imageId)
    }
    return imageIds
  }
  const removeCachedFileManagerEntries = () => {
    imageCacheRef.current.forEach(({ fileIndex }) => { if (fileIndex !== null) cornerstoneLoaderModule?.wadouri.fileManager.remove(fileIndex) })
    imageCacheRef.current.clear()
  }
  const ensureEngine = async () => {
    const { core, tools } = await ensureCornerstoneReady()
    console.log('[DicomViewer] B cornerstone initialized')
    if (!renderingEngineRef.current) {
      renderingEngineRef.current = new core.RenderingEngine('dicom-viewer')
      console.log('[DicomViewer] D rendering engine ready')
      const toolGroup = tools.ToolGroupManager.createToolGroup('dicom-viewer-tools')
      if (!toolGroup) throw new Error('Unable to create DICOM viewer ToolGroup')
      const toolClasses = [tools.WindowLevelTool, tools.PanTool, tools.ZoomTool, tools.StackScrollTool, ...optionalToolNames.map((name) => tools[name]).filter(Boolean)]
      toolClasses.forEach((toolClass: any) => toolGroup.addTool(toolClass.toolName))
      toolGroup.setToolActive(tools.WindowLevelTool.toolName, { bindings: [{ mouseButton: tools.Enums.MouseBindings.Primary }] })
      toolGroup.setToolActive(tools.PanTool.toolName, { bindings: [{ mouseButton: tools.Enums.MouseBindings.Auxiliary }] })
      toolGroup.setToolPassive(tools.StackScrollTool.toolName, { removeAllBindings: true })
      toolGroupRef.current = toolGroup
      console.log('[DicomViewer] F primary ToolGroup registered')
      const annotationEvents = [tools.Enums.Events.ANNOTATION_COMPLETED, tools.Enums.Events.ANNOTATION_MODIFIED]
      const recordAnnotationChange = () => {
        if (historyApplyingRef.current || !cornerstoneToolsModule.annotation?.state) return
        annotationHistoryRef.current.push(cloneAnnotations(cornerstoneToolsModule.annotation.state.getAllAnnotations()))
        annotationFutureRef.current = []
      }
      annotationEvents.forEach((eventName: string) => core.eventTarget?.addEventListener(eventName, recordAnnotationChange))
      annotationEventsCleanupRef.current = () => annotationEvents.forEach((eventName: string) => core.eventTarget?.removeEventListener(eventName, recordAnnotationChange))
    }
    return { core, tools }
  }
  const enableVisibleViewports = async () => {
    const { core } = await ensureEngine()
    const engine = renderingEngineRef.current
    console.log('[DicomViewer] C primary DOM element available', {
      exists: !!containerRef.current,
      connected: !!containerRef.current?.isConnected,
    })
    for (let index = 0; index < 4; index += 1) {
      const id = viewportId(index)
      if (index < viewportCount) {
        const element = viewportElementsRef.current[id]
        if (element && !engine.getViewport(id)) {
          engine.enableElement({ element, viewportId: id, type: core.Enums.ViewportType.STACK })
          toolGroupRef.current.addViewport(id, engine.id)
          if (index === 0) console.log('[DicomViewer] E primary viewport enabled')
        }
      } else if (engine.getViewport(id)) {
        toolGroupRef.current.removeViewports(engine.id, id)
        engine.disableElement(id)
      }
    }
    engine.render()
  }

  useEffect(() => () => {
    stopCine()
    for (let index = 0; index < 4; index += 1) {
      viewportGenerationRef.current[index] += 1
      try { renderingEngineRef.current?.disableElement(viewportId(index)) } catch { /* already disabled */ }
    }
    annotationEventsCleanupRef.current?.()
    annotationEventsCleanupRef.current = null
    if (toolGroupRef.current) cornerstoneToolsModule?.ToolGroupManager.destroyToolGroup(toolGroupRef.current.id)
    removeCachedFileManagerEntries()
    renderingEngineRef.current?.destroy()
    renderingEngineRef.current = null
    toolGroupRef.current = null
  }, [])

  useEffect(() => {
    const resize = () => {
      Object.keys(viewportElementsRef.current).forEach((id) => renderingEngineRef.current?.getViewport(id)?.resize())
      renderingEngineRef.current?.render()
    }
    const handleFullscreenChange = () => { setIsFullscreen(document.fullscreenElement === fullscreenRef.current); resize() }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    const observer = fullscreenRef.current && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    if (fullscreenRef.current) observer?.observe(fullscreenRef.current)
    return () => { observer?.disconnect(); document.removeEventListener('fullscreenchange', handleFullscreenChange) }
  }, [])

  useEffect(() => { setViewportAssignments((current) => [selectedSeriesIndex, current[1] ?? selectedSeriesIndex, current[2] ?? selectedSeriesIndex, current[3] ?? selectedSeriesIndex]) }, [selectedSeriesIndex])

  useEffect(() => {
    stopCine()
    void enableVisibleViewports().catch((error) => console.warn('[DicomViewer] viewport layout failed', error))
  }, [layout, viewportCount])

  useEffect(() => {
    let cancelled = false
    const loadViewports = async () => {
      let loadingIndex = activeViewportIndex
      try {
        console.log('[DicomViewer] A init effect entered')
        const { loader } = await ensureCornerstoneReady()
        await enableVisibleViewports()
        console.log('[DicomViewer] G starting primary DICOM load')
        for (let index = 0; index < viewportCount; index += 1) {
          loadingIndex = index
          const generation = ++viewportGenerationRef.current[index]
          const assignedSeries = series[viewportAssignments[index] ?? selectedSeriesIndex]
          const targetInstances = index === 0 && !assignedSeries
            ? instances
            : assignedSeries?.instances.filter((item) => item.storageStatus === 'LocalAndS3') ?? []
          const targetIndex = index === 0 && !assignedSeries ? currentIndex : viewportStates[index]?.instanceIndex ?? 0
          if (!targetInstances.length || targetInstances.some((item) => item.storageStatus !== 'LocalAndS3')) {
            updateState(index, { status: 'unavailable', errorMessage: '' })
            continue
          }
          updateState(index, { seriesIndex: viewportAssignments[index] ?? selectedSeriesIndex, status: 'loading', errorMessage: '', instanceIndex: Math.min(targetIndex, targetInstances.length - 1), currentFrameIndex: 0, numberOfFrames: 1, isMultiFrame: false, frameImageIds: [] })
          const imageIds = await loadImageIds(loader, targetInstances)
          if (index === 0) console.log('[DicomViewer] H primary DICOM blobs received')
          if (cancelled || generation !== viewportGenerationRef.current[index]) continue
          const selectedImageId = imageIds[Math.min(targetIndex, imageIds.length - 1)] ?? imageIds[0]
          if (index === 0) console.log('[DicomViewer] I primary imageId created')
          const frameCount = detectFrameCount(loader, selectedImageId)
          const frameImageIds = frameCount > 1 ? Array.from({ length: frameCount }, (_, frame) => `${selectedImageId}&frame=${frame + 1}`) : []
          const displayIds = frameImageIds.length ? frameImageIds : imageIds
          const viewport = renderingEngineRef.current?.getViewport(viewportId(index))
          if (!viewport) continue
          if (index === 0) console.log('[DicomViewer] J setStack starting')
          await viewport.setStack(displayIds, frameImageIds.length ? 0 : Math.min(targetIndex, displayIds.length - 1))
          if (index === 0) console.log('[DicomViewer] K setStack completed')
          if (cancelled || generation !== viewportGenerationRef.current[index]) continue
          viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true })
          updateState(index, { status: 'ready', numberOfFrames: frameCount, isMultiFrame: frameCount > 1, frameImageIds, currentFrameIndex: 0 })
          if (index === 0) onCurrentIndexChange?.(Math.min(targetIndex, targetInstances.length - 1))
        }
        renderingEngineRef.current?.render()
        console.log('[DicomViewer] L render completed')
      } catch (error) {
        console.warn('[DicomViewer] viewport load failed', error)
        if (!cancelled) updateState(loadingIndex, { status: 'error', errorMessage: t('imaging.unableToLoadImage') })
        stopCine()
      }
    }
    void loadViewports()
    return () => { cancelled = true; stopCine(); console.log('[DicomViewer] CLEANUP viewport load effect') }
  }, [instanceIdsKey, currentIndex, viewportAssignments, viewportInstanceKey, series, layout, viewportCount, t])

  useEffect(() => {
    if (!renderingEngineRef.current || series.length === 0) return
    let cancelled = false
    const loadThumbnails = async () => {
      try {
        const { core, loader } = await ensureCornerstoneReady()
        for (const targetSeries of series) {
          const element = thumbnailElementsRef.current[`thumbnail-${targetSeries.id}`]
          const target = targetSeries.instances.find((item) => item.storageStatus === 'LocalAndS3')
          const id = `thumbnail-${targetSeries.id}`
          if (!element || !target || renderingEngineRef.current.getViewport(id)) continue
          const [imageId] = await loadImageIds(loader, [target])
          if (cancelled) return
          renderingEngineRef.current.enableElement({ element, viewportId: id, type: core.Enums.ViewportType.STACK })
          const viewport = renderingEngineRef.current.getViewport(id)
          await viewport.setStack([imageId], 0)
          viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true })
        }
        renderingEngineRef.current.render()
      } catch (error) { console.warn('[DicomViewer] optional series thumbnail failed', error) }
    }
    void loadThumbnails()
    return () => { cancelled = true }
  }, [series])

  useEffect(() => {
    if (!cinePlaying || cineViewportRef.current === null) return
    const index = cineViewportRef.current
    cineTimerRef.current = window.setInterval(() => {
      setViewportStates((current) => current.map((state, stateIndex) => stateIndex === index ? { ...state, currentFrameIndex: (state.currentFrameIndex + 1) % state.numberOfFrames } : state))
    }, 1000 / cineFps)
    return () => { if (cineTimerRef.current !== null) window.clearInterval(cineTimerRef.current); cineTimerRef.current = null }
  }, [cinePlaying, cineFps])

  useEffect(() => {
    const state = viewportStates[activeViewportIndex]
    const viewport = renderingEngineRef.current?.getViewport(viewportId(activeViewportIndex))
    if (!viewport || state?.status !== 'ready') return
    void viewport.setImageIdIndex(state.isMultiFrame ? state.currentFrameIndex : state.instanceIndex)
  }, [activeViewportIndex, viewportStates])

  const activateTool = (toolName: string) => {
    const toolGroup = toolGroupRef.current
    if (!toolGroup) {
      return
    }

    const { MouseBindings } = cornerstoneToolsModule.Enums
    if (activeTool !== toolName) {
      toolGroup.setToolPassive(activeTool, {
        removeAllBindings: [{ mouseButton: MouseBindings.Primary }],
      })
    }
    toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton: MouseBindings.Primary }],
    })
    setActiveTool(toolName)
  }

  const getAnnotationState = () => cornerstoneToolsModule?.annotation?.state

  const cloneAnnotations = (annotations: any[]) => {
    if (typeof structuredClone === 'function') {
      return structuredClone(annotations)
    }

    return JSON.parse(JSON.stringify(annotations))
  }

  const saveAnnotationHistory = () => {
    const annotationState = getAnnotationState()
    if (!annotationState) return

    annotationHistoryRef.current.push(cloneAnnotations(annotationState.getAllAnnotations()))
    if (annotationHistoryRef.current.length > 30) {
      annotationHistoryRef.current.shift()
    }
    annotationFutureRef.current = []
  }

  const restoreAnnotations = (annotations: any[]) => {
    const annotationState = getAnnotationState()
    if (!annotationState) return

    historyApplyingRef.current = true
    try {
      annotationState.removeAllAnnotations()
      annotations.forEach((annotation) => {
        annotationState.addAnnotation(annotation, containerRef.current ?? undefined)
      })
      renderingEngineRef.current?.render()
    } finally {
      historyApplyingRef.current = false
    }
  }

  const handleDeleteAnnotation = () => {
    const selection = cornerstoneToolsModule?.annotation?.selection
    const annotationState = getAnnotationState()
    const selected = selection?.getAnnotationsSelected?.() ?? []
    if (!annotationState || selected.length === 0) return

    saveAnnotationHistory()
    selected.forEach((annotationUID: string) => annotationState.removeAnnotation(annotationUID))
    renderingEngineRef.current?.render()
  }

  const handleClearAnnotations = () => {
    const annotationState = getAnnotationState()
    if (!annotationState || annotationState.getAllAnnotations().length === 0) return

    saveAnnotationHistory()
    annotationState.removeAllAnnotations()
    renderingEngineRef.current?.render()
  }

  const handleUndo = () => {
    const annotationState = getAnnotationState()
    const previous = annotationHistoryRef.current.pop()
    if (!annotationState || !previous) return

    annotationFutureRef.current.push(cloneAnnotations(annotationState.getAllAnnotations()))
    restoreAnnotations(previous)
  }

  const handleRedo = () => {
    const annotationState = getAnnotationState()
    const next = annotationFutureRef.current.pop()
    if (!annotationState || !next) return

    annotationHistoryRef.current.push(cloneAnnotations(annotationState.getAllAnnotations()))
    restoreAnnotations(next)
  }

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await fullscreenRef.current?.requestFullscreen()
  }

  const updateViewport = (update: (viewport: any) => void) => {
    const id = viewportId(activeViewportIndex)
    const engine = renderingEngineRef.current
    const viewport = engine?.getViewport(id)

    console.log('[DicomViewer] COMMAND TARGET', {
      activeViewportIndex,
      viewportId: id,
      hasEngine: !!engine,
      hasViewport: !!viewport,
      viewportType: viewport?.constructor?.name,
    })

    if (!viewport) {
      console.warn('[DicomViewer] COMMAND ABORTED - viewport not found', id)
      return
    }

    update(viewport)
    viewport.render?.()
    engine.render()
  }

  const rotate = (delta: number) => {
    updateViewport((viewport) => {
      const presentation = viewport.getViewPresentation()
      console.log('[DicomViewer] ROTATE BEFORE', { rotation: presentation.rotation })
      const rotation = (((presentation.rotation ?? 0) + delta) % 360 + 360) % 360
      viewport.setViewPresentation({ ...presentation, rotation })
      console.log('[DicomViewer] ROTATE AFTER', { rotation: viewport.getViewPresentation().rotation })
    })
  }

  const flip = (axis: 'horizontal' | 'vertical') => {
    updateViewport((viewport) => {
      const presentation = viewport.getViewPresentation()
      console.log(`[DicomViewer] FLIP ${axis === 'horizontal' ? 'H' : 'V'} BEFORE`, {
        flipHorizontal: presentation.flipHorizontal,
        flipVertical: presentation.flipVertical,
      })
      viewport.setViewPresentation({
        ...presentation,
        flipHorizontal: axis === 'horizontal' ? !presentation.flipHorizontal : presentation.flipHorizontal,
        flipVertical: axis === 'vertical' ? !presentation.flipVertical : presentation.flipVertical,
      })
      console.log(`[DicomViewer] FLIP ${axis === 'horizontal' ? 'H' : 'V'} AFTER`, viewport.getViewPresentation())
    })
  }

  const toggleInvert = () => {
    updateViewport((viewport) => {
      const properties = viewport.getProperties()
      console.log('[DicomViewer] INVERT BEFORE', { invert: properties.invert })
      viewport.setProperties({ ...properties, invert: !properties.invert })
      console.log('[DicomViewer] INVERT AFTER', { invert: viewport.getProperties().invert })
    })
  }

  const resetWindowLevel = () => {
    updateViewport((viewport) => viewport.resetProperties())
  }

  const handleFit = () => {
    updateViewport((viewport) => viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true }))
  }

  const handleActualSize = () => {
    updateViewport((viewport) => viewport.setZoom(1))
  }

  const resetView = () => {
    updateViewport((viewport) => {
      viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true })
      viewport.setCamera({ ...viewport.getCamera(), rotation: 0, flipHorizontal: false, flipVertical: false })
      viewport.resetProperties()
    })
  }

  const handlePrevious = () => {
    if (activeState.instanceIndex <= 0) {
      return
    }
    stopCine()
    const nextIndex = activeState.instanceIndex - 1
    updateState(activeViewportIndex, { instanceIndex: nextIndex, currentFrameIndex: 0 })
    if (activeViewportIndex === 0) onCurrentIndexChange?.(nextIndex)
  }

  const handleNext = () => {
    if (activeState.instanceIndex >= activeInstances.length - 1) {
      return
    }
    stopCine()
    const nextIndex = activeState.instanceIndex + 1
    updateState(activeViewportIndex, { instanceIndex: nextIndex, currentFrameIndex: 0 })
    if (activeViewportIndex === 0) onCurrentIndexChange?.(nextIndex)
  }

  const handlePreviousFrame = () => {
    if (!isMultiFrame || currentFrameIndex <= 0) return
    stopCine()
    updateState(activeViewportIndex, { currentFrameIndex: currentFrameIndex - 1 })
  }

  const handleNextFrame = () => {
    if (!isMultiFrame || currentFrameIndex >= numberOfFrames - 1) return
    stopCine()
    updateState(activeViewportIndex, { currentFrameIndex: currentFrameIndex + 1 })
  }

  const handlePlayCine = () => {
    if (isMultiFrame && numberOfFrames > 1) {
      cineViewportRef.current = activeViewportIndex
      setCinePlaying(true)
    }
  }

  const handlePauseCine = () => {
    stopCine()
  }

  const handleZoomIn = () => {
    const viewport = renderingEngineRef.current?.getViewport(viewportId(activeViewportIndex))
    if (!viewport) {
      return
    }

    const nextZoom = Math.min((viewport.getZoom() || 1) * 1.2, 20)
    console.log('[DicomViewer] zoom in', { from: viewport.getZoom(), to: nextZoom })
    viewport.setZoom(nextZoom)
    renderingEngineRef.current?.render()
  }

  const handleZoomOut = () => {
    const viewport = renderingEngineRef.current?.getViewport(viewportId(activeViewportIndex))
    if (!viewport) {
      return
    }

    const nextZoom = Math.max((viewport.getZoom() || 1) / 1.2, 0.05)
    console.log('[DicomViewer] zoom out', { from: viewport.getZoom(), to: nextZoom })
    viewport.setZoom(nextZoom)
    renderingEngineRef.current?.render()
  }

  const toolButtons = [
    { name: 'WindowLevel', label: t('imaging.windowLevel'), icon: SunMedium },
    { name: 'Pan', label: t('imaging.pan'), icon: Move },
    { name: 'Zoom', label: t('imaging.zoom'), icon: Expand },
    { name: 'Length', label: t('imaging.length'), optional: 'LengthTool', icon: ArrowLeftRight },
    { name: 'Bidirectional', label: t('imaging.bidirectional'), optional: 'BidirectionalTool', icon: ArrowLeftRight },
    { name: 'Angle', label: t('imaging.angle'), optional: 'AngleTool', icon: SunMedium },
    { name: 'Probe', label: t('imaging.probe'), optional: 'ProbeTool', icon: SunMedium },
    { name: 'EllipticalROI', label: t('imaging.ellipse'), optional: 'EllipticalROITool', icon: SunMedium },
    { name: 'RectangleROI', label: t('imaging.rectangle'), optional: 'RectangleROITool', icon: Square },
    { name: 'ArrowAnnotate', label: t('imaging.arrow'), optional: 'ArrowAnnotateTool', icon: ArrowLeftRight },
  ]

  const availableToolButtons = toolButtons.filter((tool) => !tool.optional || cornerstoneToolsModule?.[tool.optional])
  const activeSeriesIndex = viewportAssignments[activeViewportIndex] ?? selectedSeriesIndex
  const gridClass = layout === '1x1' ? 'grid-cols-1' : layout === '1x2' ? 'grid-cols-2' : 'grid-cols-2'
  const changeActiveViewport = (index: number) => {
    if (index !== activeViewportIndex) stopCine()
    setActiveViewportIndex(index)
  }

  if (!instance) {
    return null
  }

  return (
    <div ref={fullscreenRef} className="space-y-3 bg-white p-1">
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

        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="flex shrink-0 items-center overflow-visible rounded-md border border-slate-300 bg-white p-0.5" role="group" aria-label={t('imaging.layout')}>
            {(['1x1', '1x2', '2x2'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLayout(option)}
                aria-pressed={layout === option}
                className={`h-7 min-w-[2.25rem] rounded px-2 text-xs font-medium transition ${
                  layout === option
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {option.replace('x', ':')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 border-r border-slate-300 pr-2 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-2">
            <button type="button" onClick={() => void toggleFullscreen()} title={isFullscreen ? t('imaging.exitFullscreen') : t('imaging.fullscreen')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              <span>{isFullscreen ? t('imaging.exitFullscreen') : t('imaging.fullscreen')}</span>
            </button>
            <button type="button" onClick={resetView} title={t('imaging.reset')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"><RefreshCw size={15} /><span>{t('imaging.reset')}</span></button>
          </div>

          <div className="flex items-center gap-1 border-r border-slate-300 pr-2 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-2">
            <button type="button" onClick={handlePrevious} disabled={activeState.instanceIndex <= 0} title={t('imaging.previous')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={15} /></button>
            <span className="min-w-[72px] text-center text-xs text-slate-600">{t('imaging.imageXOfY', { current: instanceIndex, total: totalInstances })}</span>
            <button type="button" onClick={handleNext} disabled={activeState.instanceIndex >= activeInstances.length - 1} title={t('imaging.next')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={15} /></button>
          </div>

          <div className="flex items-center gap-1 border-r border-slate-300 pr-2 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-2">
            <button type="button" onClick={handleZoomOut} title={t('imaging.zoomOut')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><Minus size={15} /></button>
            <button type="button" onClick={handleZoomIn} title={t('imaging.zoomIn')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><Plus size={15} /></button>
            <button type="button" onClick={handleFit} title={t('imaging.fit')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><Expand size={15} /></button>
            <button type="button" onClick={handleActualSize} title={t('imaging.actualSize')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><span className="text-[11px] font-semibold">1:1</span></button>
          </div>

          <div className="flex items-center gap-1 border-r border-slate-300 pr-2 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-2">
            <button type="button" onClick={() => { console.log('[DicomViewer] CLICK ROTATE LEFT'); rotate(-90) }} title={t('imaging.rotateLeft')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><RotateCcw size={15} /></button>
            <button type="button" onClick={() => { console.log('[DicomViewer] CLICK ROTATE RIGHT'); rotate(90) }} title={t('imaging.rotateRight')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><RotateCw size={15} /></button>
            <button type="button" onClick={() => { console.log('[DicomViewer] CLICK FLIP HORIZONTAL'); flip('horizontal') }} title={t('imaging.flipHorizontal')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><FlipHorizontal2 size={15} /></button>
            <button type="button" onClick={() => { console.log('[DicomViewer] CLICK FLIP VERTICAL'); flip('vertical') }} title={t('imaging.flipVertical')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><FlipVertical2 size={15} /></button>
            <button type="button" onClick={() => { console.log('[DicomViewer] CLICK INVERT'); toggleInvert() }} title={t('imaging.invert')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><SunMedium size={15} /></button>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-r border-slate-300 pr-2 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-2">
            {availableToolButtons.map((tool) => {
              const Icon = tool.icon
              return <button key={tool.name} type="button" onClick={() => activateTool(tool.name)} aria-pressed={activeTool === tool.name} title={tool.label} className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium ${activeTool === tool.name ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}><Icon size={14} /><span>{tool.label}</span></button>
            })}
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={handleUndo} title={t('imaging.undo')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><Undo2 size={15} /></button>
            <button type="button" onClick={handleRedo} title={t('imaging.redo')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><Redo2 size={15} /></button>
            <button type="button" onClick={handleDeleteAnnotation} title={t('imaging.deleteAnnotation')} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50"><Trash2 size={15} /></button>
            <button type="button" onClick={handleClearAnnotations} title={t('imaging.clearMeasurements')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-2 text-xs font-medium text-red-700 hover:bg-red-50"><Trash2 size={14} /><span>{t('imaging.clearMeasurements')}</span></button>
            <button type="button" onClick={resetWindowLevel} title={t('imaging.resetWindowLevel')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"><RefreshCw size={14} /><span>{t('imaging.resetWindowLevel')}</span></button>
          </div>
        </div>
      </div>

      {isMultiFrame && numberOfFrames > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-medium">{t('imaging.cine')}</span>
          <button type="button" onClick={handlePreviousFrame} disabled={currentFrameIndex === 0} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-50">{t('imaging.previousFrame')}</button>
          {cinePlaying ? (
            <button type="button" onClick={handlePauseCine} className="rounded-lg border border-violet-600 bg-violet-600 px-2.5 py-1.5 text-white">{t('imaging.pause')}</button>
          ) : (
            <button type="button" onClick={handlePlayCine} className="rounded-lg border border-violet-600 bg-violet-600 px-2.5 py-1.5 text-white">{t('imaging.play')}</button>
          )}
          <button type="button" onClick={handleNextFrame} disabled={currentFrameIndex >= numberOfFrames - 1} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-50">{t('imaging.nextFrame')}</button>
          <span>{t('imaging.frameXOfY', { current: currentFrameIndex + 1, total: numberOfFrames })}</span>
          <label className="flex items-center gap-1">
            <span>{t('imaging.fps')}</span>
            <select value={cineFps} onChange={(event) => setCineFps(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
              {[5, 10, 15, 20, 25, 30].map((fps) => <option key={fps} value={fps}>{fps}</option>)}
            </select>
          </label>
          <input type="range" min="0" max={numberOfFrames - 1} value={currentFrameIndex} onChange={(event) => { stopCine(); updateState(activeViewportIndex, { currentFrameIndex: Number(event.target.value) }) }} aria-label={t('imaging.frame')} className="min-w-[160px] flex-1" />
        </div>
      )}

      {series.length > 0 && (
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
          {series.map((targetSeries, index) => (
            <button
              key={targetSeries.id}
              type="button"
              onClick={() => {
                stopCine()
                viewportGenerationRef.current[activeViewportIndex] += 1
                setViewportAssignments((current) => current.map((value, viewportIndex) => viewportIndex === activeViewportIndex ? index : value))
                if (activeViewportIndex === 0) onSeriesChange?.(index)
              }}
              aria-pressed={activeSeriesIndex === index}
              className={`flex min-w-[112px] items-center gap-2 rounded-lg border p-1.5 text-left ${selectedSeriesIndex === index ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}
            >
              <div
                ref={(element) => registerThumbnailElement(`thumbnail-${targetSeries.id}`, element)}
                className="h-14 w-14 shrink-0 overflow-hidden rounded bg-black"
                aria-label={t('imaging.seriesX', { number: targetSeries.seriesNumber ?? index + 1 })}
              />
              <span className="text-xs text-slate-700">{targetSeries.seriesDescription || t('imaging.seriesX', { number: index + 1 })}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className={`grid ${gridClass} gap-1 overflow-hidden rounded-xl border border-slate-200 bg-black`}
        style={{
          width: '100%',
          maxHeight: '70vh',
        }}
      >
        {Array.from({ length: viewportCount }, (_, index) => (
          <div
            key={index}
            ref={viewportRefCallbacks[index]}
            onClick={() => changeActiveViewport(index)}
            className={`relative h-[420px] overflow-hidden bg-black sm:h-[520px] lg:h-[600px] ${activeViewportIndex === index ? 'ring-2 ring-violet-500 ring-inset' : ''}`}
          >
            {showMetadata && (
              <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[90%] rounded bg-black/65 px-2 py-1 text-xs text-white">
                <div>{study?.accessionNumber || t('imaging.study')}</div>
                <div>{series[viewportStates[index]?.seriesIndex ?? viewportAssignments[index] ?? 0]?.seriesDescription || t('imaging.seriesX', { number: (viewportStates[index]?.seriesIndex ?? viewportAssignments[index] ?? 0) + 1 })}</div>
                <div>{t('imaging.instance')} {(viewportStates[index]?.instanceIndex ?? 0) + 1}</div>
              </div>
            )}
            {viewportStates[index]?.status === 'loading' && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 text-sm text-slate-600">{t('imaging.loadingImage')}</div>
            )}
            {viewportStates[index]?.status === 'error' && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50/90 p-4 text-center text-sm text-red-700">{viewportStates[index]?.errorMessage || t('imaging.unableToLoadImage')}</div>
            )}
            {index > 0 && series.length > 0 && (
              <select
                value={viewportAssignments[index] ?? selectedSeriesIndex}
                onChange={(event) => { stopCine(); viewportGenerationRef.current[index] += 1; setViewportAssignments((current) => {
                  const next = [...current]
                  next[index] = Number(event.target.value)
                  return next
                }) }}
                onClick={(event) => event.stopPropagation()}
                className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded border border-white/40 bg-black/70 px-2 py-1 text-xs text-white"
                aria-label={t('imaging.assignSeries')}
              >
                {series.map((targetSeries, seriesIndex) => <option key={targetSeries.id} value={seriesIndex}>{targetSeries.seriesDescription || t('imaging.seriesX', { number: seriesIndex + 1 })}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default DicomViewer
