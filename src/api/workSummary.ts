import { delNoContent, get, post, put } from './apiClient'

export interface CurrentAttendanceStatus {
  isClockedIn: boolean
  openSessionId: string | null
  clockInAt: string | null
  elapsedMinutes: number | null
}

export interface StaffWorkSession {
  id: string
  userId: string
  clockInAt: string
  clockOutAt: string | null
  createdAt: string
  updatedAt: string
  lastCorrectedByUserId: string | null
  lastCorrectedAt: string | null
  correctionReason: string | null
}

export interface StaffHoursSummary {
  staffUserId: string
  fromUtc: string
  toUtc: string
  sessions: Array<{
    sessionId: string
    sessionDate: string
    clockInAt: string
    clockOutAt: string
    workedMinutesInRange: number
  }>
  completedSessions: number
  workingDays: number
  totalWorkedMinutes: number
}

export interface InterpreterRate {
  id: string
  interpreterUserId: string
  interpreterName: string
  modality: string
  amount: number
  currency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InterpreterWorkSummary {
  interpreterUserId: string
  fromUtc: string
  toUtc: string
  items: Array<{
    id: string
    interpretationRequestId: string
    imagingOrderId: string
    imagingStudyId: string
    completedAt: string
    accessionNumber: string
    originalModality: string
    payrollModality: string | null
    rateAmount: number | null
    currency: string | null
  }>
  totalInterpretations: number
  interpretationsWithRate: number
  interpretationsWithoutRate: number
  countsByPayrollModality: Array<{ payrollModality: string | null; count: number }>
  payableByCurrency: Array<{ currency: string; amount: number }>
}

export interface TechnicianRate {
  id: string
  technicianUserId: string
  technicianName: string
  modality: string
  amount: number
  currency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TechnicianWorkSummary {
  technicianUserId: string
  fromUtc: string
  toUtc: string
  items: Array<{
    id: string
    imagingOrderId: string
    imagingStudyId: string
    performedAt: string
    accessionNumber: string
    originalModality: string
    payrollModality: string | null
    rateAmount: number | null
    currency: string | null
  }>
  totalExaminations: number
  examinationsWithRate: number
  examinationsWithoutRate: number
  countsByPayrollModality: Array<{ payrollModality: string | null; count: number }>
  payableByCurrency: Array<{ currency: string; amount: number }>
}

export interface WorkSummaryOverviewMember {
  userId: string
  fullName: string
  role: 'Staff' | 'Interpreter' | 'Technician'
  workingDays: number | null
  completedSessions: number | null
  totalWorkedMinutes: number | null
  isClockedIn: boolean | null
  clockInAt: string | null
  totalInterpretations: number | null
  interpretationsWithRate: number | null
  interpretationsWithoutRate: number | null
  xRayCount: number | null
  usCount: number | null
  payableByCurrency: Array<{ currency: string; amount: number }>
  totalExaminations: number | null
  examinationsWithRate: number | null
  examinationsWithoutRate: number | null
}

export interface WorkSummaryOverview {
  fromUtc: string
  toUtc: string
  memberCount: number
  workingDays: number
  completedSessions: number
  totalWorkedMinutes: number
  totalInterpretations: number
  interpretationsWithRate: number
  interpretationsWithoutRate: number
  payableByCurrency: Array<{ currency: string; amount: number }>
  members: WorkSummaryOverviewMember[]
}

const rangeQuery = (fromUtc: string, toUtc: string) =>
  new URLSearchParams({ fromUtc, toUtc }).toString()

export const getCurrentAttendance = () =>
  get<CurrentAttendanceStatus>('/api/work-summary/attendance/current')

export const clockIn = () =>
  post<StaffWorkSession>('/api/work-summary/attendance/clock-in')

export const clockOut = () =>
  post<StaffWorkSession>('/api/work-summary/attendance/clock-out')

export const getWorkSummaryOverview = (fromUtc: string, toUtc: string) =>
  get<WorkSummaryOverview>(`/api/work-summary/overview?${rangeQuery(fromUtc, toUtc)}`)

export const getStaffHours = (userId: string, fromUtc: string, toUtc: string) =>
  get<StaffHoursSummary>(
    `/api/work-summary/staff/${encodeURIComponent(userId)}/hours?${rangeQuery(fromUtc, toUtc)}`,
  )

export const correctStaffSession = (
  userId: string,
  sessionId: string,
  clockInAt: string,
  clockOutAt: string,
  reason: string,
) =>
  put<StaffWorkSession>(
    `/api/work-summary/staff/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`,
    { clockInAt, clockOutAt, reason },
  )

export const getInterpreterRates = () =>
  get<InterpreterRate[]>('/api/work-summary/interpreter-rates')

export const setInterpreterRate = (userId: string, modality: 'XRay' | 'US', amount: number) =>
  put<InterpreterRate>(
    `/api/work-summary/interpreters/${encodeURIComponent(userId)}/rates/${modality}`,
    { amount },
  )

export const deactivateInterpreterRate = (rateId: string) =>
  delNoContent(`/api/work-summary/interpreter-rates/${encodeURIComponent(rateId)}`)

export const getInterpreterWork = (userId: string, fromUtc: string, toUtc: string) =>
  get<InterpreterWorkSummary>(
    `/api/work-summary/interpreters/${encodeURIComponent(userId)}/work?${rangeQuery(fromUtc, toUtc)}`,
  )

export const getTechnicianRates = () =>
  get<TechnicianRate[]>('/api/work-summary/technician-rates')

export const setTechnicianRate = (userId: string, modality: 'XRay' | 'US', amount: number) =>
  put<TechnicianRate>(
    `/api/work-summary/technicians/${encodeURIComponent(userId)}/rates/${modality}`,
    { amount },
  )

export const deactivateTechnicianRate = (rateId: string) =>
  delNoContent(`/api/work-summary/technician-rates/${encodeURIComponent(rateId)}`)

export const getTechnicianWork = (userId: string, fromUtc: string, toUtc: string) =>
  get<TechnicianWorkSummary>(
    `/api/work-summary/technicians/${encodeURIComponent(userId)}/work?${rangeQuery(fromUtc, toUtc)}`,
  )
