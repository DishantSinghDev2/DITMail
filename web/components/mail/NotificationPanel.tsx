"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  XMarkIcon,
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  CogIcon,
  CheckIcon,
  TrashIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline"
import Dropdown from "../ui/Dropdown"

interface Notification {
  _id: string
  type: "email" | "security" | "system" | "plan"
  title: string
  message: string
  read: boolean
  created_at: string
  data?: any
  priority: "low" | "normal" | "high"
}

interface NotificationPanelProps {
  notifications: Notification[]
  onClose: () => void
  onRefresh: () => void
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
}

export default function NotificationPanel({
  notifications,
  onClose,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(false)

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === "high" ? "h-5 w-5" : "h-4 w-4"

    switch (type) {
      case "email":
        return <EnvelopeIcon className={`${iconClass} text-blue-500`} />
      case "security":
        return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />
      case "system":
        return <InformationCircleIcon className={`${iconClass} text-gray-500`} />
      case "plan":
        return <CogIcon className={`${iconClass} text-purple-500`} />
      default:
        return <BellIcon className={`${iconClass} text-gray-500`} />
    }
  }

  const getNotificationBgColor = (type: string, read: boolean) => {
    if (read) return "bg-white"

    switch (type) {
      case "email":
        return "bg-blue-50"
      case "security":
        return "bg-red-50"
      case "system":
        return "bg-gray-50"
      case "plan":
        return "bg-purple-50"
      default:
        return "bg-gray-50"
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setLoading(true)
      await onMarkAsRead(notificationId)
    } catch (error) {
      console.error("Error marking notification as read:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return

    try {
      setLoading(true)
      await onDelete(notificationId)
    } catch (error) {
      console.error("Error deleting notification:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.read
    return notification.type === filter
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {[
          { id: "all", label: "All", count: notifications.length },
          { id: "unread", label: "Unread", count: unreadCount },
          { id: "email", label: "Email", count: notifications.filter((n) => n.type === "email").length },
          { id: "security", label: "Security", count: notifications.filter((n) => n.type === "security").length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              filter === tab.id
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BellIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No notifications</p>
            <p className="text-sm">{filter === "unread" ? "All caught up!" : "You have no notifications"}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${getNotificationBgColor(notification.type, notification.read)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${!notification.read ? "text-gray-900" : "text-gray-600"}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                          {notification.priority === "high" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                        <Dropdown
                          trigger={
                            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                              <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                            </button>
                          }
                          items={[
                            {
                              label: notification.read ? "Mark as unread" : "Mark as read",
                              onClick: () => handleMarkAsRead(notification._id),
                              icon: CheckIcon,
                            },
                            {
                              label: "Delete",
                              onClick: () => handleDelete(notification._id),
                              icon: TrashIcon,
                              danger: true,
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh notifications"}
        </button>
      </div>
    </div>
  )
}
