"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { UsersIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"

interface UserSetupProps {
  onNext: (data: any) => void
  onPrevious: () => void
  data: any
}

interface User {
  email: string
  firstName: string
  lastName: string
  role: string
  password: string
  showPassword?: boolean // Optional field to toggle password visibility
}

export default function UserSetup({ onNext, onPrevious, data }: UserSetupProps) {
  const [users, setUsers] = useState<User[]>(
    data.users?.length > 0
      ? data.users
      : [
        {
          email: "",
          firstName: "",
          lastName: "",
          role: "user",
          password: "",
          showPassword: false, // Added to toggle password visibility
        },
      ],
  )
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [existingUsers, setExistingUsers] = useState<any[]>([])

  useEffect(() => {
    // Fetch existing users from API if available
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const { users } = await response.json()
          if (!users || !Array.isArray(users)) {
            return
          }
          const filteredUsers = users
            .filter((user: any) => user.email && user.name && user.role)
            .map((user: any) => ({
              id: user._id,
              email: user.email,
              firstName: user.name.split(" ")[0] || "",
              lastName: user.name.split(" ")[1] || "",
              role: user.role,
              password: "not-allowed",
              showPassword: false,
            }))
          if (filteredUsers.some((user: User) => user.email.split("@")[1] === data.domain.domain?.domain)) {
            setExistingUsers(filteredUsers)
          }
        } else {
          console.error("Failed to fetch existing users")
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    fetchUsers()
  }, [])

  const addUser = () => {
    setUsers([
      ...users,
      {
        email: "",
        firstName: "",
        lastName: "",
        role: "user",
        password: "",
        showPassword: false, // Added to toggle password visibility
      },
    ])
  }

  const removeUser = (index: number) => {
    if (users.length > 1) {
      setUsers(users.filter((_, i) => i !== index))
    }
  }

  const handleUserRemove = async (index: number, id: string) => {
    try {
      const token = localStorage.getItem("accessToken")
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setExistingUsers(existingUsers.filter((_, i) => i !== index))
        toast({
          title: "Success",
          description: "User removed successfully",
          variant: "default",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to remove user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error removing user:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const updateUser = (index: number, field: keyof User, value: string) => {
    const updatedUsers = [...users]
    if (field === "firstName" || field === "lastName") {
      // update the email based on first and last name
      const firstName = field === "firstName" ? value : updatedUsers[index].firstName
      const lastName = field === "lastName" ? value : updatedUsers[index].lastName
      updatedUsers[index].email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, "")
    }
    updatedUsers[index] = { ...updatedUsers[index], [field]: value }
    setUsers(updatedUsers)
  }

  const generatePassword = (index: number) => {
    const password = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase()
    updateUser(index, "password", password)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)


    if (users.length === 0 && existingUsers.length) {
      setLoading(false)
      onNext({ users: existingUsers })
      return
    }

    try {
      const token = localStorage.getItem("accessToken")
      const validUsers = users.filter((user) => user.email && user.firstName && user.lastName && user.password)

      if (validUsers.length === 0) {
        throw new Error("Please add at least one user")
      }

      // Create users
      const createdUsers = []
      for (const user of validUsers) {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...user,
            email: data.domain.domain ? `${user.email}@${data.domain.domain.domain}` : user.email,
          }),
        })

        if (response.ok) {
          const createdUser = await response.json()
          createdUsers.push(createdUser)
          if (existingUsers.length) createdUsers.push(...existingUsers)
          onNext({ users: createdUsers })
        } else {
          const error = await response.json()
          toast({
            title: "Error",
            description: error.error || "Failed to create user",
            variant: "destructive",
          })
        }
      }

    } catch (error) {
      console.error("Error creating users:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = users.some((user) => user.email && user.firstName && user.lastName && user.password)

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UsersIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Add team members</h2>
        <p className="text-gray-600">Create email accounts for your team members</p>
        {data.domain.domain && (
          <p className="text-sm text-blue-600 mt-2">Email addresses will use your domain: @{data.domain.domain.domain}</p>
        )}
      </div>

      {/* Show cards with existing users */}
      {existingUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 space-y-4"
        >
          {existingUsers.map((user, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 text-xs rounded-full ${user.role === "admin" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleUserRemove(index, user.id)
                  }}
                  disabled={loading}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {users.map((user, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">User {index + 1}</h3>
                {users.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUser(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={user.firstName}
                    onChange={(e) => updateUser(index, "firstName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={user.lastName}
                    onChange={(e) => updateUser(index, "lastName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email {data.domain.domain ? "Username" : "Address"} *
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={user.email}
                      onChange={(e) => updateUser(index, "email", e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={data.domain.domain ? "john.doe" : "john.doe@company.com"}
                    />
                    {data.domain && (
                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                        @{data.domain.domain.domain}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={user.role}
                    onChange={(e) => updateUser(index, "role", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={user.showPassword ? "text" : "password"}
                      value={user.password}
                      onChange={(e) => updateUser(index, "password", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm pr-10"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updatedUsers = [...users];
                        updatedUsers[index].showPassword = !updatedUsers[index].showPassword;
                        setUsers(updatedUsers);
                      }}
                      className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 hover:text-gray-900"
                    >
                      {user.showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => generatePassword(index)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm mt-2"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <button
          type="button"
          onClick={addUser}
          disabled={loading || users.some((user) => !user.email || !user.firstName || !user.lastName || !user.password)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Another User</span>
        </button>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onPrevious}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <button
            type="submit"
            disabled={loading || !(isFormValid || existingUsers.length > 0)}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:shadow-lg transition-all duration-200"
          >
            {loading ? "Creating Users..." : "Continue"}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
