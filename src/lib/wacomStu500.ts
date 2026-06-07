type InkThreshold = {
  onPressureMark: number
  offPressureMark: number
}

type Capability = {
  screenWidth: number
  screenHeight: number
  tabletMaxX: number
  tabletMaxY: number
  encodingFlag: number
}

type Information = {
  modelName?: string
}

type UsbDevice = {
  idVendor: number
  idProduct: number
}

type ProductId = {
  ProductId_300: number
  ProductId_430: number
  ProductId_520A: number
  ProductId_530: number
  ProductId_540: number
}

type Protocol = {
  InkingMode: {
    InkingMode_Off: number
    InkingMode_On: number
  }
  EncodingFlag: {
    EncodingFlag_24bit: number
    EncodingFlag_16bit: number
  }
  EncodingMode: {
    EncodingMode_24bit_Bulk: number
    EncodingMode_24bit: number
    EncodingMode_16bit_Bulk: number
    EncodingMode_16bit: number
    EncodingMode_1bit: number
  }
  ReportId: {
    ReportId_PenDataOptionMode: number
  }
  PenDataOptionMode: {
    PenDataOptionMode_None: number
    PenDataOptionMode_TimeCount: number
    PenDataOptionMode_TimeCountSequence: number
  }
}

type PenData = {
  x: number
  y: number
  pressure: number
}

type ReportPenDataEncrypted = {
  penData: [PenData, PenData]
}

type ImageDataLike = {
  remove?: () => Promise<unknown>
}

type ConnectResult = {
  value?: number
}

type StUInterface = {
  Constructor: () => Promise<unknown>
  connect: (device: UsbDevice, exclusive: boolean) => Promise<ConnectResult>
  disconnect?: () => Promise<unknown>
}

type Tablet = {
  Constructor: (intf: StUInterface, encH?: unknown, encH2?: unknown) => Promise<unknown>
  getInkThreshold: () => Promise<InkThreshold>
  getCapability: () => Promise<Capability>
  getInformation: () => Promise<Information>
  getProductId: () => Promise<number>
  supportsWrite: () => Promise<boolean>
  setClearScreen: () => Promise<unknown>
  writeImage: (encodingMode: number, imageData: unknown) => Promise<unknown>
  setInkingMode: (mode: number) => Promise<unknown>
  isSupported: (reportId: number) => Promise<boolean>
  setPenDataOptionMode: (mode: number) => Promise<unknown>
  endCapture: () => Promise<unknown>
  disconnect: () => Promise<unknown>
}

type ReportHandler = {
  onReportPenData?: (report: PenData) => void
  onReportPenDataOption?: (report: PenData) => void
  onReportPenDataTimeCountSequence?: (report: PenData) => void
  onReportPenDataEncrypted?: (report: ReportPenDataEncrypted) => void
  onReportPenDataEncryptedOption?: (report: ReportPenDataEncrypted) => void
  onReportPenDataTimeCountSequenceEncrypted?: (report: PenData) => void
  onReportDevicePublicKey?: (report: unknown) => void
  onReportEncryptionStatus?: (report: unknown) => void
  decrypt?: (report: unknown) => void
  startReporting: (tablet: Tablet, usePolling: boolean) => Promise<unknown>
  stopReporting?: () => Promise<unknown>
}

type StuNamespace = {
  getUsbDevices: () => Promise<UsbDevice[]>
  isSupportedUsbDevice: (idVendor: number, idProduct: number) => Promise<boolean>
  UsbInterface: new () => StUInterface
  Tablet: new () => Tablet
  Protocol: new () => Protocol
  ProductId: ProductId
  ProtocolHelper: {
    ReportHandler: new () => ReportHandler
    simulateEncodingFlag: (productId: number, encodingFlag: number) => Promise<number>
    resizeAndFlatten: (
      image: string,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      width: number,
      height: number,
      encodingMode: number,
      threshold: number,
      useColor: boolean,
      background: number,
      clip: boolean
    ) => Promise<ImageDataLike>
  }
}

export type WacomRoot = {
  STU: StuNamespace
}

export type WacomUiBridge = {
  createModalWindow: (message?: string) => void
  setStatus: (message: string) => void
  closeModalWindow: () => void
}

type Point = {
  x: number
  y: number
}

type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}

