import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Bell, Calendar, MessageSquare, CreditCard, Info, X, Check } from 'lucide-react'
import type { Notification, NotificationType } from '@/api/notifications'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '@/api/notifications'

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'appointment':
      return Calendar
    case 'message':
      return MessageSquare
    case 'payment':
      return CreditCard
    case 'system':
      return Info
    default:
      return Bell
  }
}

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'appointment':
      return 'bg-blue-100 text-blue-600'
    case 'message':
      return 'bg-green-100 text-green-600'
    case 'payment':
      return 'bg-purple-100 text-purple-600'
    case 'system':
      return 'bg-slate-100 text-slate-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

const formatTimestamp = (timestamp: string, t: any): string => {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('notifications.justNow')
  if (diffMins < 60) {
    const text = t('notifications.minutesAgo')
    return text.replace('{{count}}', diffMins.toString())
  }
  if (diffHours < 24) {
    const text = t('notifications.hoursAgo')
    return text.replace('{{count}}', diffHours.toString())
  }
  if (diffDays < 7) {
    const text = t('notifications.daysAgo')
    return text.replace('{{count}}', diffDays.toString())
  }
  
  return date.toLocaleDateString()
}

export default function NotificationsDropdown() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
      await loadNotifications()
      await loadUnreadCount()
    }
    
    if (notification.link) {
      navigate(notification.link)
      setIsOpen(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    await loadNotifications()
    await loadUnreadCount()
  }

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteNotification(notificationId)
    await loadNotifications()
    await loadUnreadCount()
  }

  const toggleDropdown = () => {
    if (!isOpen) {
      loadNotifications()
    }
    setIsOpen(!isOpen)
  }

  const isRTL = i18n.language === 'he' || i18n.language === 'ar'

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-1.5 md:p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
        aria-label={t('common.notifications')}
      >
        <Bell className="w-4.5 h-4.5 md:w-5 md:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 min-w-[16px] h-[16px] md:min-w-[18px] md:h-[18px] bg-red-500 text-white text-[9px] md:text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 ${
            isRTL ? 'left-0' : 'right-0'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-slate-500">{t('common.loading')}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  const colorClass = getNotificationColor(notification.type)
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group ${
                        !notification.read ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="flex-shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatTimestamp(notification.timestamp, t)}
                          </p>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-opacity"
                          aria-label={t('notifications.delete')}
                        >
                          <X className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false)
                  // Could navigate to a full notifications page
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
