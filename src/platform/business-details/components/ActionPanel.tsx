interface ActionPanelProps {
  busy: boolean
  canApprove: boolean
  canSuspend: boolean
  canActivate: boolean
  canExtendTrial: boolean
  onApprove: () => Promise<void>
  onSuspend: () => Promise<void>
  onActivate: () => Promise<void>
  onExtendTrial: () => Promise<void>
}

export default function ActionPanel({
  busy,
  canApprove,
  canSuspend,
  canActivate,
  canExtendTrial,
  onApprove,
  onSuspend,
  onActivate,
  onExtendTrial,
}: ActionPanelProps) {
  return (
    <aside className="platform-card platform-section-card platform-action-panel">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Actions</h3>
      </header>

      <div className="platform-action-list">
        <button type="button" className="platform-button-primary" disabled={busy || !canApprove} onClick={() => canApprove && void onApprove()}>
          Approve
        </button>
        <button type="button" className="platform-button-secondary" disabled={busy || !canSuspend} onClick={() => canSuspend && void onSuspend()}>
          Suspend
        </button>
        <button type="button" className="platform-button-secondary" disabled={busy || !canActivate} onClick={() => canActivate && void onActivate()}>
          Activate
        </button>
        <button type="button" className="platform-button-secondary" disabled={busy || !canExtendTrial} onClick={() => canExtendTrial && void onExtendTrial()}>
          Extend Trial
        </button>
      </div>
    </aside>
  )
}