type Button = {
  bounds: Rectangle
  text: string
  click: () => void
}

export type WacomDemoContext = {
  ui: WacomUiBridge
  stu: StuNamespace
  signatureCanvas: HTMLCanvasElement
  signatureCtx: CanvasRenderingContext2D
  displayCanvas: HTMLCanvasElement
  displayCtx: CanvasRenderingContext2D
  intf: StUInterface | null
  tablet: Tablet | null
  capability: Capability
  reportHandler: ReportHandler | null
  protocol: Protocol
  usbDevices: UsbDevice[]
  inkThreshold: InkThreshold
  encodingMode: number
  imageData: ImageDataLike | null
  penData: PenData[]
  buttons: Button[]
  clickBtn: number
  lastPoint: Point
  isDisconnected: boolean
  isDown: boolean
}

export type WacomSession = {
  disconnect: () => Promise<void>
  close: () => Promise<void>
}

const BTN_TEXT_CANCEL = 'Cancel'
const BTN_TEXT_CLEAR = 'Clear'
const BTN_TEXT_OK = 'OK'

const containsPoint = (rect: Rectangle, point: Point) => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

const clearCanvas = (inCanvas: HTMLCanvasElement, inCtx: CanvasRenderingContext2D) => {
  inCtx.save()
  inCtx.setTransform(1, 0, 0, 1, 0, 0)
  inCtx.fillStyle = 'white'
  inCtx.fillRect(0, 0, inCanvas.width, inCanvas.height)
  inCtx.restore()
}

const distance = (a: Point, b: Point) => {
  return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)
}

const computeIsDown = (ctx: WacomDemoContext, pressure: number) => {
  return ctx.isDown
    ? !(pressure <= ctx.inkThreshold.offPressureMark)
    : pressure > ctx.inkThreshold.onPressureMark
}

const connectTablet = async (stu: StuNamespace) => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const usbDevices = await stu.getUsbDevices()

  if (!usbDevices.length) {
    throw new Error('No STU devices found')
  }

  const intf = new stu.UsbInterface()
  await intf.Constructor()

  const connectMessage = await intf.connect(usbDevices[0], true)

  if (typeof connectMessage?.value === 'number' &&
      connectMessage.value !== 0) {
    throw new Error("can't connect")
  }

  const tablet = new stu.Tablet()
  await tablet.Constructor(intf)

  return { intf, tablet, usbDevices }
}

