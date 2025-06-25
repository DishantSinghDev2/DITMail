"use client"

import { useState, useEffect } from "react"
import {
  InboxIcon,
  PaperAirplaneIcon,
  DocumentIcon,
  TrashIcon,
  StarIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  FolderIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
  selectedFolder: string
  onFolderSelect: (folder: string) => void
  onCompose: () => void
  newMessages: number
  user: any
  onLogout: () => void
}

export default function MobileSidebar({
  isOpen,
  onClose,
  selectedFolder,
  onFolderSelect,
  onCompose,
  newMessages,
  user,
  onLogout,
}: MobileSidebarProps) {
  const [folderCounts, setFolderCounts] = useState<{ [key: string]: any }>({})
  const [customFolders, setCustomFolders] = useState([])
  const [labels, setLabels] = useState([])

  const defaultFolders = [
    { id: "inbox", name: "Inbox", icon: InboxIcon, count: "inbox" },
    { id: "sent", name: "Sent", icon: PaperAirplaneIcon, count: "sent" },
    { id: "drafts", name: "Drafts", icon: DocumentIcon, count: "drafts" },
    { id: "starred", name: "Starred", icon: StarIcon, count: "starred" },
    { id: "archive", name: "Archive", icon: ArchiveBoxIcon, count: "archive" },
    { id: "spam", name: "Spam", icon: ExclamationTriangleIcon, count: "spam" },
    { id: "trash", name: "Trash", icon: TrashIcon, count: "trash" },
  ]

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("accessToken")

      // Fetch folder counts
      const countsResponse = await fetch("/api/messages/counts", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (countsResponse.ok) {
        const countsData = await countsResponse.json()
        setFolderCounts(countsData.counts)
      }

      // Fetch custom folders
      const foldersResponse = await fetch("/api/folders", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json()
        setCustomFolders(foldersData.folders)
      }

      // Fetch labels
      const labelsResponse = await fetch("/api/labels", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (labelsResponse.ok) {
        const labelsData = await labelsResponse.json()
        setLabels(labelsData.labels)
      }
    } catch (error) {
      console.error("Error fetching sidebar data:", error)
    }
  }

  const handleFolderSelect = (folder: string) => {
    onFolderSelect(folder)
    onClose()
  }

  const getUnreadCount = (folder: string) => {
    if (folder === "inbox" && newMessages > 0) {
      return newMessages
    }
    return folderCounts[folder]?.unread || 0
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">DITMail</h1>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-md">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <button
            onClick={() => {
              onCompose()
              onClose()
            }}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Compose</span>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Default Folders */}
          <div className="p-2">
            <nav className="space-y-1">
              {defaultFolders.map((folder) => {
                const Icon = folder.icon
                const unreadCount = getUnreadCount(folder.count)
                const isSelected = selectedFolder === folder.id

                return (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderSelect(folder.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-md transition-colors ${
                      isSelected ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <span>{folder.name}</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Custom Folders */}
          {customFolders.length > 0 && (
            <div className="border-t border-gray-200 p-2">
              <div className="px-3 py-2">
                <h3 className="text-sm font-medium text-gray-700">Folders</h3>
              </div>
              <div className="space-y-1">
                {customFolders.map((folder: any) => (
                  <button
                    key={folder._id}
                    onClick={() => handleFolderSelect(folder._id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-md transition-colors ${
                      selectedFolder === folder._id
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FolderIcon className="h-4 w-4" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    {folder.unreadCount > 0 && <span className="text-xs text-blue-600">{folder.unreadCount}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Labels */}
          {labels.length > 0 && (
            <div className="border-t border-gray-200 p-2">
              <div className="px-3 py-2">
                <h3 className="text-sm font-medium text-gray-700">Labels</h3>
              </div>
              <div className="space-y-1">
                {labels.map((label: any) => (
                  <button
                    key={label._id}
                    onClick={() => handleFolderSelect(`label:${label.name}`)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-md transition-colors ${
                      selectedFolder === `label:${label.name}`
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="truncate">{label.name}</span>
                    </div>
                    {label.count > 0 && <span className="text-xs text-gray-500">{label.count}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                window.location.href = "/settings"
                onClose()
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <UserIcon className="h-4 w-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => {
                onLogout()
                onClose()
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
