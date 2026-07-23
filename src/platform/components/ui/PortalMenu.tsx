import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PortalMenuProps {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  className?: string
}

export default function PortalMenu({ open, anchorRef, onClose, children, className = '' }: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, minWidth: 0 })

  useLayoutEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const anchor = anchorRef.current
      const menu = menuRef.current
      if (!anchor || !menu) return

      const rect = anchor.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const offset = 8

      let left = rect.right - menuRect.width
      if (left < offset) {
        left = rect.left
      }
      if (left + menuRect.width > viewportWidth - offset) {
        left = Math.max(offset, viewportWidth - menuRect.width - offset)
      }

      let top = rect.bottom + offset
      if (top + menuRect.height > viewportHeight - offset) {
        top = Math.max(offset, rect.top - menuRect.height - offset)
      }

      setPosition({ top, left, minWidth: Math.max(rect.width, 220) })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown as unknown as EventListener)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown as unknown as EventListener)
    }
  }, [anchorRef, onClose, open])

  useEffect(() => {
    if (!open) return
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')
    firstItem?.focus()
  }, [open])

  const menu = useMemo(() => {
    if (!open) return null

    return createPortal(
      <div
        ref={menuRef}
        className={`platform-portal-menu ${className}`.trim()}
        style={{ top: `${position.top}px`, left: `${position.left}px`, minWidth: `${position.minWidth}px` }}
        role="menu"
        aria-label="Row actions"
      >
        {children}
      </div>,
      document.body,
    )
  }, [children, className, open, position.left, position.minWidth, position.top])

  return menu
}
