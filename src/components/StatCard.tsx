import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  title: string
  value: string
  change: string
  trend?: 'up' | 'down' | 'neutral'
}

export default function StatCard({
  icon: Icon,
  title,
  value,
  change,
  trend = 'neutral',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
        {trend === 'up' && (
          <span className="text-green-600 text-sm font-semibold">↑</span>
        )}
        {trend === 'down' && <span className="text-red-600 text-sm font-semibold">↓</span>}
      </div>

      <h3 className="text-gray-600 text-sm font-semibold mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <p
        className={`text-xs font-semibold ${
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
        }`}
      >
        {change}
      </p>
    </div>
  )
}
