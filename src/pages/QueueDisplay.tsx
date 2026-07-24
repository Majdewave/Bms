import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Activity, Clock3, UserRound, Wifi, WifiOff, ImageOff, BadgeCheck } from 'lucide-react'
import { QueueDisplayTheme, queueDisplayApi, type QueueDisplayData } from '@/api/queueDisplay'

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
    pageGradient: 'from-slate-900 via-slate-800 to-zinc-900',
    pageOverlay: 'bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.16),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(34,197,94,0.12),transparent_40%)]',
    shell: 'border-white/15 bg-black/25 backdrop-blur-xl',
    card: 'border-white/15 bg-white/8',
    chip: 'border-white/20 bg-white/10',
    mutedText: 'text-white/72',
    dimText: 'text-white/58',
    titleText: 'text-white',
    ring: 'ring-cyan-300/45',
    accent: 'bg-cyan-300',
    adPlaceholder: 'border-white/20 bg-black/20 text-white/80',
    shadow: 'shadow-[0_24px_70px_rgba(15,23,42,0.55)]',
    panel: 'border-white/12 bg-white/8 backdrop-blur-2xl',
    heroPanel: 'border-cyan-300/35 bg-white/10 backdrop-blur-2xl',
    secondaryPanel: 'border-white/12 bg-white/7 backdrop-blur-xl',
  },
  [QueueDisplayTheme.Light]: {
    pageGradient: 'from-slate-100 via-white to-slate-200',
    pageOverlay: 'bg-[radial-gradient(circle_at_12%_16%,rgba(2,132,199,0.09),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(14,116,144,0.08),transparent_38%)]',
    shell: 'border-slate-300 bg-white/80 backdrop-blur-xl',
    card: 'border-slate-300 bg-white/95',
    chip: 'border-slate-300 bg-white',
    mutedText: 'text-slate-600',
    dimText: 'text-slate-500',
    titleText: 'text-slate-900',
    ring: 'ring-cyan-500/30',
    accent: 'bg-cyan-600',
    adPlaceholder: 'border-slate-300 bg-slate-50 text-slate-700',
    shadow: 'shadow-[0_22px_65px_rgba(100,116,139,0.28)]',
    panel: 'border-slate-200 bg-white/92 backdrop-blur-2xl',
    heroPanel: 'border-cyan-500/30 bg-white backdrop-blur-2xl',
    secondaryPanel: 'border-slate-200 bg-white/88 backdrop-blur-xl',
  },
  [QueueDisplayTheme.Dark]: {
    pageGradient: 'from-zinc-950 via-slate-950 to-black',
    pageOverlay: 'bg-[radial-gradient(circle_at_18%_14%,rgba(100,116,139,0.18),transparent_44%),radial-gradient(circle_at_80%_86%,rgba(14,116,144,0.14),transparent_38%)]',
    shell: 'border-white/10 bg-black/35 backdrop-blur-xl',
    card: 'border-white/12 bg-white/6',
    chip: 'border-white/15 bg-white/10',
    mutedText: 'text-white/72',
    dimText: 'text-white/56',
    titleText: 'text-white',
    ring: 'ring-emerald-300/35',
    accent: 'bg-emerald-300',
    adPlaceholder: 'border-white/16 bg-black/20 text-white/78',
    shadow: 'shadow-[0_26px_70px_rgba(2,6,23,0.7)]',
    panel: 'border-white/10 bg-white/7 backdrop-blur-2xl',
    heroPanel: 'border-emerald-300/30 bg-white/10 backdrop-blur-2xl',
    secondaryPanel: 'border-white/10 bg-white/6 backdrop-blur-xl',
  },
  [QueueDisplayTheme.Blue]: {
    pageGradient: 'from-sky-900 via-blue-900 to-indigo-950',
    pageOverlay: 'bg-[radial-gradient(circle_at_16%_14%,rgba(186,230,253,0.2),transparent_46%),radial-gradient(circle_at_85%_86%,rgba(125,211,252,0.17),transparent_40%)]',
    shell: 'border-cyan-100/20 bg-slate-950/30 backdrop-blur-xl',
    card: 'border-cyan-100/20 bg-slate-900/28',
    chip: 'border-cyan-100/30 bg-slate-900/40',
    mutedText: 'text-white/78',
    dimText: 'text-white/60',
    titleText: 'text-white',
    ring: 'ring-cyan-100/45',
    accent: 'bg-cyan-100',
    adPlaceholder: 'border-cyan-100/25 bg-slate-900/30 text-white/82',
    shadow: 'shadow-[0_24px_70px_rgba(15,23,42,0.6)]',
    panel: 'border-cyan-100/20 bg-slate-900/35 backdrop-blur-2xl',
    heroPanel: 'border-cyan-100/40 bg-slate-900/40 backdrop-blur-2xl',
    secondaryPanel: 'border-cyan-100/18 bg-slate-900/28 backdrop-blur-xl',
  },
}

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
      className={`h-screen w-full overflow-hidden bg-gradient-to-br ${stylePack.pageGradient} p-4 md:p-6 [font-family:'Plus_Jakarta_Sans','Manrope','Segoe_UI',sans-serif]`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className={`pointer-events-none fixed inset-0 ${stylePack.pageOverlay}`} aria-hidden="true" />

      <style>{`
        @keyframes qdFadeRise {
          0% { opacity: 0; transform: translateY(6px) scale(0.995); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="relative z-10 mx-auto flex h-full max-w-[1920px] flex-col gap-4 md:gap-6">
        <header className={`rounded-3xl border p-6 md:p-8 ${stylePack.shell} ${stylePack.shadow} ${cardMotionClass}`}>
          <div className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4 md:gap-5">
              {data?.logoUrl ? (
                <img
                  src={data.logoUrl}
                  alt="Business logo"
                  className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-cover bg-white/95 shadow-md"
                />
              ) : (
                <div className={`h-16 w-16 md:h-20 md:w-20 rounded-2xl ${stylePack.card} border`} />
              )}
              <div className="min-w-0">
                <p className={`text-[10px] md:text-xs uppercase tracking-[0.38em] ${stylePack.mutedText}`}>{t('queueDisplay.liveQueue')}</p>
                <h1 className={`text-2xl md:text-5xl font-semibold tracking-tight truncate ${stylePack.titleText}`}>
                  {data?.businessName ?? t('queueDisplay.displayFallback')}
                </h1>
              </div>
            </div>

            <div className={`text-right ${isRtl ? 'text-left' : ''}`}>
              <p className={`text-lg md:text-2xl font-medium ${stylePack.mutedText}`}>{now.toLocaleDateString(locale)}</p>
              <p className={`text-3xl md:text-5xl font-bold tabular-nums ${stylePack.titleText}`}>{now.toLocaleTimeString(locale)}</p>
            </div>
          </div>

          <div className={`mt-4 flex items-center justify-between gap-4 text-xs md:text-sm ${stylePack.mutedText}`}>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${stylePack.chip} ${connectionChipClass}`}>
              {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {connectionState === 'connected' && t('queueDisplay.connected')}
              {connectionState === 'reconnecting' && t('queueDisplay.reconnecting')}
              {connectionState === 'offline' && t('queueDisplay.offline')}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${stylePack.chip}`}>
              <Clock3 className="h-4 w-4" />
              {t('queueDisplay.snapshot')}: {data?.generatedAtUtc ? new Date(data.generatedAtUtc).toLocaleTimeString(locale) : '--:--:--'}
            </span>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[0.3fr_0.7fr]">
          <aside className="grid min-h-0 gap-6 lg:grid-rows-[minmax(0,1fr)_minmax(0,0.55fr)]">
            <article className={`flex min-h-0 flex-col overflow-hidden rounded-[2rem] ${stylePack.panel} ${stylePack.shadow} ${cardMotionClass}`}>
              <div className="px-6 pt-6 pb-4">
                <p className={`text-[15px] uppercase tracking-[0.3em] ${stylePack.mutedText}`}>{t('queueDisplay.advertisement')}</p>
              </div>
              <div className="min-h-0 flex-1 px-4 pb-4">
                {data?.advertisementImageUrl ? (
                  <img
                    src={data.advertisementImageUrl}
                    alt={t('queueDisplay.advertisement')}
                    className="h-full w-full rounded-[1.5rem] object-cover"
                  />
                ) : (
                  <div className={`flex h-full w-full flex-col items-center justify-center rounded-[1.5rem] ${stylePack.adPlaceholder} px-8 text-center`}>
                    {data?.logoUrl ? (
                      <img
                        src={data.logoUrl}
                        alt="Business logo"
                        className="mb-5 h-24 w-24 rounded-[1.25rem] bg-white object-cover shadow-md md:h-28 md:w-28"
                      />
                    ) : (
                      <ImageOff className="mb-5 h-12 w-12 opacity-70" />
                    )}
                    <p className={`text-lg font-semibold ${stylePack.titleText}`}>{t('queueDisplay.noAdvertisement')}</p>
                    <p className={`mt-3 max-w-[24ch] text-sm ${stylePack.dimText}`}>{t('queueDisplay.noAdvertisementHint')}</p>
                  </div>
                )}
              </div>
            </article>

            <article className={`flex min-h-0 flex-col justify-center overflow-hidden rounded-[2rem] px-7 py-7 ${stylePack.secondaryPanel} ${stylePack.shadow} ${cardMotionClass}`}>
              <p className={`text-[15px] uppercase tracking-[0.32em] ${stylePack.mutedText}`}>{t('queueDisplay.waiting')}</p>
              <div className="mt-6 overflow-hidden">
                <div className="flex items-end gap-4">
                  <p className={`text-[clamp(3.2rem,6vw,5.8rem)] font-black tabular-nums leading-none ${stylePack.titleText}`}>{waitingCount}</p>
                  <p className={`pb-1 text-[clamp(1rem,1.5vw,1.35rem)] font-semibold leading-tight ${stylePack.titleText}`}>{t('queueDisplay.waiting')}</p>
                </div>
              </div>
            </article>
          </aside>

          <section className="grid min-h-0 gap-6 grid-rows-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <article
              key={data?.current?.appointmentId ?? data?.version ?? 'current-state'}
              className={`relative flex min-h-0 flex-col overflow-hidden rounded-[2.4rem] border ${stylePack.heroPanel} ${stylePack.shadow} ${cardMotionClass}`}
              style={{ animation: 'qdFadeRise 320ms ease both' }}
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${stylePack.accent}`} />
              <div className="flex h-full min-h-0 flex-col justify-between p-8 md:p-10 xl:p-12">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-[15px] uppercase tracking-[0.34em] ${stylePack.mutedText}`}>{t('queueDisplay.currentPatient')}</p>
                    <p className={`mt-2 text-sm ${stylePack.dimText}`}>{t('queueDisplay.currentPatientHint')}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-base  ${stylePack.chip}`} style={{color: 'blue'}}>
                    <BadgeCheck className="h-4 w-4" />
                    {t('queueDisplay.nowInTreatment')}
                  </span>
                </div>

                {hasCurrent && data?.current ? (
                  <div className="grid min-h-0 flex-1 place-items-center">
                    <div className="w-full max-w-5xl text-center">
                      <div className="mx-auto max-w-4xl overflow-hidden">
                        <p className={`text-[clamp(0.95rem,1.4vw,1.15rem)] uppercase tracking-[0.32em] ${stylePack.mutedText}`}>{t('queueDisplay.queueNumber')}</p>
                        <p className={`mt-4 text-[clamp(3rem,7vw,6.5rem)] font-black tabular-nums leading-none text-blue-600`}> {data.current.queueNumber ?? '-'}</p>
                      </div>
                      <h2
                        className={`mx-auto mt-5 max-w-[16ch] text-balance text-[clamp(2.1rem,5vw,4.8rem)] font-black leading-[0.96] tracking-[-0.03em] ${stylePack.titleText}`}
                        title={data.current.displayName}
                      >
                        {data.current.displayName}
                      </h2>
                      <div className="mt-6 flex justify-center">
                        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-base ${stylePack.chip}`} style={{color: 'blue'}}>
                          <Activity className="h-4 w-4" />
                          <span className={stylePack.mutedText}>{t('queueDisplay.status')}</span>
                          <span className={`font-semibold ${stylePack.titleText}`}>{t('queueDisplay.nowInTreatment')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-0 flex-1 place-items-center text-center">
                    <div>
                      <UserRound className={`mx-auto mb-5 h-14 w-14 ${stylePack.mutedText}`} />
                      <p className={`text-2xl font-semibold ${stylePack.titleText}`}>{t('queueDisplay.noCurrent')}</p>
                      <p className={`mt-3 text-base ${stylePack.dimText}`}>{t('queueDisplay.noCurrentHint')}</p>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article
              key={data?.next?.appointmentId ?? 'next-state'}
              className={`flex min-h-0 flex-col overflow-hidden rounded-[2rem] p-8 ${stylePack.secondaryPanel} ${stylePack.shadow} ${cardMotionClass}`}
              style={{ animation: 'qdFadeRise 320ms ease both' }}
            >
              <p className={`text-[15px] uppercase tracking-[0.32em] ${stylePack.mutedText}`}>{t('queueDisplay.nextPatient')}</p>
              {hasNext && data?.next ? (
                <div className="mt-6 flex min-h-0 flex-1 items-center gap-6 overflow-hidden">
                  <div className="shrink-0">
                    <p className={`text-[clamp(1rem,1.2vw,1.1rem)] ${stylePack.mutedText}`}>{t('queueDisplay.queueNumber')}</p>
                    <p className={`mt-2 text-[clamp(2rem,4vw,3.4rem)] font-black tabular-nums leading-none ${stylePack.titleText}`}>#{data.next.queueNumber ?? '-'}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`max-w-full text-balance text-[clamp(1.6rem,3vw,2.6rem)] font-bold leading-tight ${stylePack.titleText}`}
                      title={data.next.displayName}
                      style={{ paddingTop: '35px' }}
                    >
                      {data.next.displayName}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex items-center gap-4">
                  <UserRound className={`h-10 w-10 ${stylePack.mutedText}`} />
                  <div>
                    <p className={`text-2xl font-semibold ${stylePack.titleText}`}>{t('queueDisplay.noNext')}</p>
                    <p className={`mt-2 text-base ${stylePack.dimText}`}>{t('queueDisplay.noNextHint')}</p>
                  </div>
                </div>
              )}
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}
