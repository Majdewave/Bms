import { useCallback, useEffect } from 'react'
import ChatPanel from './ChatPanel'
import TeamChatBellButton from './TeamChatBellButton'
import TeamChatErrorBoundary from './TeamChatErrorBoundary'
import { useTeamChat } from '../hooks/useTeamChat'

interface TeamChatEntryProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  bellButtonRef: React.RefObject<HTMLButtonElement>
}

export default function TeamChatEntry({ isOpen, onToggle, onClose, bellButtonRef }: TeamChatEntryProps) {
  const { clearSelectedUser, totalUnreadCount } = useTeamChat()

  useEffect(() => {
    if (!isOpen) {
      bellButtonRef.current?.focus()
    }
  }, [isOpen, bellButtonRef])

  const handleToggle = useCallback(() => {
    if (isOpen) {
      clearSelectedUser()
    }

    onToggle()
  }, [isOpen, clearSelectedUser, onToggle])

  const handleClose = useCallback(() => {
    clearSelectedUser()
    onClose()
  }, [clearSelectedUser, onClose])

  return (
    <>
      <TeamChatErrorBoundary>
        <TeamChatBellButton
          ref={bellButtonRef}
          isOpen={isOpen}
          onClick={handleToggle}
          unreadCount={totalUnreadCount}
        />
      </TeamChatErrorBoundary>

      <TeamChatErrorBoundary>
        <ChatPanel
          isOpen={isOpen}
          onClose={handleClose}
        />
      </TeamChatErrorBoundary>
    </>
  )
}