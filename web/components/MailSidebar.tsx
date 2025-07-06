"use client"

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react"
import {
  InboxIcon,
  PaperAirplaneIcon,
  DocumentIcon,
  TrashIcon,
  StarIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  Cog6ToothIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline"

interface MailSidebarProps {
  selectedFolder: string
  onFolderSelect: (folder: string) => void
  onCompose: () => void
  newMessages: number
  user: any
  onLogout: () => void
}
export type MailSidebarHandle = {
  refreshCount: () => void
}

const MailSidebar = forwardRef<MailSidebarHandle, MailSidebarProps>(
  (
    {
      selectedFolder,
      onFolderSelect,
      onCompose,
      newMessages,
      user,
      onLogout,
    },
    ref
  ) => {
    const [folderCounts, setFolderCounts] = useState<{ [key: string]: any }>({})
    const [customFolders, setCustomFolders] = useState([])
    const [labels, setLabels] = useState([])
    const [showLabels, setShowLabels] = useState(true)
    const [showCustomFolders, setShowCustomFolders] = useState(true)
    const [isCreatingFolder, setIsCreatingFolder] = useState(false)
    const [isCreatingLabel, setIsCreatingLabel] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [newLabelName, setNewLabelName] = useState("")
    const [newLabelColor, setNewLabelColor] = useState("#3B82F6")
    const [loading, setLoading] = useState(false)

    const defaultFolders = [
      { id: "inbox", name: "Inbox", icon: InboxIcon, count: "inbox" },
      { id: "sent", name: "Sent", icon: PaperAirplaneIcon, count: "sent" },
      { id: "drafts", name: "Drafts", icon: DocumentIcon, count: "drafts" },
      { id: "starred", name: "Starred", icon: StarIcon, count: "starred" },
      { id: "archive", name: "Archive", icon: ArchiveBoxIcon, count: "archive" },
      { id: "spam", name: "Spam", icon: ExclamationTriangleIcon, count: "spam" },
      { id: "trash", name: "Trash", icon: TrashIcon, count: "trash" },
    ]

    const labelColors = [
      "#3B82F6",
      "#EF4444",
      "#10B981",
      "#F59E0B",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#84CC16",
      "#F97316",
      "#6366F1",
    ]

    useEffect(() => {
      fetchAllData()
      const interval = setInterval(fetchFolderCounts, 30000) // Refresh counts every 30s
      return () => clearInterval(interval)
    }, [])

    const refreshCount = () => fetchFolderCounts


    useImperativeHandle(ref, () => ({
      refreshCount,
    }))


    const fetchAllData = async () => {
      setLoading(true)
      await Promise.all([fetchFolderCounts(), fetchCustomFolders(), fetchLabels()])
      setLoading(false)
    }

    const fetchFolderCounts = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/messages/counts", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setFolderCounts(data.counts)
        }
      } catch (error) {
        console.error("Error fetching folder counts:", error)
      }
    }

    const fetchCustomFolders = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/folders", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setCustomFolders(data.folders)
        }
      } catch (error) {
        console.error("Error fetching custom folders:", error)
      }
    }

    const fetchLabels = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/labels", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setLabels(data.labels)
        }
      } catch (error) {
        console.error("Error fetching labels:", error)
      }
    }

    const createCustomFolder = async () => {
      if (!newFolderName.trim()) return

      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/folders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newFolderName.trim() }),
        })

        if (response.ok) {
          setNewFolderName("")
          setIsCreatingFolder(false)
          await fetchCustomFolders()
          await fetchFolderCounts()
        } else {
          const error = await response.json()
          alert(error.error || "Failed to create folder")
        }
      } catch (error) {
        console.error("Error creating folder:", error)
        alert("Failed to create folder")
      }
    }

    const createLabel = async () => {
      if (!newLabelName.trim()) return

      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/labels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newLabelName.trim(),
            color: newLabelColor,
          }),
        })

        if (response.ok) {
          setNewLabelName("")
          setNewLabelColor("#3B82F6")
          setIsCreatingLabel(false)
          await fetchLabels()
        } else {
          const error = await response.json()
          alert(error.error || "Failed to create label")
        }
      } catch (error) {
        console.error("Error creating label:", error)
        alert("Failed to create label")
      }
    }

    const deleteCustomFolder = async (folderId: string) => {
      if (!confirm("Are you sure you want to delete this folder?")) return

      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch(`/api/folders/${folderId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          await fetchCustomFolders()
          await fetchFolderCounts()
          if (selectedFolder === folderId) {
            onFolderSelect("inbox")
          }
        } else {
          const error = await response.json()
          alert(error.error || "Failed to delete folder")
        }
      } catch (error) {
        console.error("Error deleting folder:", error)
        alert("Failed to delete folder")
      }
    }

    const deleteLabel = async (labelId: string) => {
      if (!confirm("Are you sure you want to delete this label?")) return

      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch(`/api/labels/${labelId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          await fetchLabels()
        } else {
          const error = await response.json()
          alert(error.error || "Failed to delete label")
        }
      } catch (error) {
        console.error("Error deleting label:", error)
        alert("Failed to delete label")
      }
    }

    const getUnreadCount = (folder: string) => {
      if (folder === "inbox" && newMessages > 0) {
        return newMessages
      }
      return folderCounts[folder]?.unread || 0
    }

    const getTotalCount = (folder: string) => {
      return folderCounts[folder]?.total || 0
    }

    return (
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">DITMail</h1>
            <button
              onClick={() => (window.location.href = "/settings")}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={onCompose}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
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
                const totalCount = getTotalCount(folder.count)
                const isSelected = selectedFolder === folder.id

                return (
                  <button
                    key={folder.id}
                    onClick={() => onFolderSelect(folder.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors group ${isSelected ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <span>{folder.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                      {totalCount > 0 && unreadCount === 0 && <span className="text-xs text-gray-400">{totalCount}</span>}
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Custom Folders */}
          <div className="border-t border-gray-200 p-2">
            <div className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => setShowCustomFolders(!showCustomFolders)}
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {showCustomFolders ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                <span>Folders</span>
              </button>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Create new folder"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {showCustomFolders && (
              <div className="space-y-1">
                {isCreatingFolder && (
                  <div className="px-3 py-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") createCustomFolder()
                        if (e.key === "Escape") setIsCreatingFolder(false)
                      }}
                      onBlur={() => {
                        if (!newFolderName.trim()) setIsCreatingFolder(false)
                      }}
                      placeholder="Folder name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                      maxLength={50}
                    />
                  </div>
                )}
                {customFolders.map((folder: any) => (
                  <div key={folder._id} className="group flex items-center justify-between px-3 py-2">
                    <button
                      onClick={() => onFolderSelect(folder._id)}
                      className={`flex items-center space-x-3 text-sm flex-1 py-1 ${selectedFolder === folder._id ? "text-blue-700 font-medium" : "text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <FolderIcon className="h-4 w-4" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <div className="flex items-center space-x-1">
                      {folderCounts[folder._id]?.unread > 0 && (
                        <span className="text-xs text-blue-600">{folderCounts[folder._id].unread}</span>
                      )}
                      <button
                        onClick={() => deleteCustomFolder(folder._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded transition-all"
                        title="Delete folder"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="border-t border-gray-200 p-2">
            <div className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {showLabels ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                <span>Labels</span>
              </button>
              <button
                onClick={() => setIsCreatingLabel(true)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Create new label"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {showLabels && (
              <div className="space-y-1">
                {isCreatingLabel && (
                  <div className="px-3 py-2 space-y-2">
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") createLabel()
                        if (e.key === "Escape") setIsCreatingLabel(false)
                      }}
                      placeholder="Label name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                      maxLength={30}
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Color:</span>
                      <div className="flex space-x-1">
                        {labelColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewLabelColor(color)}
                            className={`w-4 h-4 rounded-full border-2 ${newLabelColor === color ? "border-gray-400" : "border-transparent"
                              }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {labels.map((label: any) => (
                  <div key={label._id} className="group flex items-center justify-between px-3 py-2">
                    <button
                      onClick={() => onFolderSelect(`label:${label.name}`)}
                      className={`w-full flex items-center space-x-3 text-sm py-1 ${selectedFolder === `label:${label.name}`
                        ? "text-blue-700 font-medium"
                        : "text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                      <span className="truncate flex-1 text-left">{label.name}</span>
                      {label.count > 0 && <span className="text-xs text-gray-500">{label.count}</span>}
                    </button>
                    <button
                      onClick={() => deleteLabel(label._id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded transition-all ml-1"
                      title="Delete label"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Menu */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => (window.location.href = "/settings")}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Settings"
              >
                <UserIcon className="h-4 w-4" />
              </button>
              <button
                onClick={onLogout}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    )
  }
)

export default MailSidebar