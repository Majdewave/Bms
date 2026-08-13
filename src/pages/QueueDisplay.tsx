import { memo, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Activity, Clock3, UserRound, Wifi, WifiOff, ImageOff, BadgeCheck } from 'lucide-react'
import { QueueDisplayTheme, queueDisplayApi, type QueueDisplayAdvertisementImage, type QueueDisplayData } from '@/api/queueDisplay'

type QueueThemeStyle = {
  pageGradient: string
  pageOverlay: string
  shell: string
  card: string
  chip: string
  mutedText: string
  dimText: string
  titleText: string
  ring: string
  accent: string
  adPlaceholder: string
  shadow: string
  panel: string
  heroPanel: string
  secondaryPanel: string
}

const themeStyles: Record<number, QueueThemeStyle> = {
  [QueueDisplayTheme.Default]: {
    pageGradient: 'from-white via-white to-white',
    pageOverlay: '',
    shell: 'border-slate-200 bg-white/90 backdrop-blur-xl',
    card: 'border-slate-200 bg-white',
    chip: 'border-slate-200 bg-white',
    mutedText: 'text-slate-500',
    dimText: 'text-slate-400',
    titleText: 'text-slate-900',
    ring: 'ring-primary-500/25',
    accent: 'bg-primary-500',
    adPlaceholder: 'border-slate-200 bg-slate-50 text-slate-600',
    shadow: 'shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
    panel: 'border-slate-200 bg-white backdrop-blur-2xl',
    heroPanel: 'border-primary-200 bg-white backdrop-blur-2xl',
    secondaryPanel: 'border-slate-200 bg-white backdrop-blur-xl',
  },
  [QueueDisplayTheme.Light]: {
    pageGradient: 'from-white via-white to-white',
    pageOverlay: '',
    shell: 'border-slate-200 bg-white/90 backdrop-blur-xl',
    card: 'border-slate-200 bg-white',
    chip: 'border-slate-200 bg-white',
    mutedText: 'text-slate-500',
    dimText: 'text-slate-400',
    titleText: 'text-slate-900',
    ring: 'ring-primary-500/25',
    accent: 'bg-primary-500',
    adPlaceholder: 'border-slate-200 bg-slate-50 text-slate-600',
    shadow: 'shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
    panel: 'border-slate-200 bg-white backdrop-blur-2xl',
    heroPanel: 'border-primary-200 bg-white backdrop-blur-2xl',
    secondaryPanel: 'border-slate-200 bg-white backdrop-blur-xl',
  },
  [QueueDisplayTheme.Dark]: {
    pageGradient: 'from-white via-white to-white',
    pageOverlay: '',
    shell: 'border-slate-200 bg-white/90 backdrop-blur-xl',
    card: 'border-slate-200 bg-white',
    chip: 'border-slate-200 bg-white',
    mutedText: 'text-slate-500',
    dimText: 'text-slate-400',
    titleText: 'text-slate-900',
    ring: 'ring-primary-500/25',
    accent: 'bg-primary-500',
    adPlaceholder: 'border-slate-200 bg-slate-50 text-slate-600',
    shadow: 'shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
    panel: 'border-slate-200 bg-white backdrop-blur-2xl',
    heroPanel: 'border-primary-200 bg-white backdrop-blur-2xl',
    secondaryPanel: 'border-slate-200 bg-white backdrop-blur-xl',
  },
  [QueueDisplayTheme.Blue]: {
    pageGradient: 'from-white via-white to-white',
    pageOverlay: '',
    shell: 'border-slate-200 bg-white/90 backdrop-blur-xl',
    card: 'border-slate-200 bg-white',
    chip: 'border-slate-200 bg-white',
    mutedText: 'text-slate-500',
    dimText: 'text-slate-400',
    titleText: 'text-slate-900',
    ring: 'ring-primary-500/25',
    accent: 'bg-primary-500',
    adPlaceholder: 'border-slate-200 bg-slate-50 text-slate-600',
    shadow: 'shadow-[0_10px_30px_rgba(15,23,42,0.06)]',
    panel: 'border-slate-200 bg-white backdrop-blur-2xl',
    heroPanel: 'border-primary-200 bg-white backdrop-blur-2xl',
    secondaryPanel: 'border-slate-200 bg-white backdrop-blur-xl',
  },
}