export async function tabletDemo(
  WacomGSS: WacomRoot,
  ui: WacomUiBridge,
  signatureCanvas: HTMLCanvasElement
): Promise<WacomSession> {
  const stu = WacomGSS.STU
  const protocol = new stu.Protocol()

  const { intf, tablet, usbDevices } = await connectTablet(stu)

  const capability = await tablet.getCapability()
  const info = await tablet.getInformation()
  const productId = await tablet.getProductId()

  console.log('TABLET DEMO VERSION 777777')
  console.log('Model name', info.modelName ?? 'Unknown')
  console.log('Product ID', productId)

  const inkThreshold = await tablet.getInkThreshold()

  const displayCanvas = document.createElement('canvas')
  displayCanvas.width = capability.screenWidth
  displayCanvas.height = capability.screenHeight
  const displayCtx = displayCanvas.getContext('2d')
  if (!displayCtx) {
    throw new Error('Unable to initialize display canvas')
  }

  const signatureCtx = signatureCanvas.getContext('2d')
  if (!signatureCtx) {
    throw new Error('Unable to initialize signature canvas')
  }

  createModalWindowFromUi(ui, capability.screenWidth, capability.screenHeight)

  const encodingFlag = await stu.ProtocolHelper.simulateEncodingFlag(productId, capability.encodingFlag)

  let encodingMode = protocol.EncodingMode.EncodingMode_1bit
  if ((encodingFlag & protocol.EncodingFlag.EncodingFlag_24bit) !== 0) {
    const supportsWrite = await tablet.supportsWrite()
    encodingMode = supportsWrite
      ? protocol.EncodingMode.EncodingMode_24bit_Bulk
      : protocol.EncodingMode.EncodingMode_24bit
  } else if ((encodingFlag & protocol.EncodingFlag.EncodingFlag_16bit) !== 0) {
    const supportsWrite = await tablet.supportsWrite()
    encodingMode = supportsWrite
      ? protocol.EncodingMode.EncodingMode_16bit_Bulk
      : protocol.EncodingMode.EncodingMode_16bit
  }

  await tablet.setClearScreen()

  const supportsPenDataOption = await tablet.isSupported(protocol.ReportId.ReportId_PenDataOptionMode)
  if (supportsPenDataOption) {
    let penDataOptionMode = protocol.PenDataOptionMode.PenDataOptionMode_None

    switch (productId) {
      case stu.ProductId.ProductId_520A:
        penDataOptionMode = protocol.PenDataOptionMode.PenDataOptionMode_TimeCount
        break
      case stu.ProductId.ProductId_430:
      case stu.ProductId.ProductId_530:
      case stu.ProductId.ProductId_540:
        penDataOptionMode = protocol.PenDataOptionMode.PenDataOptionMode_TimeCountSequence
        break
      default:
        penDataOptionMode = protocol.PenDataOptionMode.PenDataOptionMode_None
        break
    }

    await tablet.setPenDataOptionMode(penDataOptionMode)
  }

  const ctx: WacomDemoContext = {
    ui,
    stu,
    signatureCanvas,
    signatureCtx,
    displayCanvas,
    displayCtx,
    intf,
    tablet,
    capability,
    reportHandler: null,
    protocol,
    usbDevices,
    inkThreshold,
    encodingMode,
    imageData: null,
    penData: [],
    buttons: [],
    clickBtn: -1,
    lastPoint: { x: 0, y: 0 },
    isDisconnected: false,
    isDown: false,
  }

  closeRef.current = () => close(ctx)

  clearCanvas(ctx.displayCanvas, ctx.displayCtx)
  clearCanvas(ctx.signatureCanvas, ctx.signatureCtx)
  ctx.signatureCtx.lineWidth = 1
  ctx.signatureCtx.strokeStyle = 'black'

  await addButtons(ctx)
  const canvasImage = ctx.displayCanvas.toDataURL('image/jpeg')

  ctx.imageData = await stu.ProtocolHelper.resizeAndFlatten(
    canvasImage,
    0,
    0,
    0,
    0,
    ctx.capability.screenWidth,
    ctx.capability.screenHeight,
    ctx.encodingMode,
    1,
    false,
    0,
    true
  )

  await tablet.writeImage(ctx.encodingMode, ctx.imageData)
  await tablet.setInkingMode(ctx.protocol.InkingMode.InkingMode_On)

  const reportHandler = new stu.ProtocolHelper.ReportHandler()
  ctx.reportHandler = reportHandler

  const penData = (report: PenData) => {
    if (processButtons(ctx, report, ctx.displayCanvas)) {
      processPoint(ctx, report, ctx.displayCanvas, ctx.displayCtx)
      ctx.penData.push(report)
    }
  }

  const penDataEncryptedOption = (report: ReportPenDataEncrypted) => {
    processButtons(ctx, report.penData[0], ctx.displayCanvas)
    processPoint(ctx, report.penData[0], ctx.displayCanvas, ctx.displayCtx)
    processButtons(ctx, report.penData[1], ctx.displayCanvas)
    processPoint(ctx, report.penData[1], ctx.displayCanvas, ctx.displayCtx)
    ctx.penData.push(report.penData[0], report.penData[1])
  }

  const log = (_report: unknown) => {
    return
  }

  const decrypted = (_report: unknown) => {
    return
  }

  reportHandler.onReportPenData = penData
  reportHandler.onReportPenDataOption = penData
  reportHandler.onReportPenDataTimeCountSequence = penData
  reportHandler.onReportPenDataEncrypted = penDataEncryptedOption
  reportHandler.onReportPenDataEncryptedOption = penDataEncryptedOption
  reportHandler.onReportPenDataTimeCountSequenceEncrypted = penData
  reportHandler.onReportDevicePublicKey = log
  reportHandler.onReportEncryptionStatus = log
  reportHandler.decrypt = decrypted

  await reportHandler.startReporting(tablet, true)

  return {
    disconnect: () => disconnect(ctx),
    close: () => close(ctx),
  }
}

