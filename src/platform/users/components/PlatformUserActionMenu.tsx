import { MoreHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import PortalMenu from '@/platform/components/ui/PortalMenu'
import type { PlatformUserRecord } from '@/platform/users/services/platformUsersService'

interface PlatformUserActionMenuProps {
  user: PlatformUserRecord
  currentUserId?: string | null
  onView: () => void
  onEdit: () => void
  onResetPassword: () => void
  onEnable: () => void
  onDisable: () => void
  onChangeRole: () => void
  onForcePasswordReset: () => void
  onDelete: () => void
}

export default function PlatformUserActionMenu({
  user,
  currentUserId,
  onView,
  onEdit,
  onResetPassword,
  onEnable,
  onDisable,
  onChangeRole,
  onForcePasswordReset,
  onDelete,
}: PlatformUserActionMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const isSelf = currentUserId === user.id
  const isSuperAdmin = user.role === 'Super Admin'

  const close = () => setOpen(false)
  const run = (action: () => void) => {
    action()
    close()
  }

  return (
    <div className="platform-row-actions">
      <button
        ref={triggerRef}
        type="button"
        className="platform-icon-button"
        aria-label={`Open actions for ${user.fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <PortalMenu open={open} anchorRef={triggerRef} onClose={close}>
        <div className="platform-actions-menu-inner">
          <button type="button" role="menuitem" className="platform-actions-item" onClick={() => run(onView)}>
            View
          </button>
          <button type="button" role="menuitem" className="platform-actions-item" onClick={() => run(onEdit)}>
            Edit
          </button>
          <button type="button" role="menuitem" className="platform-actions-item" onClick={() => run(onResetPassword)}>
            Reset Password
          </button>
          <button type="button" role="menuitem" className="platform-actions-item" onClick={() => run(onForcePasswordReset)}>
            Force Password Reset
          </button>
          <button type="button" role="menuitem" className="platform-actions-item" onClick={() => run(onChangeRole)}>
            Change Role
          </button>
          <button
            type="button"
            role="menuitem"
            className="platform-actions-item"
            disabled={user.isActive || isSelf}
            onClick={() => !user.isActive && !isSelf && run(onEnable)}
          >
            Enable
          </button>
          <button
            type="button"
            role="menuitem"
            className="platform-actions-item"
            disabled={!user.isActive || isSelf || isSuperAdmin}
            onClick={() => user.isActive && !isSelf && !isSuperAdmin && run(onDisable)}
          >
            Disable
          </button>
          <button
            type="button"
            role="menuitem"
            className="platform-actions-item platform-actions-item-danger"
            disabled={isSelf}
            onClick={() => !isSelf && run(onDelete)}
          >
            Delete
          </button>
        </div>
      </PortalMenu>
    </div>
  )
}
