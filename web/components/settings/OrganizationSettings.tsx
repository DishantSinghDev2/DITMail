"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { PencilIcon, TrashIcon, UserPlusIcon } from "@heroicons/react/24/outline"
import Modal from "@/components/ui/Modal"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface Organization {
  _id: string
  name: string
  description: string
  settings: {
    allowUserRegistration: boolean
    requireEmailVerification: boolean
    maxUsersPerOrg: number
    defaultUserRole: string
  }
  createdAt: string
  updatedAt: string
}

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  lastLoginAt: string
  createdAt: string
}

export default function OrganizationSettings({ user }: { user: any }) {
  const { token } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("user")
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    allowUserRegistration: false,
    requireEmailVerification: true,
    maxUsersPerOrg: 100,
    defaultUserRole: "user",
  })

  useEffect(() => {
    fetchOrganizationData()
  }, [])

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)

      // Fetch organization details
      const orgResponse = await fetch(`/api/organizations/${user.organizationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganization(orgData)
        setEditForm({
          name: orgData.name,
          description: orgData.description || "",
          allowUserRegistration: orgData.settings?.allowUserRegistration || false,
          requireEmailVerification: orgData.settings?.requireEmailVerification || true,
          maxUsersPerOrg: orgData.settings?.maxUsersPerOrg || 100,
          defaultUserRole: orgData.settings?.defaultUserRole || "user",
        })
      }

      // Fetch organization users
      const usersResponse = await fetch(`/api/organizations/${user.organizationId}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error("Error fetching organization data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)

      const response = await fetch(`/api/organizations/${user.organizationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          settings: {
            allowUserRegistration: editForm.allowUserRegistration,
            requireEmailVerification: editForm.requireEmailVerification,
            maxUsersPerOrg: editForm.maxUsersPerOrg,
            defaultUserRole: editForm.defaultUserRole,
          },
        }),
      })

      if (response.ok) {
        const updatedOrg = await response.json()
        setOrganization(updatedOrg)
        setShowEditModal(false)
        alert("Organization settings updated successfully!")
      } else {
        throw new Error("Failed to update organization")
      }
    } catch (error) {
      console.error("Error updating organization:", error)
      alert("Failed to update organization settings")
    } finally {
      setSaving(false)
    }
  }

  const handleInviteUser = async () => {
    try {
      setSaving(true)

      const response = await fetch(`/api/organizations/${user.organizationId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      if (response.ok) {
        setShowInviteModal(false)
        setInviteEmail("")
        setInviteRole("user")
        fetchOrganizationData() // Refresh data
        alert("User invitation sent successfully!")
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to invite user")
      }
    } catch (error) {
      console.error("Error inviting user:", error)
      alert(`Failed to invite user: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the organization?")) {
      return
    }

    try {
      const response = await fetch(`/api/organizations/${user.organizationId}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchOrganizationData() // Refresh data
        alert("User removed successfully!")
      } else {
        throw new Error("Failed to remove user")
      }
    } catch (error) {
      console.error("Error removing user:", error)
      alert("Failed to remove user")
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/organizations/${user.organizationId}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        fetchOrganizationData() // Refresh data
        alert("User role updated successfully!")
      } else {
        throw new Error("Failed to update user role")
      }
    } catch (error) {
      console.error("Error updating user role:", error)
      alert("Failed to update user role")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Organization not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Organization Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Organization Information</h3>
            <p className="text-sm text-gray-500">Manage your organization details and settings</p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization Name</label>
            <p className="mt-1 text-sm text-gray-900">{organization.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <p className="mt-1 text-sm text-gray-900">{organization.description || "No description"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Created</label>
            <p className="mt-1 text-sm text-gray-900">{new Date(organization.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Users</label>
            <p className="mt-1 text-sm text-gray-900">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Organization Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Organization Settings</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow User Registration</label>
              <p className="text-sm text-gray-500">Allow new users to register for this organization</p>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                organization.settings?.allowUserRegistration ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {organization.settings?.allowUserRegistration ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Verification Required</label>
              <p className="text-sm text-gray-500">Require email verification for new users</p>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                organization.settings?.requireEmailVerification
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {organization.settings?.requireEmailVerification ? "Required" : "Optional"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Max Users</label>
              <p className="text-sm text-gray-500">Maximum number of users allowed</p>
            </div>
            <span className="text-sm text-gray-900">{organization.settings?.maxUsersPerOrg || 100}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Default User Role</label>
              <p className="text-sm text-gray-500">Default role for new users</p>
            </div>
            <span className="text-sm text-gray-900 capitalize">{organization.settings?.defaultUserRole || "user"}</span>
          </div>
        </div>
      </div>

      {/* Users Management */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Organization Users</h3>
            <p className="text-sm text-gray-500">Manage users in your organization</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Invite User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((orgUser) => (
                <tr key={orgUser._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {orgUser.firstName} {orgUser.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{orgUser.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={orgUser.role}
                      onChange={(e) => handleUpdateUserRole(orgUser._id, e.target.value)}
                      className="text-sm border-gray-300 rounded-md"
                      disabled={orgUser._id === user._id} // Can't change own role
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        orgUser.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {orgUser.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {orgUser.lastLoginAt ? new Date(orgUser.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {orgUser._id !== user._id && (
                      <button onClick={() => handleRemoveUser(orgUser._id)} className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Organization Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Organization">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={editForm.allowUserRegistration}
              onChange={(e) => setEditForm({ ...editForm, allowUserRegistration: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Allow User Registration</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={editForm.requireEmailVerification}
              onChange={(e) => setEditForm({ ...editForm, requireEmailVerification: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Require Email Verification</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Users Per Organization</label>
            <input
              type="number"
              value={editForm.maxUsersPerOrg}
              onChange={(e) => setEditForm({ ...editForm, maxUsersPerOrg: Number.parseInt(e.target.value) })}
              min="1"
              max="10000"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Default User Role</label>
            <select
              value={editForm.defaultUserRole}
              onChange={(e) => setEditForm({ ...editForm, defaultUserRole: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setShowEditModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>

      {/* Invite User Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setShowInviteModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInviteUser}
            disabled={saving || !inviteEmail}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Sending..." : "Send Invitation"}
          </button>
        </div>
      </Modal>
    </div>
  )
}
