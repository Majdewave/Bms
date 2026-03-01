import { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export const Container = ({
  children,
  className = '',
  maxWidth = 'lg',
}: ContainerProps) => {
  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
  }

  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${widthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export const PageHeader = ({
  title,
  description,
  action,
  className = '',
}: PageHeaderProps) => {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          {description && <p className="text-base text-slate-600 mt-2">{description}</p>}
        </div>
        {action && <div className="ml-6">{action}</div>}
      </div>
    </div>
  )
}

interface GridProps {
  children: ReactNode
  cols?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Grid = ({ children, cols = 1, gap = 'lg', className = '' }: GridProps) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  }

  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}

interface StackProps {
  children: ReactNode
  direction?: 'row' | 'col'
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end'
  justify?: 'start' | 'center' | 'between' | 'end'
  className?: string
}

export const Stack = ({
  children,
  direction = 'col',
  gap = 'md',
  align = 'start',
  justify = 'start',
  className = '',
}: StackProps) => {
  const directionClass = direction === 'row' ? 'flex-row' : 'flex-col'
  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  }
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  }
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    between: 'justify-between',
    end: 'justify-end',
  }

  return (
    <div
      className={`flex ${directionClass} ${gapClasses[gap]} ${alignClasses[align]} ${justifyClasses[justify]} ${className}`}
    >
      {children}
    </div>
  )
}
