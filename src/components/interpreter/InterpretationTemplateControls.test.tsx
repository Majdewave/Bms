// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import i18n from '@/i18n'

const mocks = vi.hoisted(() => ({
  getTemplates: vi.fn(),
  updateTemplate: vi.fn(),
  createTemplate: vi.fn(),
  deactivateTemplate: vi.fn(),
}))

vi.mock('@/api/interpreterPortal', () => ({
  getInterpretationReportTemplates: mocks.getTemplates,
  updateInterpretationReportTemplate: mocks.updateTemplate,
  createInterpretationReportTemplate: mocks.createTemplate,
  deactivateInterpretationReportTemplate: mocks.deactivateTemplate,
}))

import InterpretationTemplateControls from './InterpretationTemplateControls'

const originalTemplate = {
  id: 'template-1',
  name: 'Chest X-ray',
  modality: 'XR',
  content: 'Findings: no acute abnormality.',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
}
const otherModalityTemplate = {
  id: 'template-2',
  name: 'CT template',
  modality: 'CT',
  content: 'CT template content',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
}

function Harness({ modality = 'XR' }: { modality?: string }) {
  const [report, setReport] = useState('Existing report text')
  return (
    <>
      <textarea aria-label="Report editor" value={report} onChange={(event) => setReport(event.target.value)} />
      <InterpretationTemplateControls modality={modality} reportContent={report} onApply={setReport} />
    </>
  )
}

