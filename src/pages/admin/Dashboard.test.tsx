// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  useTenant: vi.fn(),
  useAuth: vi.fn(),
  useNavigate: vi.fn(),
  getAdminStats: vi.fn(),
  getRecentActivity: vi.fn(),
}))

vi.mock('@/hooks/useTenant', () => ({ useTenant: mocks.useTenant }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }))
vi.mock('@/api', () => ({
  dashboardService: {
    getAdminStats: mocks.getAdminStats,
    getRecentActivity: mocks.getRecentActivity,
  },
}))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  useNavigate: mocks.useNavigate,
}))
vi.mock('@/components/BillingBanner', () => ({ default: () => null }))
vi.mock('@/api/workSummary', () => ({
  getCurrentAttendance: vi.fn().mockResolvedValue({
    isClockedIn: false,
    openSessionId: null,
    clockInAt: null,
    elapsedMinutes: null,
  }),
  clockIn: vi.fn(),
  clockOut: vi.fn(),
}))

import i18n from '@/i18n'
import AdminDashboard from './Dashboard'
import StaffDashboard from '../staff/Dashboard'

const activityTypes = [
  'appointment_created',
  'appointment_completed',
  'visit_summary_created',
  'client_created',
  'staff_created',
  'staff_deleted',
  'user_deleted',
  'client_deleted',
]

const translatedActions: Record<string, string[]> = {
  en: [
    'Appointment created', 'Appointment completed', 'Visit summary created', 'Client created',
    'Staff member added', 'Staff member deleted', 'User deleted', 'Client deleted',
  ],
  he: [
    'תור נוצר', 'התור הושלם', 'נוצר סיכום ביקור', 'לקוח נוצר',
    'איש צוות נוסף', 'איש צוות נמחק', 'משתמש נמחק', 'לקוח נמחק',
  ],
  ar: [
    'تم إنشاء موعد', 'تم إكمال الموعد', 'تم إنشاء ملخص الزيارة', 'تم إنشاء عميل',
    'تمت إضافة موظف', 'تم حذف موظف', 'تم حذف مستخدم', 'تم حذف عميل',
  ],
}

const localeByLanguage: Record<string, string> = { en: 'en-US', he: 'he-IL', ar: 'ar-EG' }
const appointmentStatusByLanguage: Record<string, string> = {
  en: 'In Progress',
  he: 'בטיפול',
  ar: 'قيد العلاج',
}

const upcomingAppointment = {
  id: 'upcoming-appointment-1',
  startTime: '2026-09-10T09:30:00Z',
  clientName: 'Layla Client',
  serviceName: 'Consultation',
  staffName: 'Dr. Example',
  status: 'InProgress',
}

function makeActivities() {
  return activityTypes.map((type, index) => ({
    id: `activity-${index}`,
    type,
    title: 'Hardcoded English API title',
    clientName: 'Test client',
    staffName: 'Assigned staff',
    serviceName: 'Test service',
    performedBy: index === 0 ? 'Actual creator' : null,
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  }))
}

describe('Admin Dashboard activity localization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useTenant.mockReturnValue({ loading: false })
    mocks.useAuth.mockReturnValue({ user: { name: 'Dashboard tester' } })
    mocks.useNavigate.mockReturnValue(vi.fn())
    mocks.getAdminStats.mockResolvedValue({
      totalClients: { count: 4 },
      notDocumentedClients: { count: 0 },
      appointmentsToday: { count: 0 },
      completedToday: { count: 0 },
      upcomingAppointmentsList: [],
    })
    mocks.getRecentActivity.mockResolvedValue(makeActivities())
  })

  afterEach(cleanup)

  for (const language of ['en', 'he', 'ar']) {
    it(`localizes every current activity type and relative time in ${language.toUpperCase()}`, async () => {
      await i18n.changeLanguage(language)
      render(<AdminDashboard />)

      for (const action of translatedActions[language]) {
        expect(await screen.findByText(action)).toBeInTheDocument()
      }
      expect(screen.queryByText('Hardcoded English API title')).not.toBeInTheDocument()
      expect(screen.getByText('Actual creator')).toBeInTheDocument()
      expect(screen.getAllByText('Assigned staff').length).toBeGreaterThan(0)
      expect(screen.getAllByText(language === 'en' ? 'Not recorded' : language === 'he' ? 'לא צוין' : 'غير مسجل').length).toBeGreaterThan(0)
      expect(screen.queryByText('Admin', { exact: true })).not.toBeInTheDocument()

      const expectedRelativeTime = new Intl.RelativeTimeFormat(localeByLanguage[language], { numeric: 'auto' }).format(-12, 'hour')
      expect(screen.getAllByText(expectedRelativeTime).length).toBeGreaterThan(0)
    })

    it(`localizes the upcoming-appointments empty state and keeps ${language.toUpperCase()} direction`, async () => {
      await i18n.changeLanguage(language)
      render(<AdminDashboard />)

      const emptyState = await screen.findByText(
        language === 'en' ? 'No upcoming appointments' : language === 'he' ? 'אין תורים קרובים' : 'لا توجد مواعيد قادمة',
      )
      expect(emptyState.closest('[dir]')).toHaveAttribute('dir', language === 'en' ? 'ltr' : 'rtl')
    })

    it(`renders responsive upcoming appointment details and localized status in ${language.toUpperCase()}`, async () => {
      await i18n.changeLanguage(language)
      mocks.getAdminStats.mockResolvedValue({
        totalClients: { count: 4 },
        notDocumentedClients: { count: 0 },
        appointmentsToday: { count: 1 },
        completedToday: { count: 0 },
        upcomingAppointmentsList: [upcomingAppointment],
      })

      render(<AdminDashboard />)

      const row = (await screen.findByTestId('upcoming-appointment-row'))
      expect(row.closest('[dir]')).toHaveAttribute('dir', language === 'en' ? 'ltr' : 'rtl')
      expect(screen.getAllByTestId('upcoming-appointment-row')).toHaveLength(1)
      expect(row.className).toContain('md:grid-cols-')
      expect(screen.getByText('Layla Client')).toBeInTheDocument()
      expect(screen.getByText('Consultation')).toBeInTheDocument()
      expect(screen.getByText('Dr. Example')).toBeInTheDocument()
      expect(screen.getByText(appointmentStatusByLanguage[language])).toBeInTheDocument()
      expect(row.querySelector('time')).toHaveAttribute('dateTime', upcomingAppointment.startTime)
    })
  }

  it('uses the localized activity feed on the staff Dashboard as well', async () => {
    await i18n.changeLanguage('he')
    mocks.getAdminStats.mockResolvedValue({
      totalClients: { count: 4 },
      notDocumentedClients: { count: 0 },
      appointmentsToday: { count: 1 },
      completedToday: { count: 0 },
      upcomingAppointmentsList: [upcomingAppointment],
    })
    render(<StaffDashboard />)

    expect(await screen.findByText('התור הושלם')).toBeInTheDocument()
    expect(screen.getByText('Actual creator')).toBeInTheDocument()
    expect(screen.queryByText('Hardcoded English API title')).not.toBeInTheDocument()
    const upcomingAppointmentRow = screen.getByTestId('upcoming-appointment-row')
    expect(upcomingAppointmentRow.closest('[dir]')).toHaveAttribute('dir', 'rtl')
    expect(upcomingAppointmentRow.className).toContain('md:grid-cols-')
    expect(screen.getByText('Layla Client')).toBeInTheDocument()
    expect(screen.getByText('בטיפול')).toBeInTheDocument()
  })
})
