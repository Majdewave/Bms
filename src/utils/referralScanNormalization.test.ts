// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createReferralScanPdf,
  createReferralScanPdfFile,
  MAX_REFERRAL_PDF_BYTES,
  MAX_REFERRAL_SCAN_BYTES,
  MAX_REFERRAL_SCAN_DIMENSION,
  MIN_REFERRAL_SCAN_DIMENSION,
  normalizeReferralScan,
  ReferralScanNormalizationError,
} from './referralScanNormalization'

const onePixelJpegBase64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/AKf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AEf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AEf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IT//2Q=='
const onePixelJpeg = Uint8Array.from(atob(onePixelJpegBase64), (character) =>
  character.charCodeAt(0),
)

describe('normalizeReferralScan', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps a small scan at its original dimensions and does not upscale it', async () => {
    let encodedDimensions: [number, number] | undefined
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) {
      encodedDimensions = [this.width, this.height]
      callback(new Blob([onePixelJpeg], { type: 'image/jpeg' }))
    })

    const source = document.createElement('canvas')
    source.width = 800
    source.height = 600

    const result = await normalizeReferralScan(source)

    expect(result.jpeg.size).toBe(onePixelJpeg.length)
    expect(encodedDimensions).toEqual([800, 600])
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(1)
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.8,
    )
  })

  it('reduces large scans to the JPEG target while preserving aspect ratio', async () => {
    const attemptedSizes: Array<[number, number, number]> = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, _type, quality) {
      attemptedSizes.push([this.width, this.height, quality ?? 0])
      const size = Math.ceil(this.width * this.height * (quality ?? 0) * 0.35)
      const payload = new Uint8Array(size)
      payload.set([0xff, 0xd8], 0)
      payload.set([0xff, 0xd9], size - 2)
      callback(new Blob([payload], { type: 'image/jpeg' }))
    })

    const source = document.createElement('canvas')
    source.width = 4000
    source.height = 3000

    const result = await normalizeReferralScan(source)
    const pdf = await createReferralScanPdf(result)
    const [outputWidth, outputHeight] = attemptedSizes[attemptedSizes.length - 1]

    expect(result.jpeg.size).toBe(551_124)
    expect(result.jpeg.size).toBeLessThanOrEqual(MAX_REFERRAL_SCAN_BYTES)
    expect(pdf.type).toBe('application/pdf')
    expect(pdf.size).toBeLessThanOrEqual(MAX_REFERRAL_PDF_BYTES)
    expect(pdf.size).toBeGreaterThan(result.jpeg.size)
    expect(outputWidth).toBe(1620)
    expect(outputHeight).toBe(1215)
    expect(outputWidth).toBeLessThanOrEqual(MAX_REFERRAL_SCAN_DIMENSION)
    expect(outputWidth / outputHeight).toBeCloseTo(source.width / source.height, 2)
    expect(attemptedSizes.some(([width, height]) => width === 2000 && height === 1500)).toBe(true)
  })

  it('fails instead of compressing below the readable resolution floor', async () => {
    const attemptedSizes: Array<[number, number]> = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) {
      attemptedSizes.push([this.width, this.height])
      callback(new Blob([new Uint8Array(2 * 1024 * 1024)], { type: 'image/jpeg' }))
    })

    const source = document.createElement('canvas')
    source.width = 4000
    source.height = 4000

    await expect(normalizeReferralScan(source)).rejects.toMatchObject({
      name: 'ReferralScanNormalizationError',
      reason: 'too-large',
    } satisfies Partial<ReferralScanNormalizationError>)
    expect(Math.max(...attemptedSizes[attemptedSizes.length - 1])).toBe(
      MIN_REFERRAL_SCAN_DIMENSION,
    )
  })
})

describe('createReferralScanPdf', () => {
  it('creates a valid one-page A4 PDF, embeds the JPEG bytes unchanged, and keeps the image uncropped', async () => {
    const jpeg = new Blob([onePixelJpeg], { type: 'image/jpeg' })
    const pdf = await createReferralScanPdf({ jpeg, width: 1, height: 1 })
    const bytes = new Uint8Array(await pdf.arrayBuffer())
    const text = new TextDecoder().decode(bytes)

    expect(pdf.type).toBe('application/pdf')
    expect(pdf.size).toBeLessThanOrEqual(MAX_REFERRAL_PDF_BYTES)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]')
    expect(text).toContain('/Subtype /Image')
    expect(text).toContain('/Filter /DCTDecode')
    expect(text).toMatch(/\/Width 1 \/Height 1/)
    expect(text).toContain('startxref')

    const startXref = Number(text.match(/startxref\n(\d+)\n%%EOF/)?.[1])
    expect(new TextDecoder().decode(bytes.slice(startXref, startXref + 4))).toBe('xref')

    const imageIndex = indexOfBytes(bytes, onePixelJpeg)
    expect(imageIndex).toBeGreaterThan(-1)
    expect(Array.from(bytes.slice(imageIndex, imageIndex + onePixelJpeg.length))).toEqual(
      Array.from(onePixelJpeg),
    )

    const transform = text.match(/q\n([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm\n\/Scan Do\nQ/)
    expect(transform).not.toBeNull()
    const [, drawnWidthText, drawnHeightText, xText, yText] = transform!
    const drawnWidth = Number(drawnWidthText)
    const drawnHeight = Number(drawnHeightText)
    const x = Number(xText)
    const y = Number(yText)
    expect(drawnWidth / drawnHeight).toBeCloseTo(1, 2)
    expect(x).toBeGreaterThanOrEqual(0)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(x + drawnWidth).toBeLessThanOrEqual(595.28)
    expect(y + drawnHeight).toBeLessThanOrEqual(841.89)
  })

  it('creates an application/pdf file with a PDF filename', async () => {
    const pdf = await createReferralScanPdf({
      jpeg: new Blob([onePixelJpeg], { type: 'image/jpeg' }),
      width: 1,
      height: 1,
    })

    const file = createReferralScanPdfFile(pdf)

    expect(file.type).toBe('application/pdf')
    expect(file.name).toMatch(/^referral-scan-.+\.pdf$/)
    expect(file.size).toBe(pdf.size)
  })
})

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) continue outer
    }
    return index
  }
  return -1
}
