import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="platform-state-container">
      <div className="platform-state-icon">
        <Inbox className="h-6 w-6 text-slate-500" />
      </div>
      <p className="platform-state-title">{title}</p>
      <p className="platform-state-description">{description}</p>
    </div>
  )
}
