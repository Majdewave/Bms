export const MAX_REFERRAL_SCAN_BYTES = 550 * 1024
export const MAX_REFERRAL_PDF_BYTES = 700 * 1024
export const MAX_REFERRAL_SCAN_DIMENSION = 2000
export const MIN_REFERRAL_SCAN_DIMENSION = 1600

const JPEG_QUALITIES = [0.8, 0.77, 0.74, 0.72]
const A4_WIDTH_POINTS = 595.28
const A4_HEIGHT_POINTS = 841.89

export interface NormalizedReferralScan {
  jpeg: Blob
  width: number
  height: number
}

export class ReferralScanNormalizationError extends Error {
  constructor(readonly reason: 'too-large' | 'encoding-failed') {
    super(reason === 'too-large' ? 'Referral scan exceeds the size target.' : 'Referral scan could not be encoded.')
    this.name = 'ReferralScanNormalizationError'
  }
}

export async function normalizeReferralScan(source: HTMLCanvasElement): Promise<NormalizedReferralScan> {
  if (!source.width || !source.height) {
    throw new ReferralScanNormalizationError('encoding-failed')
  }

  const sourceLongEdge = Math.max(source.width, source.height)
  const initialScale = Math.min(1, MAX_REFERRAL_SCAN_DIMENSION / sourceLongEdge)
  let width = Math.max(1, Math.round(source.width * initialScale))
  let height = Math.max(1, Math.round(source.height * initialScale))

  while (true) {
    for (const quality of JPEG_QUALITIES) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) {
        throw new ReferralScanNormalizationError('encoding-failed')
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(source, 0, 0, width, height)

      const jpeg = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result)
            else reject(new ReferralScanNormalizationError('encoding-failed'))
          },
          'image/jpeg',
          quality,
        )
      })

      if (jpeg.size <= MAX_REFERRAL_SCAN_BYTES) {
        return { jpeg, width, height }
      }
    }

    const longEdge = Math.max(width, height)
    if (longEdge <= MIN_REFERRAL_SCAN_DIMENSION) {
      break
    }

    const scale = Math.max(0.9, MIN_REFERRAL_SCAN_DIMENSION / longEdge)
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))
  }

  throw new ReferralScanNormalizationError('too-large')
}

export async function createReferralScanPdf(scan: NormalizedReferralScan): Promise<Blob> {
  if (scan.jpeg.type !== 'image/jpeg' || !scan.width || !scan.height) {
    throw new ReferralScanNormalizationError('encoding-failed')
  }

  const jpegBytes = new Uint8Array(await scan.jpeg.arrayBuffer())
  const scale = Math.min(
    A4_WIDTH_POINTS / scan.width,
    A4_HEIGHT_POINTS / scan.height,
  )
  const imageWidth = Number((scan.width * scale).toFixed(3))
  const imageHeight = Number((scan.height * scale).toFixed(3))
  const imageX = Number(((A4_WIDTH_POINTS - imageWidth) / 2).toFixed(3))
  const imageY = Number(((A4_HEIGHT_POINTS - imageHeight) / 2).toFixed(3))
  const content = asciiBytes(
    `q\n${imageWidth} 0 0 ${imageHeight} ${imageX} ${imageY} cm\n/Scan Do\nQ\n`,
  )
  const header = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])
  const chunks: Uint8Array[] = [header]
  const offsets = [0, 0, 0, 0, 0, 0]
  let offset = header.length

  const append = (bytes: Uint8Array) => {
    chunks.push(bytes)
    offset += bytes.length
  }
  const addObject = (number: number, parts: Uint8Array[]) => {
    offsets[number] = offset
    for (const part of parts) append(part)
  }

  addObject(1, [asciiBytes('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')])
  addObject(2, [asciiBytes('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')])
  addObject(3, [asciiBytes(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_POINTS} ${A4_HEIGHT_POINTS}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Scan 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
  )])
  addObject(4, [
    asciiBytes(`4 0 obj\n<< /Length ${content.length} >>\nstream\n`),
    content,
    asciiBytes('endstream\nendobj\n'),
  ])
  addObject(5, [
    asciiBytes(
      `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${scan.width} /Height ${scan.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    ),
    jpegBytes,
    asciiBytes('\nendstream\nendobj\n'),
  ])

  const xrefOffset = offset
  const xref = [
    'xref\n0 6\n',
    '0000000000 65535 f \n',
    ...offsets.slice(1).map((objectOffset) => `${String(objectOffset).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join('')
  append(asciiBytes(xref))

  const pdfBytes = new Uint8Array(offset)
  let cursor = 0
  for (const chunk of chunks) {
    pdfBytes.set(chunk, cursor)
    cursor += chunk.length
  }

  if (pdfBytes.length > MAX_REFERRAL_PDF_BYTES) {
    throw new ReferralScanNormalizationError('too-large')
  }

  return new Blob([pdfBytes], { type: 'application/pdf' })
}

export function createReferralScanPdfFile(pdf: Blob): File {
  if (pdf.type !== 'application/pdf' || pdf.size > MAX_REFERRAL_PDF_BYTES) {
    throw new ReferralScanNormalizationError('encoding-failed')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return new File([pdf], `referral-scan-${timestamp}.pdf`, {
    type: 'application/pdf',
    lastModified: Date.now(),
  })
}

function asciiBytes(value: string): Uint8Array {
  return Uint8Array.from(value, (character) => character.charCodeAt(0))
}