type AdvertisementPanelProps = {
  title: string
  logoUrl: string | null
  advertisementImages: QueueDisplayAdvertisementImage[]
  advertisementSignature: string
  titleTextClass: string
  dimTextClass: string
  adPlaceholderClass: string
}

const AdvertisementPanel = memo(function AdvertisementPanel({
  title,
  logoUrl,
  advertisementImages,
  advertisementSignature,
  titleTextClass,
  dimTextClass,
  adPlaceholderClass,
}: AdvertisementPanelProps) {
  const { t } = useTranslation()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [isImageFading, setIsImageFading] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setFailedImages({})
    setLoadedImages({})
  }, [advertisementSignature])

  const visibleImages = useMemo(
    () => advertisementImages.filter((image) => !failedImages[image.id]),
    [advertisementImages, failedImages],
  )

  useEffect(() => {
    if (visibleImages.length === 0) {
      setActiveImageIndex(0)
      return
    }

    setActiveImageIndex((previous) => Math.min(previous, visibleImages.length - 1))
  }, [visibleImages.length])

  useEffect(() => {
    if (visibleImages.length <= 1) {
      return
    }

    const intervalId = window.setInterval(() => {
      setIsImageFading(true)
      setActiveImageIndex((previous) => (previous + 1) % visibleImages.length)
      window.setTimeout(() => {
        setIsImageFading(false)
      }, 520)
    }, 10000)

    return () => window.clearInterval(intervalId)
  }, [visibleImages.length])

  useEffect(() => {
    if (visibleImages.length <= 1) {
      return
    }

    const nextIndex = (activeImageIndex + 1) % visibleImages.length
    const nextImage = visibleImages[nextIndex]
    if (!nextImage || loadedImages[nextImage.id]) {
      return
    }

    const preloadImage = new Image()
    preloadImage.src = nextImage.imageUrl
    preloadImage.onload = () => {
      setLoadedImages((previous) => ({
        ...previous,
        [nextImage.id]: true,
      }))
    }
  }, [activeImageIndex, visibleImages, loadedImages])

  return (
    <>
      <div className="px-4 pt-4 pb-3 md:px-5 md:pt-5">
        <p className={`text-xl font-semibold leading-tight md:text-[1.8rem] ${titleTextClass}`}>{title}</p>
      </div>
      <div className="min-h-0 flex-1 px-4 pb-4 md:px-5 md:pb-5">
        {visibleImages.length > 0 ? (
          <div className="relative h-[clamp(220px,34vh,520px)] w-full overflow-hidden rounded-[12px] border border-slate-200/80 bg-white p-3 md:p-4 xl:h-full xl:min-h-[320px]">
            <div className="relative h-full w-full overflow-hidden rounded-[8px] bg-white">
              {visibleImages.map((image, index) => {
                const isActive = index === activeImageIndex
                return (
                  <img
                    key={image.id}
                    src={image.imageUrl}
                    alt={title}
                    loading="eager"
                    onLoad={() => {
                      setLoadedImages((previous) => ({
                        ...previous,
                        [image.id]: true,
                      }))
                    }}
                    onError={() => {
                      setFailedImages((previous) => ({
                        ...previous,
                        [image.id]: true,
                      }))
                    }}
                    className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'} ${isImageFading && isActive ? 'animate-[qdAdFade_520ms_ease]' : ''}`}
                  />
                )
              })}
            </div>
          </div>
        ) : null}

        {visibleImages.length > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2" aria-label="Advertisement carousel pagination">
            {visibleImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${index === activeImageIndex ? 'bg-primary-600' : 'bg-slate-300'}`}
                aria-label={`Advertisement image ${index + 1}`}
              />
            ))}
          </div>
        ) : null}

        {visibleImages.length === 0 ? (
          <div className={`flex h-full min-h-[220px] w-full flex-col items-center justify-center rounded-[12px] border border-slate-200/80 ${adPlaceholderClass} px-8 text-center`}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Business logo"
                className="mb-5 h-20 w-20 rounded-[12px] bg-white object-cover shadow-sm md:h-24 md:w-24"
              />
            ) : (
              <ImageOff className="mb-5 h-11 w-11 opacity-70" />
            )}
            <p className={`text-lg font-semibold ${titleTextClass}`}>{t('queueDisplay.noAdvertisement')}</p>
            <p className={`mt-3 max-w-[24ch] text-sm ${dimTextClass}`}>{t('queueDisplay.noAdvertisementHint')}</p>
          </div>
        ) : null}
      </div>
    </>
  )
})

export default function QueueDisplayPage() {
  const { t, i18n } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<QueueDisplayData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'offline'>('offline')

  useEffect(() => {
    if (!token || connectionState === 'connected') {
      return
    }

    const intervalId = window.setInterval(async () => {
      try {
        const payload = await queueDisplayApi.getPublicDisplay(token)
        setData(payload)
        setError(null)
      } catch {
        setError('Unable to load queue display')
      }
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [connectionState, token])

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (!token) {
      setError('Missing display token')
      return
    }

    let isCancelled = false
    const connection = queueDisplayApi.createPublicConnection(token)

    const load = async () => {
      try {
        const payload = await queueDisplayApi.getPublicDisplay(token)
        if (!isCancelled) {
          setData(payload)
          setError(null)
        }
      } catch {
        if (!isCancelled) {
          setError('Unable to load queue display')
        }
      }
    }

    void load()

    connection.on('QueueDisplayUpdated', () => {
      void load()
    })

    connection.onreconnecting(() => {
      if (!isCancelled) {
        setConnectionState('reconnecting')
      }
    })

    connection.onreconnected(() => {
      if (!isCancelled) {
        setConnectionState('connected')
        void load()
      }
    })

    connection.onclose(() => {
      if (!isCancelled) {
        setConnectionState('offline')
      }
    })

    void connection
      .start()
      .then(() => {
        if (!isCancelled) {
          setConnectionState('connected')
          void load()
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setConnectionState('offline')
        }
      })

    return () => {
      isCancelled = true
      connection.stop().catch(() => {})
    }
  }, [token])

  const stylePack = useMemo(() => {
    const key = data?.theme ?? QueueDisplayTheme.Default
    return themeStyles[key] ?? themeStyles[QueueDisplayTheme.Default]
  }, [data?.theme])

  const locale = i18n.language || 'en'
  const isRtl = locale === 'he' || locale === 'ar'
  const waitingCount = data?.waitingCount ?? 0
  const hasCurrent = Boolean(data?.current)
  const hasNext = Boolean(data?.next)
  const connected = connectionState === 'connected'
  const cardMotionClass = 'transition-[transform,box-shadow,border-color,background-color] duration-500 ease-out'
  const waitingLabel = waitingCount === 1 ? t('queueDisplay.patientSingular') : t('queueDisplay.patientPlural')
  const connectionChipClass = connected
    ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-500'
    : stylePack.mutedText
  const localizedStatus = (status?: string | null) => {
    if (!status) {
      return null
    }

    return t(`appointments.status.${status.toLowerCase()}`, status)
  }
  const clampTwoLinesStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-xl">
          <h1 className="text-4xl font-bold">{t('queueDisplay.unavailableTitle')}</h1>
          <p className="mt-4 text-slate-300">{error}</p>
          <p className="mt-3 text-slate-400">{t('queueDisplay.unavailableHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)] p-3 md:p-5 lg:p-6 [font-family:'Plus_Jakarta_Sans','Manrope','Segoe_UI',sans-serif]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {stylePack.pageOverlay ? <div className={`pointer-events-none fixed inset-0 ${stylePack.pageOverlay}`} aria-hidden="true" /> : null}

      <style>{`
        @keyframes qdFadeRise {
          0% { opacity: 0; transform: translateY(6px) scale(0.995); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes qdAdFade {
          0% { opacity: 0.15; }
          100% { opacity: 1; }
        }
      `}</style>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1920px] flex-col gap-4 md:min-h-[calc(100vh-2.5rem)] md:gap-5">
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] xl:gap-5">
          <article className={`order-2 flex min-h-[220px] flex-col overflow-hidden rounded-[12px] border ${stylePack.panel} ${stylePack.shadow} ${cardMotionClass} xl:order-1 xl:min-h-0`}>
            <AdvertisementPanel
              title={t('queueDisplay.advertisementTitle')}
              logoUrl={data?.logoUrl ?? null}
              advertisementImages={data?.advertisementImages ?? []}
              advertisementSignature={(data?.advertisementImages ?? []).map((image) => image.id).join('|')}
              titleTextClass={stylePack.titleText}
              dimTextClass={stylePack.dimText}
              adPlaceholderClass={stylePack.adPlaceholder}
            />
          </article>

          <section className="order-1 flex min-h-0 flex-col gap-4 xl:order-2 xl:overflow-hidden">
            <header className={`rounded-[12px] border p-4 md:p-5 ${stylePack.shell} ${stylePack.shadow} ${cardMotionClass}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-center gap-3 md:gap-4">
                  {data?.logoUrl ? (
                    <img
                      src={data.logoUrl}
                      alt="Business logo"
                      className="h-12 w-12 rounded-xl object-cover bg-white shadow-sm md:h-16 md:w-16"
                    />
                  ) : (
                    <div className={`h-12 w-12 rounded-xl ${stylePack.card} border md:h-16 md:w-16`} />
                  )}
                  <div className="min-w-0">
                    <p className={`text-[10px] md:text-xs font-medium uppercase tracking-[0.34em] ${stylePack.mutedText}`}>{t('queueDisplay.liveQueue')}</p>
                    <h1 className={`mt-1 truncate text-[1.35rem] font-semibold tracking-tight md:text-[2rem] ${stylePack.titleText}`}>
                      {data?.businessName ?? t('queueDisplay.displayFallback')}
                    </h1>
                  </div>
                </div>

                <div className={`min-w-0 shrink-0 ${isRtl ? 'lg:text-left' : 'lg:text-right'}`}>
                  <p className={`text-sm md:text-base font-medium ${stylePack.mutedText}`}>{now.toLocaleDateString(locale)}</p>
                  <p className={`mt-1 text-[clamp(1.75rem,2.6vw,3rem)] font-semibold tabular-nums ${stylePack.titleText}`}>
                    {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm ${stylePack.mutedText}`}>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${stylePack.chip} ${connectionChipClass}`}>
                  {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  {connectionState === 'connected' && t('queueDisplay.connected')}
                  {connectionState === 'reconnecting' && t('queueDisplay.reconnecting')}
                  {connectionState === 'offline' && t('queueDisplay.offline')}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${stylePack.chip}`}>
                  <Clock3 className="h-4 w-4" />
                  {t('queueDisplay.snapshot')}: {data?.generatedAtUtc ? new Date(data.generatedAtUtc).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
              </div>
            </header>

            <div className="grid min-h-0 flex-1 gap-4 xl:grid-rows-[minmax(0,1.25fr)_minmax(0,1fr)_auto] xl:overflow-hidden">
            <article
              key={data?.current?.appointmentId ?? data?.version ?? 'current-state'}
              className={`relative flex min-h-[220px] flex-col overflow-hidden rounded-[12px] border border-primary-200 bg-[linear-gradient(180deg,#f5faff_0%,#eef6ff_100%)] p-5 md:p-6 ${stylePack.shadow} ${cardMotionClass}`}
              style={{ animation: 'qdFadeRise 320ms ease both' }}
            >
              <div className={`absolute inset-y-0 ${isRtl ? 'right-0' : 'left-0'} w-1.5 ${stylePack.accent}`} />
              <p className={`ps-2 text-xl font-semibold leading-tight md:text-[1.8rem] ${stylePack.titleText}`}>{t('queueDisplay.currentPatient')}</p>
              {hasCurrent && data?.current ? (
                <>
                  <div className="mt-5 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${stylePack.mutedText}`}>{t('queueDisplay.queueNumber')}</p>
                      <p className="text-[clamp(3rem,5vw,4.7rem)] font-black leading-none text-primary-600 tabular-nums">{data.current.queueNumber ?? '-'}</p>
                    </div>
                    <div className="shrink-0">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/90 px-3.5 py-1.5 text-sm text-primary-700">
                        <Activity className="h-4 w-4" />
                        <span className="font-semibold">{localizedStatus(data.current.status) ?? t('queueDisplay.nowInTreatment')}</span>
                      </div>
                    </div>
                  </div>
                  <h2
                    className={`mt-5 min-w-0 max-w-full text-[clamp(1.85rem,2.9vw,2.8rem)] font-semibold leading-tight ${stylePack.titleText}`}
                    title={data.current.displayName}
                    style={clampTwoLinesStyle}
                  >
                    {data.current.displayName}
                  </h2>
                  <div className="mt-auto pt-5">
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary-100 bg-white/80 px-3.5 py-1.5 text-sm text-slate-600">
                      <BadgeCheck className="h-4 w-4 text-primary-600" />
                      <span className="truncate">{t('queueDisplay.currentPatientHint')}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-8 flex min-h-0 flex-1 items-center justify-center text-center">
                  <div>
                    <UserRound className={`mx-auto mb-4 h-12 w-12 ${stylePack.mutedText}`} />
                    <p className={`text-xl font-semibold ${stylePack.titleText}`}>{t('queueDisplay.noCurrent')}</p>
                    <p className={`mt-2 text-sm ${stylePack.dimText}`}>{t('queueDisplay.noCurrentHint')}</p>
                  </div>
                </div>
              )}
            </article>

            <article
              key={data?.next?.appointmentId ?? 'next-state'}
              className={`flex min-h-[200px] flex-col overflow-hidden rounded-[12px] border p-5 md:p-6 ${stylePack.secondaryPanel} ${stylePack.shadow} ${cardMotionClass}`}
              style={{ animation: 'qdFadeRise 320ms ease both' }}
            >
              <p className={`text-xl font-semibold leading-tight md:text-[1.8rem] ${stylePack.titleText}`}>{t('queueDisplay.nextPatient')}</p>
              {hasNext && data?.next ? (
                <div className="mt-5 flex min-h-0 flex-1 flex-col">
                  <p className={`text-sm ${stylePack.mutedText}`}>{t('queueDisplay.queueNumber')}</p>
                  <div className="mt-1 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <p className={`text-[clamp(2.35rem,4.4vw,3.7rem)] font-black leading-none text-primary-600 tabular-nums`}>#{data.next.queueNumber ?? '-'}</p>
                    {localizedStatus(data.next.status) ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                        <Activity className="h-4 w-4 text-primary-600" />
                        <span className="font-medium">{localizedStatus(data.next.status)}</span>
                      </div>
                    ) : null}
                  </div>
                  <p
                    className={`mt-4 min-w-0 max-w-full text-[clamp(1.45rem,2.35vw,2.2rem)] font-semibold leading-tight ${stylePack.titleText}`}
                    title={data.next.displayName}
                    style={clampTwoLinesStyle}
                  >
                    {data.next.displayName}
                  </p>
                </div>
              ) : (
                <div className="mt-8 flex items-center gap-3">
                  <UserRound className={`h-10 w-10 ${stylePack.mutedText}`} />
                  <div>
                    <p className={`text-lg font-semibold ${stylePack.titleText}`}>{t('queueDisplay.noNext')}</p>
                    <p className={`mt-1 text-sm ${stylePack.dimText}`}>{t('queueDisplay.noNextHint')}</p>
                  </div>
                </div>
              )}
            </article>

            <article className={`flex items-center justify-between gap-3 overflow-hidden rounded-[12px] border px-4 py-3 md:px-5 md:py-3.5 ${stylePack.secondaryPanel} ${stylePack.shadow} ${cardMotionClass}`}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <UserRound className="h-5 w-5" />
                </div>
                <p className={`min-w-0 text-sm font-medium md:text-base ${stylePack.titleText}`}>
                  {t('queueDisplay.waitingFooterLabel')}
                </p>
              </div>
              <div className="flex shrink-0 items-baseline gap-2 text-primary-600">
                <span className="text-2xl font-black tabular-nums md:text-3xl">{waitingCount}</span>
                <span className="text-sm font-semibold md:text-base">{waitingLabel}</span>
              </div>
            </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
