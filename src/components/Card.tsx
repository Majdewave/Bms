import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export const Card = ({ children, className = '', hoverable = false }: CardProps) => {
  return (
    <div
      className={`card p-6 ${hoverable ? 'hover:shadow-lg cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export const CardHeader = ({ title, description, action }: CardHeaderProps) => {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export const CardContent = ({ children, className = '' }: CardContentProps) => {
  return <div className={`space-y-4 ${className}`}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
  divider?: boolean
}

export const CardFooter = ({ children, className = '', divider = false }: CardFooterProps) => {
  return (
    <div className={`${divider ? 'border-t border-slate-200 pt-4 mt-4' : ''} ${className}`}>
      {children}
    </div>
  )
}
