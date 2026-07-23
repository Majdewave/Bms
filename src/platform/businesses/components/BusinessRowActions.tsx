import { MoreHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import PortalMenu from '@/platform/components/ui/PortalMenu'

interface BusinessRowActionsProps {
  mode?: 'businesses' | 'pendingApprovals'
  onView: () => void
  onApprove: () => void
  onReject?: () => void
  onRequestMoreInfo?: () => void
  onSuspend: () => void
  onActivate: () => void
  onDelete: () => void
  canApprove: boolean
  canSuspend: boolean
  canActivate: boolean
  canReject?: boolean
}

export default function BusinessRowActions({
  mode = 'businesses',
  onView,
  onApprove,
  onReject,
  onRequestMoreInfo,
  onSuspend,
  onActivate,
  onDelete,
  canApprove,
  canSuspend,
  canActivate,
  canReject = false,
}: BusinessRowActionsProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const close = () => setOpen(false)

  const run = (action: () => void) => {
    action()
    close()
  }

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div className="platform-row-actions">
      <button
        type="button"
        ref={triggerRef}
        className="platform-icon-button"
        onClick={() => setOpen((previous) => !previous)}
        onKeyDown={onTriggerKeyDown}
        aria-label="Open row actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <PortalMenu open={open} anchorRef={triggerRef} onClose={close}>
        <div className="platform-actions-menu-inner">
          {mode === 'pendingApprovals' ? (
            <>
              <button type="button" role="menuitem" className="platform-actions-item" onClick={() => run(onView)}>
                View Application
              </button>
              <button type="button" role="menuitem" className="platform-actions-item" disabled={!canApprove} onClick={() => canApprove && run(onApprove)}>
                Approve
              </button>
              <button type="button" role="menuitem" className="platform-actions-item" disabled={!canReject} onClick={() => canReject && onReject && run(onReject)}>
                Reject
              </button>
              <button
                type="button"
                role="menuitem"
                className="platform-actions-item platform-actions-item-disabled"
                disabled
                onClick={() => onRequestMoreInfo && run(onRequestMoreInfo)}
              >
                Request More Information
              </button>
            </>
          ) : (
            <>
              <button type="button" role="menuitem" className="platform-actions-item" onClick={() => run(onView)}>
                View
              </button>
              <button type="button" role="menuitem" className="platform-actions-item" disabled={!canApprove} onClick={() => canApprove && run(onApprove)}>
                Approve
              </button>
              <button type="button" role="menuitem" className="platform-actions-item" disabled={!canSuspend} onClick={() => canSuspend && run(onSuspend)}>
                Suspend
              </button>
              <button type="button" role="menuitem" className="platform-actions-item" disabled={!canActivate} onClick={() => canActivate && run(onActivate)}>
                Activate
              </button>
              <button
                type="button"
                role="menuitem"
                className="platform-actions-item platform-actions-item-disabled"
                disabled
                onClick={() => run(onDelete)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </PortalMenu>
    </div>
  )
}
