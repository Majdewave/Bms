import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/apiClient'
import {
  clockIn,
  clockOut,
  getCurrentAttendance,
  type CurrentAttendanceStatus,
} from '@/api/workSummary'

const getElapsedMinutes = (clockInAt: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(clockInAt).getTime()) / 60_000))

export default function AttendanceControl() {
  const { t, i18n } = useTranslation()
  const [attendance, setAttendance] = useState<CurrentAttendanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  const refresh = useCallback(async () => {
    setError('')
    try {
      setAttendance(await getCurrentAttendance())
    } catch {
      setError(t('workSummary.attendanceLoadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const toggleAttendance = async () => {
    setSaving(true)
    setError('')
    try {
      if (attendance?.isClockedIn) await clockOut()
      else await clockIn()
      await refresh()
    } catch (caught) {
      const isConflict = caught instanceof ApiError && caught.status === 409
      const message = isConflict
        ? attendance?.isClockedIn
          ? t('workSummary.clockOutConflict')
          : t('workSummary.clockInConflict')
        : t('workSummary.attendanceSaveError')
      await refresh()
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const elapsedMinutes = attendance?.clockInAt
    ? getElapsedMinutes(attendance.clockInAt, now)
    : null
  const elapsedText = elapsedMinutes === null
    ? ''
    : `${Math.floor(elapsedMinutes / 60)} ${t('workSummary.hoursShort')} ${elapsedMinutes % 60} ${t('workSummary.minutesShort')}`

  return (
    <section
      dir={i18n.dir()}
      aria-labelledby="attendance-control-title"
      className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="attendance-control-title" className="text-lg font-semibold text-slate-900">
            {t('workSummary.myAttendance')}
          </h2>
          {loading ? (
            <p className="mt-1 text-sm text-slate-500">{t('workSummary.loading')}</p>
          ) : attendance?.isClockedIn ? (
            <p className="mt-1 text-sm text-emerald-700">
              {t('workSummary.clockedInSince', {
                time: attendance.clockInAt
                  ? new Date(attendance.clockInAt).toLocaleTimeString(i18n.language, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '',
              })}
              {elapsedText && <span className="ms-2 text-slate-600">({elapsedText})</span>}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">{t('workSummary.notClockedIn')}</p>
          )}
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
        <button
          type="button"
          onClick={() => void toggleAttendance()}
          disabled={loading || saving || !!error && !attendance}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
            attendance?.isClockedIn
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {saving
            ? t('workSummary.saving')
            : attendance?.isClockedIn
              ? t('workSummary.clockOut')
              : t('workSummary.clockIn')}
        </button>
      </div>
    </section>
  )
}
