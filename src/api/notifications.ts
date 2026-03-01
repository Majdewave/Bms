// Mock API for notifications
// In production, replace with actual API calls

export type NotificationType = 'appointment' | 'message' | 'system' | 'payment'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
}

// Mock notifications data
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'appointment',
    title: 'Upcoming Appointment',
    message: 'You have an appointment with Sarah Cohen tomorrow at 10:00 AM',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    read: false,
    link: '/admin/appointments',
  },
  {
    id: '2',
    type: 'message',
    title: 'New Message',
    message: 'John Doe sent you a message',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
  },
  {
    id: '3',
    type: 'payment',
    title: 'Payment Received',
    message: 'Payment of $150 received from Client #1234',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    read: true,
    link: '/admin/invoices',
  },
  {
    id: '4',
    type: 'system',
    title: 'System Update',
    message: 'New features are now available in your dashboard',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
  },
]

// Simulate localStorage for persistence
const STORAGE_KEY = 'notifications'

const getStoredNotifications = (): Notification[] => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    return JSON.parse(stored)
  }
  // Initialize with mock data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_NOTIFICATIONS))
  return MOCK_NOTIFICATIONS
}

const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
}

export const getNotifications = (): Promise<Notification[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notifications = getStoredNotifications()
      // Sort by timestamp (newest first)
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      resolve(notifications)
    }, 300)
  })
}

export const getUnreadCount = (): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notifications = getStoredNotifications()
      const unreadCount = notifications.filter((n) => !n.read).length
      resolve(unreadCount)
    }, 100)
  })
}

export const markAsRead = (notificationId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notifications = getStoredNotifications()
      const notification = notifications.find((n) => n.id === notificationId)
      if (notification) {
        notification.read = true
        saveNotifications(notifications)
      }
      resolve()
    }, 200)
  })
}

export const markAllAsRead = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notifications = getStoredNotifications()
      notifications.forEach((n) => (n.read = true))
      saveNotifications(notifications)
      resolve()
    }, 300)
  })
}

export const deleteNotification = (notificationId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notifications = getStoredNotifications()
      const filtered = notifications.filter((n) => n.id !== notificationId)
      saveNotifications(filtered)
      resolve()
    }, 200)
  })
}
