// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import TechnicianNotesCard from './TechnicianNotesCard'

describe('TechnicianNotesCard', () => {
  it('keeps long, multiline notes intact in a bounded internal scroll area', () => {
    const notes = `Line one\n${'unbroken-text-'.repeat(600)}\nFinal line`
    render(<TechnicianNotesCard title="Technician Notes" notes={notes} direction="ltr" />)

    const scrollArea = screen.getByTestId('technician-notes-scroll-area')
    expect(scrollArea).toHaveClass('max-h-60', 'overflow-y-auto', 'overscroll-contain')
    expect(scrollArea.querySelector('p')).toHaveClass('whitespace-pre-wrap', 'break-words')
    expect(scrollArea.querySelector('p')?.textContent).toBe(notes)
  })

  it('applies RTL direction to the complete card', () => {
    render(<TechnicianNotesCard title="ملاحظات فني التصوير الطبي" notes="ملاحظة" direction="rtl" />)

    expect(screen.getByRole('region', { name: 'ملاحظات فني التصوير الطبي' })).toHaveAttribute('dir', 'rtl')
  })
})
