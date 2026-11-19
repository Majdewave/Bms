// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  getClientsForAppointment: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  getServices: vi.fn(),
  getStaffOptions: vi.fn(),
  getTechnicianOptions: vi.fn(),
  getDepartmentFeatureEnabled: vi.fn(),
  getSignedByClient: vi.fn(),
  getImagingOrderReferral: vi.fn(),
}))

vi.mock('@/api', () => ({
  appointmentsService: {
    getClientsForAppointment: mocks.getClientsForAppointment,
    createAppointment: mocks.createAppointment,
    updateAppointment: mocks.updateAppointment,
  },
}))
vi.mock('@/api/consents', () => ({
  consentsApi: { getSignedByClient: mocks.getSignedByClient },
}))
vi.mock('@/api/servicesService', () => ({
  servicesService: { getServices: mocks.getServices },
}))
vi.mock('@/api/appointmentStaff', () => ({
  appointmentStaffService: {
    getStaffOptions: mocks.getStaffOptions,
    getTechnicianOptions: mocks.getTechnicianOptions,
  },
}))
vi.mock('@/api/imaging', () => ({
  deleteImagingOrderReferralDocument: vi.fn(),
  getImagingOrderReferral: mocks.getImagingOrderReferral,
  getImagingOrderReferralDocument: vi.fn(),
  updateImagingOrderReferral: vi.fn(),
  uploadImagingOrderReferralDocument: vi.fn(),
}))
vi.mock('@/api/departmentFeatureCheck', () => ({
  getDepartmentFeatureEnabled: mocks.getDepartmentFeatureEnabled,
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}))
vi.mock('./SignConsentModal', () => ({ default: () => null }))
vi.mock('./DocumentScannerModal', () => ({ default: () => null }))

import i18n from '@/i18n'
import CreateAppointmentModal from './CreateAppointmentModal'

const client = { id: 'client-1', fullName: 'Patient One', email: 'patient@example.test' }
const regularService = {
  id: 'service-regular',
  name: 'Consultation',
  defaultDurationMinutes: 30,
  departmentId: 'department-1',
}
const imagingService = {
  id: 'service-imaging',
  name: 'X-Ray',
  defaultDurationMinutes: 30,
  imagingModality: 'DX' as const,
  departmentId: 'department-1',
}
const staff = {
  id: 'business-staff-1',
  fullName: 'General Staff',
  email: 'staff@example.test',
  departmentIds: [],
}
const technician = {
  id: 'technician-user-1',
  fullName: 'Technician One',
  email: 'technician@example.test',
}

const renderModal = (props: Partial<React.ComponentProps<typeof CreateAppointmentModal>> = {}) =>
  render(
    <CreateAppointmentModal
      defaultClientId={client.id}
      onClose={vi.fn()}
      {...props}
    />,
  )

const chooseAutocompleteOption = async (placeholder: string, value: string) => {
  const input = await screen.findByPlaceholderText(placeholder)
  fireEvent.focus(input)
  if ((input as HTMLInputElement).value !== value) {
    fireEvent.change(input, { target: { value } })
  }
  fireEvent.mouseDown(await screen.findByRole('option', { name: value }))
}

const selectService = (container: HTMLElement, name: string) =>
  chooseAutocompleteOption(i18n.t('appointments.form.selectService'), name)

const fillDateTime = (container: HTMLElement) => {
  const futureDate = new Date()
  futureDate.setUTCDate(futureDate.getUTCDate() + 2)
  fireEvent.change(container.querySelector('input[type="date"]')!, {
    target: { value: futureDate.toISOString().slice(0, 10) },
  })
  fireEvent.change(container.querySelector('input[type="time"]')!, {
    target: { value: '12:00' },
  })
}

const submit = async () => {
  const button = screen.getByRole('button', { name: i18n.t('common.save') })
  await waitFor(() => expect(button).toBeEnabled())
  fireEvent.click(button)
}

