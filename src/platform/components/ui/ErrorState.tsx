import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  title: string
  description: string
  onRetry: () => void
}

export default function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div className="platform-state-container">
      <div className="platform-state-icon platform-state-icon-error">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <p className="platform-state-title">{title}</p>
      <p className="platform-state-description">{description}</p>
      <button type="button" onClick={onRetry} className="platform-button-primary mt-2">
        Retry
      </button>
    </div>
  )
}
