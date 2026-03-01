import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      <div className="text-slate-400 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-6 text-center">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  icon?: ReactNode
  action?: ReactNode
  onClose?: () => void
}

export const Alert = ({
  type,
  title,
  message,
  icon,
  action,
  onClose,
}: AlertProps) => {
  const colorClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  }

  const iconClasses = {
    info: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
  }

  return (
    <div className={`card border ${colorClasses[type]} p-4 rounded-lg`}>
      <div className="flex gap-4">
        {icon && <div className={`flex-shrink-0 ${iconClasses[type]}`}>{icon}</div>}
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <p className="text-sm">{message}</p>
        </div>
        <div className="flex-shrink-0 flex gap-2">
          {action && <div>{action}</div>}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface BadgeProps {
  children: ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'slate'
  size?: 'sm' | 'md'
  icon?: ReactNode
}

export const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
}: BadgeProps) => {
  const baseClasses = `badge badge-${variant}`
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span className={`${baseClasses} ${sizeClasses} inline-flex items-center gap-2`}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  )
}

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'right' | 'bottom' | 'left'
}

export const Tooltip = ({ content, children, position = 'top' }: TooltipProps) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
  }

  return (
    <div className="group relative inline-block">
      {children}
      <div
        className={`absolute ${positionClasses[position]} bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10`}
      >
        {content}
      </div>
    </div>
  )
}
