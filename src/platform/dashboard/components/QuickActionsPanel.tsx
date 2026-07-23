import { Building2, Settings, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface QuickActionsPanelProps {
  pendingApprovals: number
}

interface ActionItem {
  title: string
  description: string
  to: string
  icon: typeof ShieldCheck
}

export default function QuickActionsPanel({ pendingApprovals }: QuickActionsPanelProps) {
  const navigate = useNavigate()

  const actions: ActionItem[] = [
    {
      title: 'Approve Pending Businesses',
      description: pendingApprovals > 0
        ? `${pendingApprovals} businesses are awaiting review.`
        : 'No businesses are currently waiting for approval.',
      to: '/platform/pending-approvals',
      icon: ShieldCheck,
    },
    {
      title: 'Manage Businesses',
      description: 'Open the businesses workspace for lifecycle actions.',
      to: '/platform/businesses',
      icon: Building2,
    },
    {
      title: 'Platform Users',
      description: 'Review platform-level user accounts and access.',
      to: '/platform/users',
      icon: UserRound,
    },
    {
      title: 'Platform Settings',
      description: 'Manage platform-wide operational settings.',
      to: '/platform/settings',
      icon: Settings,
    },
  ]

  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Quick Actions</h3>
      </header>

      <div className="platform-quick-actions-grid">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.title}
              type="button"
              className="platform-quick-action"
              onClick={() => navigate(action.to)}
            >
              <div className="platform-quick-action-icon">
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="platform-detail-value">{action.title}</p>
                <p className="platform-detail-meta">{action.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
