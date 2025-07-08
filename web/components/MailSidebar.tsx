"use client"

import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react"
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
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon, // <-- Added for the menu
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
    // State for collapse/expand functionality
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isHovering, setIsHovering] = useState(false)

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

    // Determine if the sidebar should be visually expanded
    const isExpanded = !isCollapsed || isHovering

    // Use localStorage to persist the collapsed state
    useEffect(() => {
      const storedState = localStorage.getItem("mailSidebarCollapsed")
      if (storedState !== null) {
        setIsCollapsed(storedState === "true")
      }
    }, [])

    useEffect(() => {
      localStorage.setItem("mailSidebarCollapsed", String(isCollapsed))
    }, [isCollapsed])

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
      "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
      "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
    ]

    useEffect(() => {
      fetchAllData()
      const interval = setInterval(fetchFolderCounts, 30000)
      return () => clearInterval(interval)
    }, [])

    useImperativeHandle(ref, () => ({
      refreshCount: () => fetchFolderCounts()
    }))

    const fetchAllData = async () => {
      setLoading(true)
      await Promise.all([fetchFolderCounts(), fetchCustomFolders(), fetchLabels()])
      setLoading(false)
    }

    // --- API functions (fetchFolderCounts, fetchCustomFolders, etc.) remain unchanged ---
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
      if (folder === "inbox" && newMessages > 0) return newMessages
      return folderCounts[folder]?.unread || 0
    }

    const getTotalCount = (folder: string) => {
      return folderCounts[folder]?.total || 0
    }

    return (
      <div
        className={`relative bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out ${
          isExpanded ? "w-64" : "w-[3.6rem]"
        }`}
        onMouseEnter={() => isCollapsed && setIsHovering(true)}
        onMouseLeave={() => isCollapsed && setIsHovering(false)}
      >
        {/* Header */}
        <div className="p-4 flex items-center space-x-4 h-[65px]">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-gray-500 hover:text-gray-900 rounded-md flex-shrink-0"
            title="Toggle menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div
            className={`overflow-hidden transition-opacity duration-200 ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
              DITMail
            </h1>
          </div>
        </div>

        {/* Compose Button */}
        <div className="px-2 py-4">
          <button
            onClick={onCompose}
            className={`w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-medium shadow-sm hover:shadow-md transition-all duration-300 ease-in-out`}
            title="Compose"
          >
            <PlusIcon className="h-5 w-5 flex-shrink-0" />
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isExpanded ? "max-w-full" : "max-w-0"
              }`}
            >
              <span className="whitespace-nowrap pl-1">Compose</span>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2">
          {/* Default Folders */}
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
                  title={folder.name}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors group ${
                    isExpanded ? "justify-between" : ""
                  } ${
                    isSelected
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!isExpanded &&
                        unreadCount && (
                          <span className="absolute top-[-2px] right-[-2px] flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                          </span>
                        )}
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        isExpanded ? "max-w-full" : "max-w-0"
                      }`}
                    >
                      <span
                        className={`whitespace-nowrap ${
                          isSelected ? "font-medium" : ""
                        }`}
                      >
                        {folder.name}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="flex items-center space-x-2">
                      {totalCount > 0 && (
                        <span className={`text-xs ${unreadCount > 0 ? "text-blue-600" : "text-gray-500"}`}>
                          {totalCount}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Custom Folders */}
          <div className="border-t border-gray-200 mt-2 pt-2">
            <div className="flex items-center justify-between px-2 py-2">
              {isExpanded && (
                <button
                  onClick={() => setShowCustomFolders(!showCustomFolders)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showCustomFolders ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                  <span>Folders</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (isExpanded) {
                    setIsCreatingFolder(true)
                  } else {
                    setIsCollapsed(false)
                    setIsHovering(false)
                  }
                }}
                className={`p-1 text-gray-400 hover:text-gray-600 rounded transition-colors ${!isExpanded ? 'w-full' : ''}`}
                title="Create new folder"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            {isExpanded && showCustomFolders && (
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
                  <div key={folder._id} className="group flex items-center justify-between px-1 py-1 text-sm">
                    <button
                      onClick={() => onFolderSelect(folder._id)}
                      title={folder.name}
                      className={`flex items-center space-x-3 flex-1 p-1 rounded-md ${selectedFolder === folder._id ? "text-blue-700 bg-blue-50" : "text-gray-700 hover:bg-gray-100"}`}
                    >
                      <FolderIcon className="h-4 w-4 flex-shrink-0 ml-2" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {folderCounts[folder._id]?.unread > 0 && (
                        <span className="text-xs text-blue-600">{folderCounts[folder._id].unread}</span>
                      )}
                      <button
                        onClick={() => deleteCustomFolder(folder._id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
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
          <div className="border-t border-gray-200 mt-2 pt-2">
             <div className="flex items-center justify-between px-2 py-2">
              {isExpanded && (
                 <button
                  onClick={() => setShowLabels(!showLabels)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showLabels ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                  <span>Labels</span>
                </button>
              )}
               <button
                 onClick={() => {
                  if (isExpanded) {
                    setIsCreatingLabel(true)
                  } else {
                    setIsCollapsed(false)
                    setIsHovering(false)
                  }
                }}
                className={`p-1 text-gray-400 hover:text-gray-600 rounded transition-colors ${!isExpanded ? 'w-full' : ''}`}
                 title="Create new label"
               >
                 <PlusIcon className="h-4 w-4" />
               </button>
             </div>
            {isExpanded && showLabels && (
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
                            className={`w-4 h-4 rounded-full border-2 ${newLabelColor === color ? "border-gray-400" : "border-transparent"}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {labels.map((label: any) => (
                  <div key={label._id} className="group flex items-center justify-between px-1 py-1 text-sm">
                    <button
                      onClick={() => onFolderSelect(`label:${label.name}`)}
                      title={label.name}
                      className={`flex items-center space-x-3 w-full p-1 rounded-md ${selectedFolder === `label:${label.name}` ? "text-blue-700 bg-blue-50" : "text-gray-700 hover:bg-gray-100"}`}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: label.color }} />
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
          <div
            className={`flex items-center space-x-3 ${!isExpanded ? "justify-center" : ""}`}
          >
            <div title={user?.name} className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div
              className={`flex-1 flex justify-between items-center overflow-hidden transition-all duration-300 ${ isExpanded ? "max-w-full" : "max-w-0"}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
              <div className="flex space-x-1 flex-shrink-0">
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
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    )
  }
)

export default MailSidebar