describe('InterpretationTemplateControls', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    mocks.getTemplates.mockImplementation((modality?: string) =>
      Promise.resolve(modality ? [originalTemplate] : [originalTemplate, otherModalityTemplate])
    )
    mocks.updateTemplate.mockImplementation(async (id, request) => ({
      ...originalTemplate,
      id,
      ...request,
    }))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('requires confirmation before replacing report text and copies the template only after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Harness />)

    const selector = await screen.findByRole('combobox', { name: 'Personal report templates' })
    fireEvent.change(selector, { target: { value: originalTemplate.id } })
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Report editor' })).toHaveValue('Existing report text')

    confirm.mockReturnValue(true)
    fireEvent.change(selector, { target: { value: originalTemplate.id } })
    expect(screen.getByRole('textbox', { name: 'Report editor' })).toHaveValue(originalTemplate.content)
  })

  it('keeps copied report text independent when the source template is later edited', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Harness />)

    fireEvent.change(await screen.findByRole('combobox', { name: 'Personal report templates' }), {
      target: { value: originalTemplate.id },
    })
    const reportEditor = screen.getByRole('textbox', { name: 'Report editor' })
    expect(reportEditor).toHaveValue(originalTemplate.content)

    fireEvent.click(screen.getByRole('button', { name: 'Manage templates' }))
    fireEvent.click((await screen.findByText('Chest X-ray')).closest('button')!)
    const templateContent = await screen.findByLabelText('Template content')
    fireEvent.change(templateContent, { target: { value: 'A later template revision.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }))

    await waitFor(() => expect(mocks.updateTemplate).toHaveBeenCalledWith(originalTemplate.id, {
      name: originalTemplate.name,
      modality: originalTemplate.modality,
      content: 'A later template revision.',
    }))
    expect(reportEditor).toHaveValue(originalTemplate.content)
  })

  it('filters selector choices by modality but lets management view all templates', async () => {
    render(<Harness />)

    const selector = await screen.findByRole('combobox', { name: 'Personal report templates' })
    expect(selector.querySelectorAll('option')).toHaveLength(2)
    expect(screen.queryByRole('option', { name: /CT template/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Manage templates' }))
    expect(await screen.findByText('CT template')).toBeInTheDocument()
    expect(mocks.getTemplates).toHaveBeenLastCalledWith()
  })

  it('opens management with no templates and creates a template that appears in the selector', async () => {
    let storedTemplates: typeof originalTemplate[] = []
    mocks.getTemplates.mockImplementation((requestedModality?: string) =>
      Promise.resolve(storedTemplates.filter((template) =>
        !requestedModality || !template.modality || template.modality.toUpperCase() === requestedModality.toUpperCase()
      ))
    )
    mocks.createTemplate.mockImplementation(async (request) => {
      const saved = {
        ...originalTemplate,
        id: 'template-created',
        ...request,
      }
      storedTemplates = [...storedTemplates, saved]
      return saved
    })
    render(<Harness modality="DX" />)

    const manageButton = screen.getByRole('button', { name: 'Manage templates' })
    expect(manageButton).toBeEnabled()
    fireEvent.click(manageButton)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'Chest DX' } })
    fireEvent.change(screen.getByLabelText('Template modality'), { target: { value: 'DX' } })
    fireEvent.change(screen.getByLabelText('Template content'), { target: { value: 'No acute findings.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }))

    expect(await screen.findByRole('option', { name: /Chest DX/ })).toBeInTheDocument()
    expect(mocks.createTemplate).toHaveBeenCalledWith({
      name: 'Chest DX',
      modality: 'DX',
      content: 'No acute findings.',
    })
    expect(mocks.getTemplates).toHaveBeenLastCalledWith()
  })

  it('shows general and matching modality templates only', async () => {
    const general = { ...originalTemplate, id: 'general', name: 'General', modality: null }
    const dx = { ...originalTemplate, id: 'dx', name: 'DX', modality: 'DX' }
    const dr = { ...originalTemplate, id: 'dr', name: 'DR', modality: 'DR' }
    const cr = { ...originalTemplate, id: 'cr', name: 'CR', modality: 'CR' }
    const us = { ...originalTemplate, id: 'us', name: 'US', modality: 'US' }
    mocks.getTemplates.mockResolvedValue([general, dx, dr, cr, us])
    const { rerender } = render(<Harness modality="DR" />)

    let selector = await screen.findByRole('combobox', { name: 'Personal report templates' })
    expect(selector).toBeEnabled()
    expect(selector.querySelectorAll('option')).toHaveLength(5)
    expect(screen.getByRole('option', { name: /General/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^DX/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^DR/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^CR/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^US/ })).not.toBeInTheDocument()

    rerender(
      <>
        <textarea aria-label="Report editor" />
        <InterpretationTemplateControls modality="DX" reportContent="" onApply={vi.fn()} />
      </>
    )
    selector = await screen.findByRole('combobox', { name: 'Personal report templates' })
    expect(selector).toBeEnabled()
    expect(selector.querySelectorAll('option')).toHaveLength(5)
    expect(screen.getByRole('option', { name: /General/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^DX/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^DR/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^CR/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^US/ })).not.toBeInTheDocument()

    rerender(
      <>
        <textarea aria-label="Report editor" />
        <InterpretationTemplateControls modality="US" reportContent="" onApply={vi.fn()} />
      </>
    )
    selector = await screen.findByRole('combobox', { name: 'Personal report templates' })
    expect(selector).toBeEnabled()
    expect(selector.querySelectorAll('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: /General/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^US/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^DX/ })).not.toBeInTheDocument()
  })

  it('updates locally created DX templates for DR cases without a page refresh', async () => {
    let storedTemplates: typeof originalTemplate[] = []
    mocks.getTemplates.mockImplementation(async () => storedTemplates)
    mocks.createTemplate.mockImplementation(async (request) => {
      const saved = { ...originalTemplate, id: 'template-created-xray', ...request }
      storedTemplates = [saved]
      return saved
    })
    render(<Harness modality="DR" />)

    fireEvent.click(screen.getByRole('button', { name: 'Manage templates' }))
    await screen.findByRole('dialog')
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'DX Chest' } })
    fireEvent.change(screen.getByLabelText('Template modality'), { target: { value: 'DX' } })
    fireEvent.change(screen.getByLabelText('Template content'), { target: { value: 'No acute findings.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }))

    const selector = await screen.findByRole('combobox', { name: 'Personal report templates' })
    expect(await screen.findByRole('option', { name: /DX Chest/ })).toBeInTheDocument()
    expect(selector).toBeEnabled()
  })

  it('does not let an older empty list response overwrite a newly created applicable template', async () => {
    let resolveInitialLoad!: (templates: typeof originalTemplate[]) => void
    let storedTemplates: typeof originalTemplate[] = []
    mocks.getTemplates
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitialLoad = resolve }))
      .mockImplementation(async () => storedTemplates)
    mocks.createTemplate.mockImplementation(async (request) => {
      const saved = { ...originalTemplate, id: 'template-created-race', ...request }
      storedTemplates = [saved]
      return saved
    })
    render(<Harness modality="DX" />)

    fireEvent.click(screen.getByRole('button', { name: 'Manage templates' }))
    await screen.findByRole('dialog')
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'DX Chest' } })
    fireEvent.change(screen.getByLabelText('Template modality'), { target: { value: 'DX' } })
    fireEvent.change(screen.getByLabelText('Template content'), { target: { value: 'No acute findings.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }))

    const selector = await screen.findByRole('combobox', { name: 'Personal report templates' })
    expect(selector).toBeEnabled()
    expect(screen.getByRole('option', { name: /DX Chest/ })).toBeInTheDocument()

    resolveInitialLoad([])
    await waitFor(() => expect(selector).toBeEnabled())
    expect(screen.getByRole('option', { name: /DX Chest/ })).toBeInTheDocument()
  })
})