export async function addButtons(ctx: WacomDemoContext) {
  const product300 = ctx.stu.ProductId.ProductId_300
  if (ctx.usbDevices[0].idProduct !== product300) {
    const w2 = Math.round(ctx.capability.screenWidth / 3)
    const w3 = Math.round(ctx.capability.screenWidth / 3)
    const w1 = ctx.capability.screenWidth - w2 - w3
    const y = Math.round(ctx.capability.screenHeight * 6 / 7)
    const h = ctx.capability.screenHeight - y

    ctx.buttons = [
      { bounds: { x: 0, y, width: w1, height: h }, text: BTN_TEXT_OK, click: () => btnOk_Click(ctx) },
      { bounds: { x: w1, y, width: w2, height: h }, text: BTN_TEXT_CLEAR, click: () => btnClear_Click(ctx) },
      { bounds: { x: w1 + w2, y, width: w3, height: h }, text: BTN_TEXT_CANCEL, click: () => btnCancel_Click(ctx) },
    ]
  } else {
    const x = Math.round(ctx.capability.screenWidth * 3 / 4)
    const w = ctx.capability.screenWidth - x
    const h2 = Math.round(ctx.capability.screenHeight / 3)
    const h3 = Math.round(ctx.capability.screenHeight / 3)
    const h1 = ctx.capability.screenHeight - h2 - h3

    ctx.buttons = [
      { bounds: { x, y: 0, width: w, height: h1 }, text: BTN_TEXT_OK, click: () => btnOk_Click(ctx) },
      { bounds: { x, y: h1, width: w, height: h2 }, text: BTN_TEXT_CLEAR, click: () => btnClear_Click(ctx) },
      { bounds: { x, y: h1 + h2, width: w, height: h3 }, text: BTN_TEXT_CANCEL, click: () => btnCancel_Click(ctx) },
    ]
  }

  clearCanvas(ctx.displayCanvas, ctx.displayCtx)
  drawButtons(ctx)
}

export function drawButtons(ctx: WacomDemoContext) {
  ctx.displayCtx.save()
  ctx.displayCtx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.displayCtx.beginPath()
  ctx.displayCtx.lineWidth = 1
  ctx.displayCtx.strokeStyle = 'black'
  ctx.displayCtx.font = '30px Arial'

  for (const btn of ctx.buttons) {
    ctx.displayCtx.fillStyle = 'lightgrey'
    ctx.displayCtx.fillRect(btn.bounds.x, btn.bounds.y, btn.bounds.width, btn.bounds.height)
    ctx.displayCtx.fillStyle = 'black'
    ctx.displayCtx.rect(btn.bounds.x, btn.bounds.y, btn.bounds.width, btn.bounds.height)

    const xPos = btn.bounds.x + ((btn.bounds.width / 2) - (ctx.displayCtx.measureText(btn.text).width / 2))
    let yOffset = 40
    if (ctx.usbDevices[0].idProduct === ctx.stu.ProductId.ProductId_300) {
      yOffset = 28
    } else if (ctx.usbDevices[0].idProduct === ctx.stu.ProductId.ProductId_430) {
      yOffset = 26
    }

    ctx.displayCtx.fillText(btn.text, xPos, btn.bounds.y + yOffset)
  }

  ctx.displayCtx.stroke()
  ctx.displayCtx.closePath()
  ctx.displayCtx.restore()
}

export async function clearScreen(ctx: WacomDemoContext) {
  clearCanvas(ctx.displayCanvas, ctx.displayCtx)
  drawButtons(ctx)
  ctx.penData = []

  const canvasImage = ctx.displayCanvas.toDataURL('image/jpeg')
  ctx.imageData = await ctx.stu.ProtocolHelper.resizeAndFlatten(
    canvasImage,
    0,
    0,
    0,
    0,
    ctx.capability.screenWidth,
    ctx.capability.screenHeight,
    ctx.encodingMode,
    1,
    false,
    0,
    true
  )

  if (ctx.tablet) {
    await ctx.tablet.writeImage(ctx.encodingMode, ctx.imageData)
  }
}

