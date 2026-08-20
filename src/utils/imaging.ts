import type { TFunction } from 'i18next'

const modularityLabelKeys: Record<string, string> = {
  US: 'imaging.modalityUs',
  DX: 'imaging.modalityDx',
  CR: 'imaging.modalityCr',
  CT: 'imaging.modalityCt',
  MR: 'imaging.modalityMr',
  MG: 'imaging.modalityMg',
  XA: 'imaging.modalityXa',
  RF: 'imaging.modalityRf',
  NM: 'imaging.modalityNm',
  PT: 'imaging.modalityPt',
  SC: 'imaging.modalitySc',
  OT: 'imaging.modalityOt',
  IO: 'imaging.modalityIo',
  ECG: 'imaging.modalityEcg',
}

export const getImagingModalityLabel = (modality?: string | null, t?: TFunction): string => {
  const normalized = String(modality ?? '').trim().toUpperCase()

  if (!normalized) {
    return ''
  }

  const key = modularityLabelKeys[normalized]

  if (key && t) {
    return t(key)
  }

  return normalized
}
