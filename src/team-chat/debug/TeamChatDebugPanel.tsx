import { useAuth } from '@/contexts/AuthContext'
import { useTeamChat } from '../hooks/useTeamChat'

interface TeamChatDebugPanelProps {
  forceVisible?: boolean
}

export default function TeamChatDebugPanel({ forceVisible = false }: TeamChatDebugPanelProps) {
  const { user } = useAuth()
  const { onlineUsers, connectionState, connect, disconnect, isConnected } = useTeamChat()

  if (!forceVisible && !import.meta.env.DEV) return null
  if (!user || user.role === 'client') return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 80,
        width: 320,
        maxWidth: 'calc(100vw - 32px)',
        border: '1px solid #d1d5db',
        borderRadius: 12,
        background: '#ffffff',
        padding: 12,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Team Chat Debug</div>

      <div style={{ marginBottom: 8 }}>
        <span>Status: </span>
        <strong>{connectionState}</strong>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => void connect()} disabled={isConnected}>
          Connect
        </button>
        <button type="button" onClick={() => void disconnect()} disabled={!isConnected && connectionState !== 'Reconnecting'}>
          Disconnect
        </button>
      </div>

      <div style={{ marginBottom: 4, fontWeight: 600 }}>Online Users:</div>
      {onlineUsers.length === 0 ? (
        <div>None</div>
      ) : (
        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
          {onlineUsers.map((userItem) => (
            <li key={userItem.UserId}>
              {`🟢 ${userItem.FullName}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
