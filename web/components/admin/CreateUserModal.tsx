"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  XMarkIcon,
  UsersIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast" // Assuming a custom toast hook

// --- TYPE DEFINITIONS ---
interface CreateUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

interface NewUser {
  email: string
  firstName: string
  lastName: string
  role: string
  password: string
  showPassword?: boolean
}

interface ExistingUser extends NewUser {
  id: string
}

interface OrgDetails {
  userLimit: number
  currentUserCount: number
  verifiedDomains: string[]
}

// --- MAIN COMPONENT ---
export default function CreateUserModal({ onClose, onSuccess }: CreateUserModalProps) {
  // --- STATE MANAGEMENT ---
  const [newUsers, setNewUsers] = useState<NewUser[]>([createNewUserObject()])
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([])
  const [orgDetails, setOrgDetails] = useState<OrgDetails | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [initialDataLoading, setInitialDataLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single")
  const [bulkText, setBulkText] = useState("")

  const { toast } = useToast()

  // --- HELPER FUNCTIONS ---
  function createNewUserObject(): NewUser {
    return {
      email: "",
      firstName: "",
      lastName: "",
      role: "user",
      password: "",
      showPassword: false,
    }
  }

  const remainingSeats = orgDetails ? orgDetails.userLimit - (orgDetails.currentUserCount + newUsers.length) : 0
  const canAddMoreUsers = orgDetails ? orgDetails.currentUserCount + newUsers.length < orgDetails.userLimit : false

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      setInitialDataLoading(true)
      try {
        const token = localStorage.getItem("accessToken")
        // In a real app, these would be parallel requests (Promise.all)
        // 1. Fetch existing users
        const usersResponse = await fetch("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!usersResponse.ok) throw new Error("Failed to fetch users.")
        const { users: fetchedUsers } = await usersResponse.json()

        // 2. Fetch organization details (domains, plan limits) - MOCKING THIS API CALL
        // Replace with your actual API endpoint for organization data
        const orgResponse = await fetch("/api/organizations", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!orgResponse.ok) throw new Error("Failed to fetch organization details.")
        const fetchedOrgDetails: OrgDetails = await orgResponse.json()

        // Process and set state
        setExistingUsers(
          fetchedUsers.map((user: any) => ({
            id: user._id,
            email: user.email,
            firstName: user.name.split(" ")[0] || "",
            lastName: user.name.split(" ")[1] || "",
            role: user.role,
            password: "not-allowed",
          })),
        )
        setOrgDetails(fetchedOrgDetails)

        if (fetchedOrgDetails.verifiedDomains && fetchedOrgDetails.verifiedDomains.length > 0) {
          setSelectedDomain(fetchedOrgDetails.verifiedDomains[0]) // Set default domain
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred."
        setError(errorMessage)
        toast({ title: "Error", description: errorMessage, variant: "destructive" })
      } finally {
        setInitialDataLoading(false)
      }
    }
    fetchData()
  }, [toast])

  // --- USER ACTION HANDLERS ---
  const addUser = () => {
    if (canAddMoreUsers) {
      setNewUsers([...newUsers, createNewUserObject()])
    } else {
      toast({
        title: "User limit reached",
        description: "You cannot add more users according to your current plan.",
        variant: "destructive",
      })
    }
  }

  const removeUser = (index: number) => {
    if (newUsers.length > 1) {
      setNewUsers(newUsers.filter((_, i) => i !== index))
    }
  }

  const updateUser = (index: number, field: keyof NewUser, value: any) => {
    const updatedUsers = [...newUsers]
    const user = updatedUsers[index]
    user[field] = value

    // Auto-generate email from first and last name
    if (field === "firstName" || field === "lastName") {
      const firstName = (field === "firstName" ? value : user.firstName).toLowerCase()
      const lastName = (field === "lastName" ? value : user.lastName).toLowerCase()
      user.email = `${firstName}.${lastName}`.replace(/\s+/g, "")
    }
    setNewUsers(updatedUsers)
  }

  const generatePassword = (index: number) => {
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 10).toUpperCase()
    updateUser(index, "password", password)
  }

  // --- BULK ADD LOGIC ---
  const handleBulkAdd = () => {
    const lines = bulkText.trim().split("\n")
    const usersToAdd: NewUser[] = []
    lines.forEach(line => {
      const [firstName, lastName, role = "user"] = line.split(",").map(item => item.trim())
      if (firstName && lastName) {
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, "")
        const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 10).toUpperCase()
        usersToAdd.push({ firstName, lastName, role, email, password, showPassword: false })
      }
    })

    const totalUsersAfterBulkAdd = orgDetails!.currentUserCount + usersToAdd.length
    if (totalUsersAfterBulkAdd > orgDetails!.userLimit) {
      toast({
        title: "Cannot Add All Users",
        description: `Your plan limit is ${orgDetails?.userLimit}. Adding these users would exceed it.`,
        variant: "destructive",
      })
      return
    }

    setNewUsers(usersToAdd)
    setActiveTab("single") // Switch back to the list view
    toast({ title: "Success", description: "Users added from list. Review and create them." })
  }

  // --- API INTERACTIONS ---
  const handleDeleteExistingUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return

    setLoading(true)
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setExistingUsers(prev => prev.filter(user => user.id !== userId))
        setOrgDetails(prev => prev ? { ...prev, currentUserCount: prev.currentUserCount - 1 } : null)
        toast({ title: "Success", description: "User deleted successfully." })
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete user.")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred."
      toast({ title: "Error", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const validUsers = newUsers.filter(u => u.firstName && u.lastName && u.email && u.password)
    if (validUsers.length === 0) {
      setError("Please fill out the details for at least one user.")
      setLoading(false)
      return
    }

    let successCount = 0
    for (const user of validUsers) {
      try {
        const token = localStorage.getItem("accessToken")
        const fullEmail = `${user.email}@${selectedDomain}`

        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...user, email: fullEmail }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(`Failed for ${fullEmail}: ${data.error}`)
        }
        successCount++
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred."
        setError(prev => (prev ? `${prev}\n${errorMessage}` : errorMessage))
      }
    }

    setLoading(false)
    if (successCount > 0) {
      toast({
        title: "Users Created",
        description: `${successCount} out of ${validUsers.length} users were created successfully.`,
      })
      onSuccess() // Trigger parent component refetch/close
    }
  }

  // --- RENDER LOGIC ---
  if (initialDataLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <LoaderCircle className="h-10 w-10 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Manage Team Members</h2>
              <p className="text-sm text-gray-500">Add, view, or remove users in your organization.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Plan Limit Info */}
          {orgDetails && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="font-semibold text-blue-800">
                You have used {orgDetails.currentUserCount} of {orgDetails.userLimit} available user seats.
                You can add {remainingSeats} more users.
              </p>
            </div>
          )}

          {/* Domain Selector */}
          {orgDetails && orgDetails.verifiedDomains.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Domain</label>
              <select
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {orgDetails.verifiedDomains.map(domain => (
                  <option key={domain} value={domain}>
                    @{domain}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Existing Users */}
          {existingUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-700">Existing Members</h3>
              {existingUsers.map(user => (
                <div key={user.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{user.role}</span>
                    <button onClick={() => handleDeleteExistingUser(user.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Users Section */}
          <div>
            <div className="flex border-b mb-4">
              <button onClick={() => setActiveTab('single')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'single' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Add Manually</button>
              <button onClick={() => setActiveTab('bulk')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'bulk' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Add in Bulk</button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'single' ? (
                <motion.div key="single" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {newUsers.map((user, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-800">New User {index + 1}</h3>
                        {newUsers.length > 1 && (
                          <button onClick={() => removeUser(index)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fields: FirstName, LastName, Email, Role, Password */}
                        <input name="firstName" placeholder="First Name" value={user.firstName} onChange={e => updateUser(index, 'firstName', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                        <input name="lastName" placeholder="Last Name" value={user.lastName} onChange={e => updateUser(index, 'lastName', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                        <div className="flex">
                          <input name="email" placeholder="username" value={user.email} onChange={e => updateUser(index, 'email', e.target.value)} className="w-full px-3 py-2 border-r-0 border rounded-l-md" />
                          <span className="inline-flex items-center px-3 border border-l-0 bg-gray-50 text-gray-500 rounded-r-md">@{selectedDomain}</span>
                        </div>
                        <select value={user.role} onChange={e => updateUser(index, 'role', e.target.value)} className="w-full px-3 py-2 border rounded-md">
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <div className="relative md:col-span-2">
                          <input type={user.showPassword ? 'text' : 'password'} placeholder="Password" value={user.password} onChange={e => updateUser(index, 'password', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                          <button type="button" onClick={() => updateUser(index, 'showPassword', !user.showPassword)} className="absolute inset-y-0 right-0 px-3 text-gray-500">{user.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                        <button type="button" onClick={() => generatePassword(index)} className="text-sm text-blue-600 hover:underline">Generate Password</button>
                      </div>
                    </motion.div>
                  ))}
                  {canAddMoreUsers && (
                    <button type="button" onClick={addUser} className="w-full py-2 border-2 border-dashed rounded-lg text-gray-500 hover:border-blue-500 flex items-center justify-center space-x-2">
                      <PlusIcon className="w-5 h-5" />
                      <span>Add Another User</span>
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div key="bulk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-sm text-gray-600 mb-2">Paste user data below, with each user on a new line. Format: <strong>firstName,lastName,role</strong> (role is optional and defaults to 'user').</p>
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    rows={8}
                    className="w-full p-2 border rounded-md font-mono text-sm"
                    placeholder="John,Doe,admin&#10;Jane,Smith,user&#10;Peter,Jones"
                  />
                  <button onClick={handleBulkAdd} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Process List</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {error && <div className="text-red-600 text-sm whitespace-pre-wrap">{error}</div>}
          </div>
          <div className="flex space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={loading || newUsers.every(u => !u.firstName)} className="group inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg disabled:opacity-50">
              {loading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <>Create Users <ArrowRightIcon className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}