describe('Imaging appointment staff assignment', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    mocks.getClientsForAppointment.mockResolvedValue([client])
    mocks.getServices.mockResolvedValue([regularService, imagingService])
    mocks.getStaffOptions.mockResolvedValue([staff])
    mocks.getTechnicianOptions.mockResolvedValue([technician])
    mocks.getDepartmentFeatureEnabled.mockResolvedValue(true)
    mocks.getSignedByClient.mockResolvedValue([])
    mocks.getImagingOrderReferral.mockResolvedValue({ referringDoctorName: null, document: null })
    mocks.createAppointment.mockResolvedValue({ id: 'new-appointment', imagingOrderId: 'order-1' })
    mocks.updateAppointment.mockResolvedValue({ id: 'appointment-1' })
  })

  afterEach(cleanup)

  it('keeps Treating Staff Member required for non-imaging appointments', async () => {
    const { container } = renderModal()
    await selectService(container, regularService.name)
    expect(await screen.findByText(i18n.t('appointments.form.staff'))).toBeInTheDocument()
    fillDateTime(container)
    await submit()

    expect(await screen.findByText(i18n.t('validation.required'))).toBeInTheDocument()
    expect(mocks.createAppointment).not.toHaveBeenCalled()
  })

  it('shows only active Technician options for imaging and requires one', async () => {
    const { container } = renderModal()
    await selectService(container, imagingService.name)

    expect(await screen.findByText(i18n.t('appointments.form.performingTechnician'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('appointments.form.staff'))).not.toBeInTheDocument()

    const technicianInput = screen.getByPlaceholderText(
      i18n.t('appointments.form.selectPerformingTechnician'),
    )
    fireEvent.focus(technicianInput)
    expect(await screen.findByRole('option', { name: technician.fullName })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: staff.fullName })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Interpreter One' })).not.toBeInTheDocument()

    fillDateTime(container)
    await submit()
    expect(await screen.findByText(i18n.t('validation.required'))).toBeInTheDocument()
    expect(mocks.createAppointment).not.toHaveBeenCalled()
  })

  it('blocks imaging-service appointments when the effective feature is unavailable', async () => {
    mocks.getDepartmentFeatureEnabled.mockResolvedValue(false)
    const { container } = renderModal()
    await selectService(container, imagingService.name)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      i18n.t('features.medicalImagingPlanUnavailable'),
    )
    expect(screen.queryByText(i18n.t('appointments.form.staff'))).not.toBeInTheDocument()
    expect(screen.queryByText(i18n.t('appointments.form.performingTechnician'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('common.save') })).toBeDisabled()
  })

  it('sends one Technician selection for both imaging assignment fields without exposing Interpreter assignment', async () => {
    const { container } = renderModal()
    await selectService(container, imagingService.name)
    await chooseAutocompleteOption(
      i18n.t('appointments.form.selectPerformingTechnician'),
      technician.fullName,
    )
    fillDateTime(container)
    await submit()

    await waitFor(() => expect(mocks.createAppointment).toHaveBeenCalledOnce())
    const payload = mocks.createAppointment.mock.calls[0][0]
    expect(payload.performingTechnicianId).toBe(technician.id)
    expect(payload.staffId).toBeUndefined()
    expect(payload).not.toHaveProperty('interpreterId')
    expect(payload).not.toHaveProperty('interpreterUserId')
  })

  it('shows and preserves the existing imaging Technician when editing', async () => {
    renderModal({
      mode: 'edit',
      appointment: {
        id: 'appointment-1',
        clientId: client.id,
        serviceId: imagingService.id,
        staffId: 'business-technician-1',
        performingTechnicianId: technician.id,
        performingTechnicianName: technician.fullName,
        imagingOrderId: 'order-1',
        startTime: '2026-11-19T12:00:00Z',
      },
    })

    const technicianInput = await screen.findByPlaceholderText(
      i18n.t('appointments.form.selectPerformingTechnician'),
    )
    await waitFor(() => expect(technicianInput).toHaveValue(technician.fullName))
    expect(screen.queryByText(i18n.t('appointments.form.staff'))).not.toBeInTheDocument()
    await submit()

    await waitFor(() => expect(mocks.updateAppointment).toHaveBeenCalledOnce())
    const payload = mocks.updateAppointment.mock.calls[0][1]
    expect(payload.performingTechnicianId).toBe(technician.id)
    expect(payload.staffId).toBeUndefined()
  })

  it('does not treat a legacy StaffId as a Technician when editing an imaging appointment', async () => {
    const { container } = renderModal({
      mode: 'edit',
      appointment: {
        id: 'appointment-legacy',
        clientId: client.id,
        serviceId: imagingService.id,
        staffId: staff.id,
        imagingOrderId: 'order-legacy',
        startTime: '2026-11-19T12:00:00Z',
      },
    })

    const technicianInput = await screen.findByPlaceholderText(
      i18n.t('appointments.form.selectPerformingTechnician'),
    )
    expect(technicianInput).toHaveValue('')
    expect(screen.queryByText(i18n.t('appointments.form.staff'))).not.toBeInTheDocument()
    await submit()

    expect(await screen.findByText(i18n.t('validation.required'))).toBeInTheDocument()
    expect(mocks.updateAppointment).not.toHaveBeenCalled()
    expect(container.querySelector('select')?.value).not.toBe(technician.id)
  })

  it('switches from non-imaging to imaging and synchronizes the Technician selection', async () => {
    const { container } = renderModal({
      mode: 'edit',
      appointment: {
        id: 'appointment-1',
        clientId: client.id,
        serviceId: regularService.id,
        staffId: staff.id,
        startTime: '2026-11-19T12:00:00Z',
      },
    })

    await waitFor(() => expect(
      screen.getByPlaceholderText(i18n.t('appointments.form.selectService')),
    ).toHaveValue(regularService.name))
    await selectService(container, imagingService.name)
    expect(await screen.findByText(i18n.t('appointments.form.performingTechnician'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('appointments.form.staff'))).not.toBeInTheDocument()
    await chooseAutocompleteOption(
      i18n.t('appointments.form.selectPerformingTechnician'),
      technician.fullName,
    )
    await submit()

    await waitFor(() => expect(mocks.updateAppointment).toHaveBeenCalledOnce())
    const payload = mocks.updateAppointment.mock.calls[0][1]
    expect(payload.performingTechnicianId).toBe(technician.id)
    expect(payload.staffId).toBeUndefined()
  })

  it('switches from imaging to non-imaging without clearing historical Technician assignment', async () => {
    const { container } = renderModal({
      mode: 'edit',
      appointment: {
        id: 'appointment-1',
        clientId: client.id,
        serviceId: imagingService.id,
        staffId: 'business-technician-1',
        performingTechnicianId: technician.id,
        performingTechnicianName: technician.fullName,
        imagingOrderId: 'order-1',
        startTime: '2026-11-19T12:00:00Z',
      },
    })

    const existingTechnicianInput = await screen.findByPlaceholderText(
      i18n.t('appointments.form.selectPerformingTechnician'),
    )
    await waitFor(() => expect(existingTechnicianInput).toHaveValue(technician.fullName))
    await selectService(container, regularService.name)
    expect(await screen.findByText(i18n.t('appointments.form.staff'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('appointments.form.performingTechnician'))).not.toBeInTheDocument()
    const staffOption = await screen.findByRole('option', { name: staff.fullName })
    fireEvent.change(staffOption.closest('select')!, { target: { value: staff.id } })
    await submit()

    await waitFor(() => expect(mocks.updateAppointment).toHaveBeenCalledOnce())
    const payload = mocks.updateAppointment.mock.calls[0][1]
    expect(payload.staffId).toBe(staff.id)
    expect(payload).not.toHaveProperty('performingTechnicianId')
    expect(payload).not.toHaveProperty('clearPerformingTechnician')
  })
})
