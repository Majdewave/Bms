import type { ReactNode } from 'react'

interface BusinessStatCardProps {
  label: string
  value: number
  icon?: ReactNode
  trend?: string
  loading?: boolean
}

export default function BusinessStatCard({ label, value, icon, trend, loading = false }: BusinessStatCardProps) {
  return (
    <article className="platform-stat-card">
      <div className="platform-stat-top">
        <p className="platform-stat-label">{label}</p>
        {icon ? <span className="platform-stat-icon">{icon}</span> : null}
      </div>

      {loading ? <div className="skeleton h-8 w-20 mt-2" /> : <p className="platform-stat-value">{value}</p>}

      {trend ? <p className="platform-stat-trend">{trend}</p> : null}
    </article>
  )
}
