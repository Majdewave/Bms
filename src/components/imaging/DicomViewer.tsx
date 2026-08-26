import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { ArrowUpRight, ChevronLeft, ChevronRight, Circle, Contrast, CornerUpRight, Crosshair, Eraser, FlipHorizontal2, FlipVertical2, Hand, LayoutGrid, Maximize, Minimize, Minus, MoveHorizontal, Plus, Redo2, RefreshCw, RectangleHorizontal, Ruler, RotateCcw, RotateCw, SunMedium, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { imagingService } from '@/api'
import type {
  CanonicalAnnotationGeometry,
  CreateImagingAnnotationRequest,
  ImagingAnnotation,
  ImagingInstanceDetail,
  ImagingSeriesDetail,
  ImagingStudyHierarchy,
  UpdateImagingAnnotationRequest,
} from '@/api/imaging'

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

const persistedToolNames = new Set(optionalToolNames.map((name) => name.replace('Tool', '')))

const toDatabaseFrameNumber = (frameIndex: number): number => Math.max(1, frameIndex + 1)

const getFrameIndexFromImageId = (imageId: string | undefined): number => {
  const match = imageId?.match(/[?&]frame=(\d+)/)
  const frameNumber = match ? Number(match[1]) : 1
  return Number.isInteger(frameNumber) && frameNumber > 0 ? frameNumber - 1 : 0
}

const canonicalizeGeometryValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalizeGeometryValue)
  if (!value || typeof value !== 'object') return value
  const result: Record<string, unknown> = {}
  Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
    if (['cachedStats', 'enabledElement', 'pointsManager', 'highlighted', 'isSelected', 'invalidated'].includes(key)) return
    if (typeof nestedValue !== 'function') result[key] = canonicalizeGeometryValue(nestedValue)
  })
  return result
}

const serializeAnnotationGeometry = (annotation: any): CanonicalAnnotationGeometry => ({
  data: canonicalizeGeometryValue(annotation.data ?? {}) as Record<string, unknown>,
  metadata: canonicalizeGeometryValue({
    FrameOfReferenceUID: annotation.metadata?.FrameOfReferenceUID,
    viewPlaneNormal: annotation.metadata?.viewPlaneNormal,
    viewUp: annotation.metadata?.viewUp,
  }) as CanonicalAnnotationGeometry['metadata'],
})

const getAnnotationDiagnostics = (annotation: any) => ({
  annotationUID: annotation?.annotationUID,
  metadataKeys: Object.keys(annotation?.metadata ?? {}),
  dataKeys: Object.keys(annotation?.data ?? {}),
  handles: annotation?.data?.handles,
  toolName: annotation?.metadata?.toolName,
  FrameOfReferenceUID: annotation?.metadata?.FrameOfReferenceUID,
  referencedImageId: annotation?.metadata?.referencedImageId,
})

const parseAnnotationGeometry = (geometry: CanonicalAnnotationGeometry | string): CanonicalAnnotationGeometry => {
  if (typeof geometry === 'string') return JSON.parse(geometry) as CanonicalAnnotationGeometry
  return geometry
}