export function processButtons(ctx: WacomDemoContext, point: PenData, inCanvas: HTMLCanvasElement) {
  const nextPoint: Point = {
    x: Math.round(inCanvas.width * point.x / ctx.capability.tabletMaxX),
    y: Math.round(inCanvas.height * point.y / ctx.capability.tabletMaxY),
  }
  const isDown2 = computeIsDown(ctx, point.pressure)

  let btn = -1
  for (let i = 0; i < ctx.buttons.length; i += 1) {
    if (containsPoint(ctx.buttons[i].bounds, nextPoint)) {
      btn = i
      break
    }
  }

  if (ctx.isDown && !isDown2) {
    if (btn !== -1 && ctx.clickBtn === btn) {
      ctx.buttons[btn].click()
    }
    ctx.clickBtn = -1
  } else if (btn !== -1 && !ctx.isDown && isDown2) {
    ctx.clickBtn = btn
  }

  return btn === -1
}

export function processPoint(
  ctx: WacomDemoContext,
  point: PenData,
  inCanvas: HTMLCanvasElement,
  inCtx: CanvasRenderingContext2D
) {
  const nextPoint: Point = {
    x: Math.round(inCanvas.width * point.x / ctx.capability.tabletMaxX),
    y: Math.round(inCanvas.height * point.y / ctx.capability.tabletMaxY),
  }
  const isDown2 = computeIsDown(ctx, point.pressure)

  if (!ctx.isDown && isDown2) {
    ctx.lastPoint = nextPoint
  }

  if ((isDown2 && 10 < distance(ctx.lastPoint, nextPoint)) || (ctx.isDown && !isDown2)) {
    inCtx.beginPath()
    inCtx.moveTo(ctx.lastPoint.x, ctx.lastPoint.y)
    inCtx.lineTo(nextPoint.x, nextPoint.y)
    inCtx.stroke()
    inCtx.closePath()
    ctx.lastPoint = nextPoint
  }

  ctx.isDown = isDown2
}

export function generateImage(ctx: WacomDemoContext) {
  clearCanvas(ctx.signatureCanvas, ctx.signatureCtx)
  ctx.signatureCtx.lineWidth = 1
  ctx.signatureCtx.strokeStyle = 'black'
  ctx.lastPoint = { x: 0, y: 0 }
  ctx.isDown = false

  for (let i = 0; i < ctx.penData.length; i += 1) {
    processPoint(ctx, ctx.penData[i], ctx.signatureCanvas, ctx.signatureCtx)
  }

  window.dispatchEvent(
    new CustomEvent(
      'wacom-signature-captured',
      {
        detail: ctx.signatureCanvas.toDataURL('image/png'),
      }
    )
  )
}

export async function disconnect(ctx: WacomDemoContext) {
  if (ctx.isDisconnected) {
    return
  }

  ctx.isDisconnected = true

  if (ctx.tablet) {
    try {
      await ctx.tablet.setInkingMode(ctx.protocol.InkingMode.InkingMode_Off)
      await ctx.tablet.endCapture()
      if (ctx.imageData?.remove) {
        await ctx.imageData.remove()
      }
      ctx.imageData = null
      await ctx.tablet.setClearScreen()
      await ctx.tablet.disconnect()
      ctx.tablet = null
      clearCanvas(ctx.displayCanvas, ctx.displayCtx)
    } catch {
      // Ignore disconnect errors to avoid blocking close.
    }
  }

  if (ctx.intf?.disconnect) {
    try {
      await ctx.intf.disconnect()
    } catch {
      // Ignore interface disconnect errors.
    }
  }
  ctx.intf = null

  if (ctx.reportHandler?.stopReporting) {
    try {
      await ctx.reportHandler.stopReporting()
    } catch {
      // Ignore report handler stop errors.
    }
  }
  ctx.reportHandler = null

  ctx.ui.closeModalWindow()
}

export async function close(ctx: WacomDemoContext) {
  await disconnect(ctx)
}

export function createModalWindow(ctx: WacomDemoContext, message?: string) {
  ctx.ui.createModalWindow(message)
}

const createModalWindowFromUi = (ui: WacomUiBridge, _width: number, _height: number) => {
  ui.createModalWindow('Please sign on your Wacom device and press OK.')
}

const btnOk_Click = (ctx: WacomDemoContext) => {
  generateImage(ctx)
  void close(ctx)
}

const btnCancel_Click = (ctx: WacomDemoContext) => {
  void close(ctx)
}

const btnClear_Click = (ctx: WacomDemoContext) => {
  void clearScreen(ctx)
}

const closeRef: { current: (() => Promise<void>) | null } = {
  current: null,
}
