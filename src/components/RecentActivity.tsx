interface Activity {
  id: string
  user: string
  action: string
  timestamp: string
  type: 'invoice' | 'appointment' | 'file' | 'profile'
}

const mockActivities: Activity[] = [
  {
    id: '1',
    user: 'You',
    action: 'Created new invoice INV-2024-003',
    timestamp: '2 hours ago',
    type: 'invoice',
  },
  {
    id: '2',
    user: 'Sarah Johnson',
    action: 'Scheduled appointment',
    timestamp: '4 hours ago',
    type: 'appointment',
  },
  {
    id: '3',
    user: 'You',
    action: 'Uploaded Q4 Report',
    timestamp: '1 day ago',
    type: 'file',
  },
  {
    id: '4',
    user: 'System',
    action: 'Account security updated',
    timestamp: '2 days ago',
    type: 'profile',
  },
]

export default function RecentActivity() {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-blue-100 text-blue-700'
      case 'appointment':
        return 'bg-green-100 text-green-700'
      case 'file':
        return 'bg-purple-100 text-purple-700'
      case 'profile':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>

      <div className="space-y-4">
        {mockActivities.map((activity, index) => (
          <div
            key={activity.id}
            className={`pb-4 ${index !== mockActivities.length - 1 ? 'border-b border-gray-200' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(activity.type)}`}>
                {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {activity.user} {activity.action}
                </p>
                <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-6 w-full py-2 text-primary-600 font-semibold hover:bg-gray-50 rounded-lg">
        View All Activity
      </button>
    </div>
  )
}
