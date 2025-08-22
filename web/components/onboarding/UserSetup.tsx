"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { UsersIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, ArrowRightIcon, LoaderCircle } from "lucide-react"

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
  showPassword?: boolean
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
            showPassword: false,
          },
        ],
  )
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [existingUsers, setExistingUsers] = useState<any[]>([])

  const customDomainName = data?.domain?.domain?.domain
  const emailSuffix = customDomainName ? `@${customDomainName}` : `@ditmail.online`

  useEffect(() => {
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
          if (
            filteredUsers.some(
              (user: User) => user.email.split("@")[1] === data.domain.domain?.domain,
            )
          ) {
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
        showPassword: false,
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
      const firstName = field === "firstName" ? value : updatedUsers[index].firstName
      const lastName = field === "lastName" ? value : updatedUsers[index].lastName
      updatedUsers[index].email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(
        /\s+/g,
        "",
      )
    }
    updatedUsers[index] = { ...updatedUsers[index], [field]: value }
    setUsers(updatedUsers)
  }

  const generatePassword = (index: number) => {
    const password =
      Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase()
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
      const validUsers = users.filter(
        (user) => user.email && user.firstName && user.lastName && user.password,
      )

      if (validUsers.length === 0) {
        throw new Error("Please add at least one user")
      }

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
            email: data.domain.domain
              ? `${user.email}@${data.domain.domain.domain}`
              : user.email,
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

  const isFormValid = users.some(
    (user) => user.email && user.firstName && user.lastName && user.password,
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <UsersIcon className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Add team members</h2>
        <p className="text-gray-500">Create email accounts for your team members.</p>
        {data.domain.domain && (
          <p className="text-sm text-blue-600 mt-2">
            Email addresses will use your domain: @{data.domain.domain.domain}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {existingUsers.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Existing Team Members</h3>
            {existingUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border-2 border-gray-200 rounded-lg bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <UsersIcon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {user.firstName} {user.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUserRemove(index, user.id)}
                      disabled={loading}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {users.map((user, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 border-2 border-gray-200 rounded-lg bg-white"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-gray-800">New User {index + 1}</h3>
                {users.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUser(index)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={user.firstName}
                    onChange={(e) => updateUser(index, "firstName", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={user.lastName}
                    onChange={(e) => updateUser(index, "lastName", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Email {data.domain.domain ? "Username" : "Address"} *
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={user.email}
                      onChange={(e) => updateUser(index, "email", e.target.value)}
                      className={`w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 ${
                        data.domain.domain ? "rounded-l-md" : "rounded-md"
                      }`}
                      placeholder={data.domain.domain ? "john.doe" : "john.doe@company.com"}
                    />
                    {data.domain.domain && (
                      <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md">
                        @{data.domain.domain.domain}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                  <select
                    value={user.role}
                    onChange={(e) => updateUser(index, "role", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={user.showPassword ? "text" : "password"}
                      value={user.password}
                      onChange={(e) => updateUser(index, "password", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm pr-10"
                      placeholder="Enter a secure password"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updatedUsers = [...users]
                        updatedUsers[index].showPassword = !updatedUsers[index].showPassword
                        setUsers(updatedUsers)
                      }}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    >
                      {user.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => generatePassword(index)}
                    className="mt-2 px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-md hover:bg-gray-200 transition-colors"
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
          className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Another User</span>
        </button>

        <div className="pt-4 flex justify-between items-center">
          <button
            type="button"
            onClick={onPrevious}
            className="text-sm font-semibold text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !(isFormValid || existingUsers.length > 0)}
            className="group inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg disabled:opacity-50 transition-all"
          >
            {loading ? (
              <LoaderCircle className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRightIcon className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  )
}