const ensureCornerstoneReady = () => {
  if (cornerstoneReady) {
    return Promise.resolve({
      core: cornerstoneCoreModule,
      loader: cornerstoneLoaderModule,
      tools: cornerstoneToolsModule,
    })
  }

  if (cornerstoneReadyPromise) return cornerstoneReadyPromise

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
    return { core: coreModule, loader: loaderExport, tools: cornerstoneToolsModule }
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
  if (!match) return null
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
  const imageCacheRef = useRef(
    new Map<string, { imageId: string; fileIndex: number | null }>()
  )
  const fullscreenRef = useRef<HTMLDivElement | null>(null)
  const viewportElementsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const thumbnailElementsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const viewportGenerationRef = useRef<number[]>([0, 0, 0, 0])
  const structuralResizeFrameRef = useRef<number | null>(null)
  const initialViewportFitTriggeredRef = useRef(false)
  const cineTimerRef = useRef<number | null>(null)
  const cineViewportRef = useRef<number | null>(null)
  type AnnotationHistoryItem = {
    annotation: any
    imagingInstanceId: string
    frameNumber: number
    annotationId?: string
  }
  type AnnotationHistorySnapshot = AnnotationHistoryItem[]
  const annotationHistoryRef = useRef<AnnotationHistorySnapshot[]>([])
  const annotationFutureRef = useRef<AnnotationHistorySnapshot[]>([])
  const historyApplyingRef = useRef(false)
  const annotationEventsCleanupRef = useRef<(() => void) | null>(null)
  const persistedAnnotationUidsRef = useRef(new Set<string>())
  const annotationIdsByUidRef = useRef(new Map<string, string>())
  const deletingAnnotationUidsRef = useRef(new Set<string>())
  const updatingAnnotationUidsRef = useRef(new Set<string>())
  const annotationUpdatePromisesRef = useRef(new Map<string, Promise<void>>())
  const pendingAnnotationUpdatesRef = useRef(new Map<string, any>())
  const annotationUpdateTimersRef = useRef(new Map<string, number>())
  const restoringAnnotationsRef = useRef(false)
  const historyPersistenceQueueRef = useRef(Promise.resolve())
  const lastObservedAnnotationSnapshotRef = useRef<AnnotationHistorySnapshot | null>(null)
  const savingAnnotationUidsRef = useRef(new Set<string>())
  const annotationSavePromisesRef = useRef(new Map<string, Promise<void>>())
  const annotationLoadKeysRef = useRef(new Set<string>())
  const annotationViewportScopesRef = useRef(new Map<number, string>())
  const disposedRef = useRef(false)
  const viewportStatesRef = useRef<ViewportState[]>([])
  const activeViewportIndexRef = useRef(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAnnotationsExpanded, setIsAnnotationsExpanded] = useState(true)
  const [activeTool, setActiveTool] = useState('WindowLevel')
  const [cineFps, setCineFps] = useState(15)
  const [cinePlaying, setCinePlaying] = useState(false)
  const [layout, setLayout] = useState<'1x1' | '1x2' | '2x2'>('1x1')
  const [activeViewportIndex, setActiveViewportIndex] = useState(0)
  const diagnosticAreaRef = useRef<HTMLDivElement | null>(null)
  const [annotationPanelTab, setAnnotationPanelTab] = useState<'all' | 'measurements' | 'text'>('all')
  const [annotationPanelQuery, setAnnotationPanelQuery] = useState('')
  const [annotationPanelRevision, setAnnotationPanelRevision] = useState(0)
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

  viewportStatesRef.current = viewportStates
  activeViewportIndexRef.current = activeViewportIndex

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
      const annotationToolNames = optionalToolNames
        .map((name) => tools[name])
        .filter(Boolean)
        .map((toolClass: any) => toolClass.toolName)
      annotationToolNames.forEach((toolName: string) => toolGroup.setToolPassive(toolName, { removeAllBindings: true }))
      console.log('[DicomViewer][Tools] ANNOTATION MODES', Object.fromEntries(
        annotationToolNames.map((toolName: string) => [toolName, toolGroup.getToolOptions(toolName)?.mode])
      ))
      toolGroupRef.current = toolGroup
      console.log('[DicomViewer] F primary ToolGroup registered')
      const annotationEvents = [tools.Enums.Events.ANNOTATION_COMPLETED, tools.Enums.Events.ANNOTATION_MODIFIED]
      const recordAnnotationChange = (event: Event) => {
        if (historyApplyingRef.current || !cornerstoneToolsModule.annotation?.state) return
        const detail = (event as CustomEvent<{ annotation?: any; changeType?: string }>).detail
        if (event.type === tools.Enums.Events.ANNOTATION_MODIFIED && detail?.changeType && detail.changeType !== 'HandlesUpdated') return
        const current = createAnnotationHistorySnapshot()
        const isCompletion = event.type === tools.Enums.Events.ANNOTATION_COMPLETED
        const previous = isCompletion && detail?.annotation?.annotationUID
          ? createAnnotationHistorySnapshot(detail.annotation.annotationUID)
          : lastObservedAnnotationSnapshotRef.current ?? current
        annotationHistoryRef.current.push(previous)
        annotationFutureRef.current = []
      }
      annotationEvents.forEach((eventName: string) => core.eventTarget?.addEventListener(eventName, recordAnnotationChange))
      const refreshAnnotationPanel = () => setAnnotationPanelRevision((revision) => revision + 1)
      core.eventTarget?.addEventListener(tools.Enums.Events.ANNOTATION_COMPLETED, refreshAnnotationPanel)
      core.eventTarget?.addEventListener(tools.Enums.Events.ANNOTATION_MODIFIED, refreshAnnotationPanel)
      core.eventTarget?.addEventListener(tools.Enums.Events.ANNOTATION_REMOVED, refreshAnnotationPanel)
      core.eventTarget?.addEventListener(tools.Enums.Events.ANNOTATION_COMPLETED, handleAnnotationCompleted)
      core.eventTarget?.addEventListener(tools.Enums.Events.ANNOTATION_MODIFIED, handleAnnotationModified)
      annotationEventsCleanupRef.current = () => {
        annotationEvents.forEach((eventName: string) => core.eventTarget?.removeEventListener(eventName, recordAnnotationChange))
        core.eventTarget?.removeEventListener(tools.Enums.Events.ANNOTATION_COMPLETED, refreshAnnotationPanel)
        core.eventTarget?.removeEventListener(tools.Enums.Events.ANNOTATION_MODIFIED, refreshAnnotationPanel)
        core.eventTarget?.removeEventListener(tools.Enums.Events.ANNOTATION_REMOVED, refreshAnnotationPanel)
        core.eventTarget?.removeEventListener(tools.Enums.Events.ANNOTATION_COMPLETED, handleAnnotationCompleted)
        core.eventTarget?.removeEventListener(tools.Enums.Events.ANNOTATION_MODIFIED, handleAnnotationModified)
      }
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

  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      stopCine()
      for (let index = 0; index < 4; index += 1) {
        viewportGenerationRef.current[index] += 1
        try { renderingEngineRef.current?.disableElement(viewportId(index)) } catch { /* already disabled */ }
      }
      annotationEventsCleanupRef.current?.()
      annotationEventsCleanupRef.current = null
      annotationUpdateTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      annotationUpdateTimersRef.current.clear()
      pendingAnnotationUpdatesRef.current.clear()
      annotationSavePromisesRef.current.clear()
      annotationUpdatePromisesRef.current.clear()
      annotationIdsByUidRef.current.clear()
      if (toolGroupRef.current) cornerstoneToolsModule?.ToolGroupManager.destroyToolGroup(toolGroupRef.current.id)
      removeCachedFileManagerEntries()
      renderingEngineRef.current?.destroy()
      renderingEngineRef.current = null
      toolGroupRef.current = null
    }
  }, [])

  const fitVisibleViewportsAfterStructuralChange = useCallback(() => {
    if (disposedRef.current || !renderingEngineRef.current) return

    const engine = renderingEngineRef.current
    engine.resize(true, true)

    for (let index = 0; index < viewportCount; index += 1) {
      const viewport = engine.getViewport(viewportId(index))
      if (!viewport) continue
      viewport.resetCamera({ resetPan: true, resetZoom: true, resetToCenter: true })
      viewport.render?.()
    }

    engine.render()
  }, [viewportCount])

  const scheduleStructuralViewportFit = useCallback(() => {
    if (disposedRef.current || !renderingEngineRef.current) return

    if (structuralResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(structuralResizeFrameRef.current)
    }

    structuralResizeFrameRef.current = window.requestAnimationFrame(() => {
      structuralResizeFrameRef.current = null
      fitVisibleViewportsAfterStructuralChange()
    })
  }, [fitVisibleViewportsAfterStructuralChange])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current)
      scheduleStructuralViewportFit()
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    const observer = diagnosticAreaRef.current && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (disposedRef.current || !renderingEngineRef.current) return
          renderingEngineRef.current.resize(true, true)
          renderingEngineRef.current.render()
        })
      : null

    if (diagnosticAreaRef.current) observer?.observe(diagnosticAreaRef.current)

    return () => {
      if (structuralResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(structuralResizeFrameRef.current)
        structuralResizeFrameRef.current = null
      }
      observer?.disconnect()
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [scheduleStructuralViewportFit])

  useEffect(() => {
    scheduleStructuralViewportFit()
  }, [layout, viewportCount, isAnnotationsExpanded, isFullscreen, scheduleStructuralViewportFit])

  useEffect(() => { setViewportAssignments((current) => [selectedSeriesIndex, current[1] ?? selectedSeriesIndex, current[2] ?? selectedSeriesIndex, current[3] ?? selectedSeriesIndex]) }, [selectedSeriesIndex])

  useEffect(() => {
    stopCine()
    void enableVisibleViewports().catch((error) => console.warn('[DicomViewer] viewport layout failed', error))
  }, [layout, viewportCount])

  useEffect(() => {
    let cancelled = false
    const loadViewports = async () => {
      initialViewportFitTriggeredRef.current = false
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
          if (index === 0 && !initialViewportFitTriggeredRef.current) {
            initialViewportFitTriggeredRef.current = true
            scheduleStructuralViewportFit()
          }
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

  useEffect(() => {
    viewportStates.forEach((state, index) => {
      if (state.status !== 'ready') return
      const context = getViewportContext(index)
      if (!context) return
      const scopeKey = `${context.imagingInstanceId}:${context.frameNumber}:${context.imageId ?? ''}`
      if (annotationViewportScopesRef.current.get(index) === scopeKey) return
      if (context.element) clearAnnotationsForViewport(context.element)
      annotationViewportScopesRef.current.set(index, scopeKey)
      void loadAnnotationsForViewport(index)
    })
  }, [viewportStates, viewportAssignments, series, instances, selectedSeriesIndex])

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

  const getViewportContext = (index: number) => {
    const state = viewportStatesRef.current[index]
    if (!state || state.status !== 'ready') return null
    const assignedSeries = series[viewportAssignments[index] ?? selectedSeriesIndex]
    const targetInstances = index === 0 && !assignedSeries
      ? instances
      : assignedSeries?.instances.filter((item) => item.storageStatus === 'LocalAndS3') ?? []
    const targetInstance = targetInstances[state.instanceIndex]
    const viewport = renderingEngineRef.current?.getViewport(viewportId(index))
    if (!targetInstance || !viewport) return null
    const frameIndex = state.isMultiFrame ? state.currentFrameIndex : 0
    return {
      viewport,
      element: viewportElementsRef.current[viewportId(index)],
      imagingInstanceId: targetInstance.id,
      frameNumber: toDatabaseFrameNumber(frameIndex),
      imageId: viewport.getCurrentImageId?.() as string | undefined,
      frameOfReferenceUID: viewport.getFrameOfReferenceUID?.(),
      viewPlaneNormal: viewport.getCamera?.().viewPlaneNormal,
      viewUp: viewport.getCamera?.().viewUp,
    }
  }

  const findAnnotationViewport = (annotation: any) => {
    const referencedImageId = annotation.metadata?.referencedImageId
    for (let index = 0; index < viewportCount; index += 1) {
      const context = getViewportContext(index)
      if (context && (!referencedImageId || context.imageId === referencedImageId)) return context
    }
    return getViewportContext(activeViewportIndexRef.current)
  }

  const persistCompletedAnnotation = async (annotation: any) => {
    if (disposedRef.current) return
    const annotationUid = annotation?.annotationUID
    const toolName = annotation?.metadata?.toolName
    if (!annotationUid || !toolName || !persistedToolNames.has(toolName)) return
    if (persistedAnnotationUidsRef.current.has(annotationUid) || savingAnnotationUidsRef.current.has(annotationUid)) return

    savingAnnotationUidsRef.current.add(annotationUid)
    try {
      const context = findAnnotationViewport(annotation)
      if (!context) return
      const request: CreateImagingAnnotationRequest = {
        imagingInstanceId: context.imagingInstanceId,
        frameNumber: context.frameNumber,
        annotationUid,
        toolName,
        geometry: serializeAnnotationGeometry(annotation),
        label: typeof annotation.data?.label === 'string' ? annotation.data.label : null,
      }
      console.log('[DicomViewer][Annotations] LIVE LENGTH', getAnnotationDiagnostics(annotation))
      console.log('[DicomViewer][Annotations] COMPLETE', { annotationUid, toolName, imagingInstanceId: request.imagingInstanceId, frameNumber: request.frameNumber })
      console.log('[DicomViewer][Annotations] SAVE START', { annotationUid, toolName, imagingInstanceId: request.imagingInstanceId, frameNumber: request.frameNumber })
      const createdAnnotation = await imagingService.createImagingAnnotation(request)
      if (disposedRef.current) return
      annotationIdsByUidRef.current.set(annotationUid, createdAnnotation.id)
      persistedAnnotationUidsRef.current.add(annotationUid)
      lastObservedAnnotationSnapshotRef.current = createAnnotationHistorySnapshot()
      console.log('[DicomViewer][Annotations] SAVE SUCCESS', { annotationUid, toolName, imagingInstanceId: request.imagingInstanceId, frameNumber: request.frameNumber })
    } catch (error) {
      console.error('[DicomViewer][Annotations] SAVE FAILED', { annotationUid, toolName, error })
    } finally {
      savingAnnotationUidsRef.current.delete(annotationUid)
    }
  }

  const updateAnnotation = async (annotation: any) => {
    if (disposedRef.current) return
    const annotationUid = annotation?.annotationUID
    const annotationId = annotationUid ? annotationIdsByUidRef.current.get(annotationUid) : undefined
    if (!annotationUid || !annotationId || deletingAnnotationUidsRef.current.has(annotationUid)) return
    if (updatingAnnotationUidsRef.current.has(annotationUid)) {
      pendingAnnotationUpdatesRef.current.set(annotationUid, annotation)
      return
    }

    updatingAnnotationUidsRef.current.add(annotationUid)
    let resolveUpdate: () => void = () => undefined
    const updateComplete = new Promise<void>((resolve) => { resolveUpdate = resolve })
    annotationUpdatePromisesRef.current.set(annotationUid, updateComplete)
    try {
      const request: UpdateImagingAnnotationRequest = {
        geometry: serializeAnnotationGeometry(annotation),
        label: typeof annotation.data?.label === 'string' ? annotation.data.label : null,
      }
      console.log('[DicomViewer][Annotations] UPDATE START', { annotationUid, annotationId })
      await imagingService.updateImagingAnnotation(annotationId, request)
      if (!disposedRef.current) lastObservedAnnotationSnapshotRef.current = createAnnotationHistorySnapshot()
      console.log('[DicomViewer][Annotations] UPDATE SUCCESS', { annotationUid, annotationId })
    } catch (error) {
      console.error('[DicomViewer][Annotations] UPDATE FAILED', { annotationUid, annotationId, error })
      if (!disposedRef.current) toast.error('Unable to save the annotation changes.')
    } finally {
      updatingAnnotationUidsRef.current.delete(annotationUid)
      annotationUpdatePromisesRef.current.delete(annotationUid)
      resolveUpdate()
      const pending = pendingAnnotationUpdatesRef.current.get(annotationUid)
      pendingAnnotationUpdatesRef.current.delete(annotationUid)
      if (pending && !deletingAnnotationUidsRef.current.has(annotationUid) && !disposedRef.current) scheduleAnnotationUpdate(pending)
    }
  }

  const scheduleAnnotationUpdate = (annotation: any) => {
    const annotationUid = annotation?.annotationUID
    if (disposedRef.current || !annotationUid || restoringAnnotationsRef.current || !annotationIdsByUidRef.current.has(annotationUid)) return
    pendingAnnotationUpdatesRef.current.set(annotationUid, annotation)
    const existingTimer = annotationUpdateTimersRef.current.get(annotationUid)
    if (existingTimer !== undefined) window.clearTimeout(existingTimer)
    const timer = window.setTimeout(() => {
      if (disposedRef.current) return
      annotationUpdateTimersRef.current.delete(annotationUid)
      const pending = pendingAnnotationUpdatesRef.current.get(annotationUid)
      pendingAnnotationUpdatesRef.current.delete(annotationUid)
      if (pending) void updateAnnotation(pending)
    }, 250)
    annotationUpdateTimersRef.current.set(annotationUid, timer)
  }

  const handleAnnotationModified = (event: Event) => {
    if (restoringAnnotationsRef.current) return
    const detail = (event as CustomEvent<{ annotation?: any; changeType?: string }>).detail
    if (detail?.changeType && detail.changeType !== 'HandlesUpdated') return
    scheduleAnnotationUpdate(detail?.annotation)
  }

  const handleAnnotationCompleted = (event: Event) => {
    const annotation = (event as CustomEvent<{ annotation?: any }>).detail?.annotation
    const annotationUid = annotation?.annotationUID
    const savePromise = persistCompletedAnnotation(annotation)
    if (annotationUid) {
      annotationSavePromisesRef.current.set(annotationUid, savePromise)
      void savePromise.finally(() => annotationSavePromisesRef.current.delete(annotationUid))
    }
  }

  const clearAnnotationsForViewport = (element: HTMLDivElement) => {
    const annotationState = getAnnotationState()
    if (!annotationState) return
    persistedToolNames.forEach((toolName) => {
      annotationState.getAnnotations(toolName, element).forEach((annotation: any) => {
        if (annotation.annotationUID) annotationState.removeAnnotation(annotation.annotationUID)
      })
    })
  }

  const loadAnnotationsForViewport = async (index: number) => {
    const context = getViewportContext(index)
    if (!context || !context.element) return
    const loadKey = `${context.imagingInstanceId}:${context.frameNumber}:${index}`
    if (annotationLoadKeysRef.current.has(loadKey)) return
    annotationLoadKeysRef.current.add(loadKey)
    console.log('[DicomViewer][Annotations] LOAD START', { imagingInstanceId: context.imagingInstanceId, frameNumber: context.frameNumber })
    try {
      const annotations = await imagingService.getImagingAnnotations(context.imagingInstanceId, context.frameNumber)
      const annotationState = getAnnotationState()
      const localUids = new Set(annotationState?.getAllAnnotations().map((item: any) => item.annotationUID) ?? [])
      restoringAnnotationsRef.current = true
      try {
        annotations.forEach((stored: ImagingAnnotation) => {
        try {
          annotationIdsByUidRef.current.set(stored.annotationUid, stored.id)
          persistedAnnotationUidsRef.current.add(stored.annotationUid)
          if (localUids.has(stored.annotationUid)) return
          const geometry = parseAnnotationGeometry(stored.geometry)
          console.log('[DicomViewer][Annotations] RESTORE SOURCE', {
            id: stored.id,
            annotationUid: stored.annotationUid,
            toolName: stored.toolName,
            imagingInstanceId: stored.imagingInstanceId,
            frameNumber: stored.frameNumber,
            geometryKeys: Object.keys(geometry),
            dataKeys: Object.keys(geometry.data ?? {}),
            metadataKeys: Object.keys(geometry.metadata ?? {}),
          })
          const restoredAnnotation = {
            annotationUID: stored.annotationUid,
            metadata: {
              toolName: stored.toolName,
              FrameOfReferenceUID: context.frameOfReferenceUID,
              referencedImageId: context.imageId,
              viewPlaneNormal: context.viewPlaneNormal,
              viewUp: context.viewUp,
            },
            data: {
              ...geometry.data,
              handles: {
                ...(geometry.data.handles as Record<string, unknown>),
                activeHandleIndex: null,
              },
              ...(stored.label !== null && stored.label !== undefined ? { label: stored.label } : {}),
            },
            highlighted: false,
            isLocked: false,
            isVisible: true,
            invalidated: true,
            isSelected: false,
          }
          console.log('[DicomViewer][Annotations] RESTORE OBJECT', getAnnotationDiagnostics(restoredAnnotation))
          annotationState?.addAnnotation(restoredAnnotation, context.element)
          const foundAfterAdd = !!annotationState?.getAnnotation(stored.annotationUid)
          console.log('[DicomViewer][Annotations] RESTORE ADDED', {
            annotationUid: stored.annotationUid,
            foundAfterAdd,
            viewportId: context.viewport.id,
            currentImageId: context.imageId,
            })
        } catch (error) {
          console.error('[DicomViewer][Annotations] RESTORE FAILED', {
            annotationUid: stored.annotationUid,
            toolName: stored.toolName,
            error,
            })
        }
          })
      } finally {
        restoringAnnotationsRef.current = false
      }
      if (!disposedRef.current) lastObservedAnnotationSnapshotRef.current = createAnnotationHistorySnapshot()
      console.log('[DicomViewer][Annotations] LOAD RESULT', { count: annotations.length })
      context.viewport.render?.()
      renderingEngineRef.current?.render()
      console.log('[DicomViewer][Annotations] RESTORE RENDER')
    } catch (error) {
      annotationLoadKeysRef.current.delete(loadKey)
      console.error('[DicomViewer][Annotations] LOAD FAILED', { imagingInstanceId: context.imagingInstanceId, frameNumber: context.frameNumber, error })
    }
  }

  const cloneAnnotations = (annotations: any[]) => {
    if (typeof structuredClone === 'function') {
      return structuredClone(annotations)
    }

    return JSON.parse(JSON.stringify(annotations))
  }

  const saveAnnotationHistory = () => {
    const annotationState = getAnnotationState()
    if (!annotationState) return

    annotationHistoryRef.current.push(createAnnotationHistorySnapshot())
    if (annotationHistoryRef.current.length > 30) {
      annotationHistoryRef.current.shift()
    }
    annotationFutureRef.current = []
  }

  const createAnnotationHistorySnapshot = (excludedAnnotationUid?: string): AnnotationHistorySnapshot => {
    const annotationState = getAnnotationState()
    if (!annotationState) return []

    return annotationState.getAllAnnotations()
      .filter((annotation: any) => annotation.annotationUID !== excludedAnnotationUid)
      .map((annotation: any) => {
      const context = findAnnotationViewport(annotation)
      return {
        annotation: cloneAnnotations([annotation])[0],
        imagingInstanceId: context?.imagingInstanceId ?? '',
        frameNumber: context?.frameNumber ?? 1,
        annotationId: annotation.annotationUID ? annotationIdsByUidRef.current.get(annotation.annotationUID) : undefined,
      }
    })
  }

  const restoreAnnotations = (snapshot: AnnotationHistorySnapshot) => {
    const annotationState = getAnnotationState()
    if (!annotationState) return

    historyApplyingRef.current = true
    restoringAnnotationsRef.current = true
    try {
      annotationState.removeAllAnnotations()
      snapshot.forEach((item) => {
        const context = getViewportContextForIdentity(item.imagingInstanceId, item.frameNumber)
        annotationState.addAnnotation(item.annotation, context?.element ?? containerRef.current ?? undefined)
      })
      renderingEngineRef.current?.render()
    } finally {
      historyApplyingRef.current = false
      restoringAnnotationsRef.current = false
    }
  }

  const getViewportContextForIdentity = (imagingInstanceId: string, frameNumber: number) => {
    for (let index = 0; index < viewportCount; index += 1) {
      const context = getViewportContext(index)
      if (context?.imagingInstanceId === imagingInstanceId && context.frameNumber === frameNumber) return context
    }
    return getViewportContext(activeViewportIndexRef.current)
  }

  const cancelPendingAnnotationUpdate = (annotationUid: string) => {
    const timer = annotationUpdateTimersRef.current.get(annotationUid)
    if (timer !== undefined) window.clearTimeout(timer)
    annotationUpdateTimersRef.current.delete(annotationUid)
    pendingAnnotationUpdatesRef.current.delete(annotationUid)
  }

  const createAnnotationFromHistory = async (item: AnnotationHistoryItem) => {
    const annotationUid = item.annotation.annotationUID
    if (!annotationUid || persistedAnnotationUidsRef.current.has(annotationUid)) return
    if (!item.imagingInstanceId) throw new Error(`Missing persistence context for annotation ${annotationUid}`)
    const created = await imagingService.createImagingAnnotation({
      imagingInstanceId: item.imagingInstanceId,
      frameNumber: item.frameNumber,
      annotationUid,
      toolName: item.annotation.metadata?.toolName ?? '',
      geometry: serializeAnnotationGeometry(item.annotation),
      label: typeof item.annotation.data?.label === 'string' ? item.annotation.data.label : null,
    })
    annotationIdsByUidRef.current.set(annotationUid, created.id)
    persistedAnnotationUidsRef.current.add(annotationUid)
    return created.id
  }

  const reconcileHistory = async (before: AnnotationHistorySnapshot, after: AnnotationHistorySnapshot): Promise<boolean> => {
    const beforeByUid = new Map(before.map((item) => [item.annotation.annotationUID, item]))
    const afterByUid = new Map(after.map((item) => [item.annotation.annotationUID, item]))
    const allUids = new Set([...beforeByUid.keys(), ...afterByUid.keys()])
    const completedOperations: Array<{ operation: 'POST' | 'PUT' | 'DELETE'; before?: AnnotationHistoryItem; after?: AnnotationHistoryItem; annotationId?: string }> = []

    for (const annotationUid of allUids) {
      if (!annotationUid) continue
      if (disposedRef.current) return false
      const beforeItem = beforeByUid.get(annotationUid)
      const afterItem = afterByUid.get(annotationUid)
      const isDeleting = !!beforeItem && !afterItem
      if (isDeleting) deletingAnnotationUidsRef.current.add(annotationUid)
      try {
        cancelPendingAnnotationUpdate(annotationUid)
        await annotationSavePromisesRef.current.get(annotationUid)
        await annotationUpdatePromisesRef.current.get(annotationUid)
        if (beforeItem && !afterItem) {
          const annotationId = annotationIdsByUidRef.current.get(annotationUid) ?? beforeItem.annotationId
          if (annotationId) await imagingService.deleteImagingAnnotation(annotationId)
          annotationIdsByUidRef.current.delete(annotationUid)
          persistedAnnotationUidsRef.current.delete(annotationUid)
          if (annotationId) completedOperations.push({ operation: 'DELETE', before: beforeItem, annotationId })
        } else if (!beforeItem && afterItem) {
          const annotationId = await createAnnotationFromHistory(afterItem)
          completedOperations.push({ operation: 'POST', after: afterItem, annotationId })
        } else if (beforeItem && afterItem) {
          const beforeGeometry = JSON.stringify(serializeAnnotationGeometry(beforeItem.annotation))
          const afterGeometry = JSON.stringify(serializeAnnotationGeometry(afterItem.annotation))
          const beforeLabel = beforeItem.annotation.data?.label ?? null
          const afterLabel = afterItem.annotation.data?.label ?? null
          const annotationId = annotationIdsByUidRef.current.get(annotationUid) ?? afterItem.annotationId ?? beforeItem.annotationId
          if (annotationId && (beforeGeometry !== afterGeometry || beforeLabel !== afterLabel)) {
            await imagingService.updateImagingAnnotation(annotationId, {
              geometry: serializeAnnotationGeometry(afterItem.annotation),
              label: typeof afterLabel === 'string' ? afterLabel : null,
            })
            completedOperations.push({ operation: 'PUT', before: beforeItem, after: afterItem, annotationId })
          }
        }
      } catch (error) {
        console.error('[DicomViewer][Annotations] HISTORY FAILED', { annotationUid, operation: beforeItem && !afterItem ? 'DELETE' : !beforeItem && afterItem ? 'POST' : 'PUT', error })
        if (!disposedRef.current) toast.error('Unable to persist the annotation history change.')
        for (const completed of completedOperations.reverse()) {
          try {
            if (completed.operation === 'DELETE' && completed.before) {
              await createAnnotationFromHistory(completed.before)
            } else if (completed.operation === 'POST' && completed.annotationId && completed.after?.annotation.annotationUID) {
              await imagingService.deleteImagingAnnotation(completed.annotationId)
              annotationIdsByUidRef.current.delete(completed.after.annotation.annotationUID)
              persistedAnnotationUidsRef.current.delete(completed.after.annotation.annotationUID)
            } else if (completed.operation === 'PUT' && completed.annotationId && completed.before) {
              await imagingService.updateImagingAnnotation(completed.annotationId, {
                geometry: serializeAnnotationGeometry(completed.before.annotation),
                label: typeof completed.before.annotation.data?.label === 'string' ? completed.before.annotation.data.label : null,
              })
            }
          } catch (compensationError) {
            console.error('[DicomViewer][Annotations] HISTORY COMPENSATION FAILED', { annotationUid, operation: completed.operation, error: compensationError })
          }
        }
        return false
      } finally {
        if (isDeleting) deletingAnnotationUidsRef.current.delete(annotationUid)
      }
    }
    return true
  }

  const enqueueHistoryPersistence = (before: AnnotationHistorySnapshot, after: AnnotationHistorySnapshot, onFailure?: () => void): Promise<boolean> => {
    const operation = historyPersistenceQueueRef.current
      .then(async () => {
        if (disposedRef.current) return false
        const success = await reconcileHistory(before, after)
        if (!success) onFailure?.()
        return success
      })
      .catch((error) => {
        console.error('[DicomViewer][Annotations] HISTORY QUEUE FAILED', error)
        if (!disposedRef.current) toast.error('Unable to persist the annotation history change.')
        return false
      })
    historyPersistenceQueueRef.current = operation.then(() => undefined)
    return operation
  }

  const enqueueHistoryAction = (direction: 'undo' | 'redo'): Promise<boolean> => {
    const operation = historyPersistenceQueueRef.current
      .then(async () => {
        if (disposedRef.current) return false
        const annotationState = getAnnotationState()
        if (!annotationState) return false
        const target = direction === 'undo'
          ? annotationHistoryRef.current.pop()
          : annotationFutureRef.current.pop()
        if (!target) return false
        const current = createAnnotationHistorySnapshot()
        if (direction === 'undo') annotationFutureRef.current.push(current)
        else annotationHistoryRef.current.push(current)
        restoreAnnotations(target)
        const success = await reconcileHistory(current, target)
        if (success) {
          lastObservedAnnotationSnapshotRef.current = target
          return true
        }
        if (!disposedRef.current) {
          restoreAnnotations(current)
          lastObservedAnnotationSnapshotRef.current = current
          if (direction === 'undo') {
            annotationFutureRef.current.pop()
            annotationHistoryRef.current.push(target)
          } else {
            annotationHistoryRef.current.pop()
            annotationFutureRef.current.push(target)
          }
        }
        return false
      })
      .catch((error) => {
        console.error('[DicomViewer][Annotations] HISTORY ACTION FAILED', { direction, error })
        if (!disposedRef.current) toast.error('Unable to persist the annotation history change.')
        return false
      })
    historyPersistenceQueueRef.current = operation.then(() => undefined)
    return operation
  }

  const handleDeleteAnnotation = () => {
    const selection = cornerstoneToolsModule?.annotation?.selection
    const annotationState = getAnnotationState()
    const selectedUids = selection?.getAnnotationsSelected?.() ?? []
    const selected = selectedUids
      .map((annotationUid: string) => annotationState?.getAnnotation(annotationUid))
      .filter(Boolean)
    if (!annotationState || selected.length === 0) return

    saveAnnotationHistory()
    selected.forEach((annotation: any) => annotationState.removeAnnotation(annotation.annotationUID))
    renderingEngineRef.current?.render()
    const before = annotationHistoryRef.current[annotationHistoryRef.current.length - 1] ?? []
    const after = createAnnotationHistorySnapshot()
    void enqueueHistoryPersistence(
      before,
      after,
      () => {
        if (!disposedRef.current) {
          restoreAnnotations(before)
          lastObservedAnnotationSnapshotRef.current = before
          annotationHistoryRef.current.pop()
        }
      }
    ).then((success) => {
      if (success) {
        lastObservedAnnotationSnapshotRef.current = after
      }
    })
  }

  const handleClearAnnotations = () => {
    const annotationState = getAnnotationState()
    if (!annotationState || annotationState.getAllAnnotations().length === 0) return

    saveAnnotationHistory()
    annotationState.removeAllAnnotations()
    renderingEngineRef.current?.render()
    const before = annotationHistoryRef.current[annotationHistoryRef.current.length - 1] ?? []
    const after = createAnnotationHistorySnapshot()
    void enqueueHistoryPersistence(
      before,
      after,
      () => {
        if (!disposedRef.current) {
          restoreAnnotations(before)
          lastObservedAnnotationSnapshotRef.current = before
          annotationHistoryRef.current.pop()
        }
      }
    ).then((success) => {
      if (success) {
        lastObservedAnnotationSnapshotRef.current = after
      }
    })
  }

  const handleUndo = () => {
    void enqueueHistoryAction('undo')
  }

  const handleRedo = () => {
    void enqueueHistoryAction('redo')
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
    { name: 'Pan', label: t('imaging.pan'), icon: Hand },
    { name: 'Zoom', label: t('imaging.zoom'), icon: ZoomIn },
    { name: 'Length', label: t('imaging.length'), optional: 'LengthTool', icon: Ruler },
    { name: 'Bidirectional', label: t('imaging.bidirectional'), optional: 'BidirectionalTool', icon: MoveHorizontal },
    { name: 'Angle', label: t('imaging.angle'), optional: 'AngleTool', icon: CornerUpRight },
    { name: 'Probe', label: t('imaging.probe'), optional: 'ProbeTool', icon: Crosshair },
    { name: 'EllipticalROI', label: t('imaging.ellipse'), optional: 'EllipticalROITool', icon: Circle },
    { name: 'RectangleROI', label: t('imaging.rectangle'), optional: 'RectangleROITool', icon: RectangleHorizontal },
    { name: 'ArrowAnnotate', label: t('imaging.arrow'), optional: 'ArrowAnnotateTool', icon: ArrowUpRight },
  ]

  const availableToolButtons = toolButtons.filter((tool) => !tool.optional || cornerstoneToolsModule?.[tool.optional])
  const activeSeriesIndex = viewportAssignments[activeViewportIndex] ?? selectedSeriesIndex
  const gridClass = layout === '1x1' ? 'grid-cols-1' : layout === '1x2' ? 'grid-cols-2' : 'grid-cols-2'
  const mainViewerGridClass = isAnnotationsExpanded
    ? 'lg:grid-cols-[104px_minmax(0,1fr)_280px] xl:grid-cols-[128px_minmax(0,1fr)_320px]'
    : 'lg:grid-cols-[104px_minmax(0,1fr)_72px] xl:grid-cols-[128px_minmax(0,1fr)_72px]'
  const annotationState = getAnnotationState()
  const annotationPanelAnnotations = (annotationState?.getAllAnnotations?.() ?? []).filter((annotation: any) => {
    const toolName = annotation.metadata?.toolName ?? ''
    const label = annotation.data?.label ?? ''
    const matchesTab = annotationPanelTab === 'all'
      || (annotationPanelTab === 'measurements' && !['ArrowAnnotate', 'Text'].includes(toolName))
      || (annotationPanelTab === 'text' && ['ArrowAnnotate', 'Text'].includes(toolName))
    const matchesQuery = !annotationPanelQuery.trim()
      || `${toolName} ${label}`.toLowerCase().includes(annotationPanelQuery.trim().toLowerCase())
    return matchesTab && matchesQuery
  })
  const selectAnnotationFromPanel = (annotationUid: string) => {
    cornerstoneToolsModule?.annotation?.selection?.setAnnotationSelected?.(annotationUid)
    const selected = annotationState?.getAnnotation?.(annotationUid)
    const context = selected ? findAnnotationViewport(selected) : null
    context?.viewport?.render?.()
    renderingEngineRef.current?.render()
    setAnnotationPanelRevision((revision) => revision + 1)
  }
  const changeActiveViewport = (index: number) => {
    if (index !== activeViewportIndex) stopCine()
    setActiveViewportIndex(index)
  }

  if (!instance) {
    return null
  }

  return (
    <div ref={fullscreenRef} className="flex flex-col overflow-hidden bg-black text-white [&:fullscreen]:h-screen [&:fullscreen]:min-h-0" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex min-h-12 flex-wrap items-end gap-1 border-b border-slate-700 bg-black px-2 py-1" style={{ backgroundColor: '#000000' }}>
        <div className="mr-2 flex items-center gap-2 border-r border-slate-700 pr-3 rtl:mr-0 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-3">
          <span className="text-lg font-bold tracking-tight text-violet-400">BMS</span>
          <span className="text-sm font-semibold text-slate-200">DICOM Viewer</span>
        </div>
        <div className="flex flex-col gap-0.5 shrink-0 min-w-fit" role="group" aria-label="View tools">
          <span className="px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">View</span>
          <div className="flex items-center gap-0.5">
          {[{ name: 'WindowLevel', icon: SunMedium, label: t('imaging.windowLevel') }, { name: 'Pan', icon: Hand, label: t('imaging.pan') }, { name: 'Zoom', icon: ZoomIn, label: t('imaging.zoom') }, { name: 'Fit', icon: Maximize, label: t('imaging.fit'), onClick: handleFit }, { name: 'ActualSize', icon: null, label: t('imaging.actualSize'), onClick: handleActualSize }].map((tool) => {
            const Icon = tool.icon
            return <button key={tool.name} type="button" onClick={tool.onClick ?? (() => activateTool(tool.name))} title={tool.label} aria-pressed={activeTool === tool.name} className={`inline-flex h-8 w-8 items-center justify-center rounded border ${activeTool === tool.name ? 'border-violet-400 bg-violet-600 text-white' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}>{Icon ? <Icon size={15} /> : <span className="text-[10px] font-bold">1:1</span>}</button>
          })}
          <button type="button" onClick={handleZoomOut} title={t('imaging.zoomOut')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"><Minus size={15} /></button>
          <button type="button" onClick={handleZoomIn} title={t('imaging.zoomIn')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"><Plus size={15} /></button>
          <button type="button" onClick={resetWindowLevel} title={t('imaging.resetWindowLevel')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"><RefreshCw size={15} /></button>
          </div>
        </div>
        <div className="hidden h-6 w-px bg-slate-700 sm:block" />
        <div className="order-3 flex shrink-0 min-w-fit flex-col gap-0.5" role="group" aria-label="Annotation tools">
          <span className="px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">Measurements</span>
          <div className="flex items-center gap-0.5">
          {availableToolButtons.filter((tool) => tool.optional).map((tool) => {
            const Icon = tool.icon
            return <button key={tool.name} type="button" onClick={() => activateTool(tool.name)} title={tool.label} aria-pressed={activeTool === tool.name} className={`inline-flex h-8 w-8 items-center justify-center rounded border ${activeTool === tool.name ? 'border-violet-400 bg-violet-600 text-white' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}><Icon size={14} /></button>
          })}
          </div>
        </div>
        <div className="hidden h-6 w-px bg-slate-700 sm:block" />
        <div className="order-2 flex shrink-0 min-w-fit flex-col gap-0.5" role="group" aria-label="Transform tools">
          <span className="px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">Transform</span>
          <div className="flex items-center gap-0.5">
          {[{ icon: RotateCcw, label: t('imaging.rotateLeft'), onClick: () => rotate(-90) }, { icon: RotateCw, label: t('imaging.rotateRight'), onClick: () => rotate(90) }, { icon: FlipHorizontal2, label: t('imaging.flipHorizontal'), onClick: () => flip('horizontal') }, { icon: FlipVertical2, label: t('imaging.flipVertical'), onClick: () => flip('vertical') }, { icon: Contrast, label: t('imaging.invert'), onClick: toggleInvert }].map((tool) => <button key={tool.label} type="button" onClick={tool.onClick} title={tool.label} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"><tool.icon size={14} /></button>)}
          </div>
        </div>
        <div className="hidden h-6 w-px bg-slate-700 sm:block" />
        <div className="order-4 flex shrink-0 min-w-fit flex-col gap-0.5" role="group" aria-label="History tools">
          <span className="px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">History</span>
          <div className="flex items-center gap-0.5">
          <button type="button" onClick={handleUndo} title={t('imaging.undo')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"><Undo2 size={14} /></button>
          <button type="button" onClick={handleRedo} title={t('imaging.redo')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"><Redo2 size={14} /></button>
          <button type="button" onClick={handleDeleteAnnotation} title={t('imaging.deleteAnnotation')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-900 bg-red-950/40 text-red-400 hover:bg-red-950/70 hover:text-red-300"><Trash2 size={14} /></button>
          <button type="button" onClick={handleClearAnnotations} title={t('imaging.clearMeasurements')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-900 bg-red-950/40 text-red-400 hover:bg-red-950/70 hover:text-red-300"><Eraser size={14} /></button>
          </div>
        </div>
        <div className="order-5 ml-auto flex shrink-0 min-w-fit flex-col items-end gap-0.5 rtl:ml-0 rtl:mr-auto">
          <span className="px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">Viewer</span>
          <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded border border-slate-700 bg-slate-900 p-0.5" role="group" aria-label={t('imaging.layout')}>
            <LayoutGrid size={14} className="mx-1 text-slate-400" />
            {(['1x1', '1x2', '2x2'] as const).map((option) => <button key={option} type="button" onClick={() => setLayout(option)} aria-pressed={layout === option} className={`h-7 min-w-8 rounded px-1.5 text-[11px] font-semibold ${layout === option ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>{option.replace('x', ':')}</button>)}
          </div>
          <button type="button" onClick={resetView} title={t('imaging.reset')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void toggleFullscreen()} title={isFullscreen ? t('imaging.exitFullscreen') : t('imaging.fullscreen')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white">{isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}</button>
          </div>
        </div>
      </div>

      <div className={`grid min-h-0 flex-1 grid-cols-1 ${mainViewerGridClass}`}>
        <aside className="order-2 flex max-h-40 min-h-0 flex-col border-b border-slate-800 bg-black lg:order-1 lg:max-h-none lg:border-b-0 lg:border-r" style={{ backgroundColor: '#000000' }}>
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Series</span><span className="text-[10px] text-slate-500">{series.length}</span></div>
          <div className="flex gap-2 overflow-x-auto p-2 lg:flex-col lg:overflow-y-auto">
            {series.map((targetSeries, index) => <button key={targetSeries.id} type="button" onClick={() => { stopCine(); viewportGenerationRef.current[activeViewportIndex] += 1; setViewportAssignments((current) => current.map((value, viewportIndex) => viewportIndex === activeViewportIndex ? index : value)); if (activeViewportIndex === 0) onSeriesChange?.(index) }} aria-pressed={activeSeriesIndex === index} className={`flex min-w-[100px] shrink-0 flex-col gap-1 rounded border bg-slate-900 p-1 text-left transition lg:min-w-0 ${selectedSeriesIndex === index ? 'border-violet-500 ring-1 ring-violet-500/40' : 'border-slate-800 hover:border-violet-400'}`}>
              <div ref={(element) => registerThumbnailElement(`thumbnail-${targetSeries.id}`, element)} className="aspect-[4/3] w-full overflow-hidden rounded bg-black" aria-label={t('imaging.seriesX', { number: targetSeries.seriesNumber ?? index + 1 })} />
              <span className="truncate text-[10px] font-semibold text-slate-200">{targetSeries.seriesNumber ?? index + 1}. {targetSeries.seriesDescription || t('imaging.seriesX', { number: index + 1 })}</span>
              <span className="text-[10px] text-slate-400">{targetSeries.instances.length} {t('imaging.instance')}</span>
            </button>)}
          </div>
        </aside>

        <main ref={diagnosticAreaRef} className="order-1 flex min-h-0 min-w-0 flex-col lg:order-2" style={{ backgroundColor: '#000000' }}>
          <div className="relative min-h-0 min-w-0 flex-1" style={{ backgroundColor: '#000000' }}>
            <div className={`grid h-full ${gridClass}`} style={{ backgroundColor: '#000000', gap: '0px' }}>
              {Array.from({ length: viewportCount }, (_, index) => <div key={index} ref={viewportRefCallbacks[index]} onClick={() => changeActiveViewport(index)} className={`relative min-h-0 overflow-hidden ${activeViewportIndex === index ? 'ring-2 ring-inset ring-violet-500' : ''}`} style={{ backgroundColor: '#000000' }}>
                {showMetadata && <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[90%] rounded bg-black/65 px-2 py-1 text-[11px] leading-4 text-white"><div>{study?.accessionNumber || t('imaging.study')}</div><div>{series[viewportStates[index]?.seriesIndex ?? viewportAssignments[index] ?? 0]?.seriesDescription || t('imaging.seriesX', { number: (viewportStates[index]?.seriesIndex ?? viewportAssignments[index] ?? 0) + 1 })}</div><div>{t('imaging.instance')} {(viewportStates[index]?.instanceIndex ?? 0) + 1}</div></div>}
                {viewportStates[index]?.status === 'loading' && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 text-sm text-slate-600">{t('imaging.loadingImage')}</div>}
                {viewportStates[index]?.status === 'error' && <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50/90 p-4 text-center text-sm text-red-700">{viewportStates[index]?.errorMessage || t('imaging.unableToLoadImage')}</div>}
                {index > 0 && series.length > 0 && <select value={viewportAssignments[index] ?? selectedSeriesIndex} onChange={(event) => { stopCine(); viewportGenerationRef.current[index] += 1; setViewportAssignments((current) => { const next = [...current]; next[index] = Number(event.target.value); return next }) }} onClick={(event) => event.stopPropagation()} className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded border border-white/40 bg-black/70 px-2 py-1 text-xs text-white" aria-label={t('imaging.assignSeries')}>{series.map((targetSeries, seriesIndex) => <option key={targetSeries.id} value={seriesIndex}>{targetSeries.seriesDescription || t('imaging.seriesX', { number: seriesIndex + 1 })}</option>)}</select>}
              </div>)}
            </div>
          </div>
          <div className="flex min-h-14 flex-wrap items-center gap-2 border-t border-slate-800 bg-black px-3 py-2 text-white" style={{ backgroundColor: '#000000' }}>
            <button type="button" onClick={handlePrevious} disabled={activeState.instanceIndex <= 0} title={t('imaging.previous')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"><ChevronLeft size={15} /></button>
            <span className="min-w-20 text-center text-xs text-slate-400">{instanceIndex} / {totalInstances}</span>
            <button type="button" onClick={handleNext} disabled={activeState.instanceIndex >= activeInstances.length - 1} title={t('imaging.next')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"><ChevronRight size={15} /></button>
            {isMultiFrame && numberOfFrames > 1 && <><button type="button" onClick={handlePreviousFrame} disabled={currentFrameIndex === 0} title={t('imaging.previousFrame')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"><ChevronLeft size={13} /></button><button type="button" onClick={cinePlaying ? handlePauseCine : handlePlayCine} title={cinePlaying ? t('imaging.pause') : t('imaging.play')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-violet-500 bg-violet-600 text-white">{cinePlaying ? <span className="text-xs">||</span> : <span className="text-xs">▶</span>}</button><button type="button" onClick={handleNextFrame} disabled={currentFrameIndex >= numberOfFrames - 1} title={t('imaging.nextFrame')} className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"><ChevronRight size={13} /></button><span className="text-xs text-slate-400">{currentFrameIndex + 1} / {numberOfFrames}</span><input type="range" min="0" max={numberOfFrames - 1} value={currentFrameIndex} onChange={(event) => { stopCine(); updateState(activeViewportIndex, { currentFrameIndex: Number(event.target.value) }) }} aria-label={t('imaging.frame')} className="min-w-[120px] flex-1 accent-violet-500" /><label className="flex items-center gap-1 text-[10px] text-slate-500">FPS<select value={cineFps} onChange={(event) => setCineFps(Number(event.target.value))} className="rounded border border-slate-700 bg-slate-900 px-1 py-1 text-xs text-white">{[5, 10, 15, 20, 25, 30].map((fps) => <option key={fps} value={fps}>{fps}</option>)}</select></label></>}
          </div>
        </main>

        <aside className={`order-3 flex min-h-[320px] min-w-0 flex-col border-t border-slate-800 bg-black transition-all duration-200 lg:border-l lg:border-t-0 ${isAnnotationsExpanded ? 'lg:w-auto' : 'lg:w-[72px]'}`} style={{ backgroundColor: '#000000' }}>
          {isAnnotationsExpanded ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-3"><div><h2 className="text-sm font-semibold text-slate-100">Measurements &amp; Annotations</h2><span className="text-[11px] text-slate-500">{annotationPanelAnnotations.length} visible</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => setIsAnnotationsExpanded(false)} title="Collapse annotations" className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronRight size={14} /></button><button type="button" onClick={handleClearAnnotations} title={t('imaging.clearMeasurements')} className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-900 bg-red-950/40 text-red-400 hover:bg-red-950/70 hover:text-red-300"><Trash2 size={14} /></button></div></div>
              <div className="border-b border-slate-800 p-2"><input value={annotationPanelQuery} onChange={(event) => setAnnotationPanelQuery(event.target.value)} placeholder="Search annotations..." className="h-8 w-full rounded border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30" /><div className="mt-2 flex gap-1">{([['all', 'All'], ['measurements', 'Measurements'], ['text', 'Text']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setAnnotationPanelTab(tab)} className={`flex-1 rounded px-1 py-1.5 text-[10px] font-semibold ${annotationPanelTab === tab ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>{label}</button>)}</div></div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {annotationPanelAnnotations.length === 0 && <div className="p-4 text-center text-xs text-slate-500">No annotations</div>}
                {annotationPanelAnnotations.map((annotation: any) => { const uid = annotation.annotationUID; const selected = cornerstoneToolsModule?.annotation?.selection?.isAnnotationSelected?.(uid); const label = annotation.data?.label || annotation.metadata?.toolName || 'Annotation'; const stats = Object.values(annotation.data?.cachedStats ?? {})[0] as any; const measurement = stats?.length ?? stats?.area ?? stats?.mean; return <div key={uid} className={`border-b border-slate-800/50 border-l-2 p-3 ${selected ? 'border-l-violet-500 bg-violet-950/20' : 'border-l-transparent'}`}><button type="button" onClick={() => selectAnnotationFromPanel(uid)} className="w-full text-left"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-slate-200">{label}</span><span className="shrink-0 text-[10px] text-slate-500">{annotation.metadata?.toolName}</span></div>{measurement !== undefined && <div className="mt-1 text-xs text-slate-300">{Array.isArray(measurement) ? measurement.join(' × ') : String(measurement)}</div>}<div className="mt-1 text-[10px] text-slate-500">{study?.accessionNumber || t('imaging.study')} · {t('imaging.instance')} {instanceIndex}</div></button><div className="mt-2 flex justify-end"><button type="button" onClick={() => { selectAnnotationFromPanel(uid); handleDeleteAnnotation() }} title={t('imaging.deleteAnnotation')} className="inline-flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-red-950/40"><Trash2 size={13} /></button></div></div> })}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-start gap-2 border-l border-slate-800 bg-[#0b0f14] p-2">
              <button type="button" onClick={() => setIsAnnotationsExpanded(true)} title="Expand annotations" className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"><ChevronLeft size={14} /></button>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">Measure</div>
            </div>
          )}
        </aside>
      </div>
      <div className="flex min-h-9 items-center justify-between gap-3 border-t border-slate-800 bg-black px-3 text-[11px] text-slate-500" style={{ backgroundColor: '#000000' }}><span>Study: {study?.accessionNumber || '—'}</span><span className="truncate">{series[activeState.seriesIndex]?.seriesDescription || t('imaging.seriesX', { number: activeState.seriesIndex + 1 })}</span><span>Instance {instanceIndex} / {totalInstances}{isMultiFrame ? ` · Frame ${currentFrameIndex + 1} / ${numberOfFrames}` : ''}</span></div>
    </div>
  )
}

export default DicomViewer
