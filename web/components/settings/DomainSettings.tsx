"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline"
import Modal from "@/components/ui/Modal"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface Domain {
  _id: string
  domain: string
  organizationId: string
  status: "pending" | "verified" | "failed"
  verificationToken: string
  dnsRecords: {
    mx: { name: string; value: string; priority: number }[]
    txt: { name: string; value: string }[]
    cname: { name: string; value: string }[]
  }
  sslEnabled: boolean
  catchAllEnabled: boolean
  createdAt: string
  verifiedAt?: string
  lastCheckedAt?: string
}

interface DomainStats {
  totalEmails: number
  totalAliases: number
  storageUsed: number
  lastActivity: string
}

export default function DomainSettings({ user }: { user: any }) {
  const { token } = useAuth()
  const [domains, setDomains] = useState<Domain[]>([])
  const [domainStats, setDomainStats] = useState<Record<string, DomainStats>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDnsModal, setShowDnsModal] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [newDomain, setNewDomain] = useState("")
  const [verifying, setVerifying] = useState<string | null>(null)

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/domains", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setDomains(data)

        // Fetch stats for each domain
        const statsPromises = data.map(async (domain: Domain) => {
          try {
            const statsResponse = await fetch(`/api/domains/${domain._id}/stats`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (statsResponse.ok) {
              const stats = await statsResponse.json()
              return { domainId: domain._id, stats }
            }
          } catch (error) {
            console.error(`Error fetching stats for domain ${domain.domain}:`, error)
          }
          return null
        })

        const statsResults = await Promise.all(statsPromises)
        const statsMap: Record<string, DomainStats> = {}

        statsResults.forEach((result) => {
          if (result) {
            statsMap[result.domainId] = result.stats
          }
        })

        setDomainStats(statsMap)
      }
    } catch (error) {
      console.error("Error fetching domains:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return

    try {
      setSaving(true)

      const response = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      })

      if (response.ok) {
        const newDomainData = await response.json()
        setDomains([...domains, newDomainData])
        setShowAddModal(false)
        setNewDomain("")
        alert("Domain added successfully! Please configure DNS records to verify.")
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to add domain")
      }
    } catch (error) {
      console.error("Error adding domain:", error)
      alert(`Failed to add domain: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyDomain = async (domainId: string) => {
    try {
      setVerifying(domainId)

      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const updatedDomain = await response.json()
        setDomains(domains.map((d) => (d._id === domainId ? updatedDomain : d)))

        if (updatedDomain.status === "verified") {
          alert("Domain verified successfully!")
        } else {
          alert("Domain verification failed. Please check your DNS records.")
        }
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to verify domain")
      }
    } catch (error) {
      console.error("Error verifying domain:", error)
      alert(`Failed to verify domain: ${error.message}`)
    } finally {
      setVerifying(null)
    }
  }

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to delete the domain "${domainName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/domains/${domainId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setDomains(domains.filter((d) => d._id !== domainId))
        alert("Domain deleted successfully!")
      } else {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete domain")
      }
    } catch (error) {
      console.error("Error deleting domain:", error)
      alert(`Failed to delete domain: ${error.message}`)
    }
  }

  const handleToggleCatchAll = async (domainId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/domains/${domainId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ catchAllEnabled: enabled }),
      })

      if (response.ok) {
        const updatedDomain = await response.json()
        setDomains(domains.map((d) => (d._id === domainId ? updatedDomain : d)))
        alert(`Catch-all ${enabled ? "enabled" : "disabled"} successfully!`)
      } else {
        throw new Error("Failed to update catch-all setting")
      }
    } catch (error) {
      console.error("Error updating catch-all:", error)
      alert("Failed to update catch-all setting")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case "pending":
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Domain Management</h3>
          <p className="text-sm text-gray-500">Manage your organization's email domains</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Domain
        </button>
      </div>

      {/* Domains List */}
      {domains.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No domains configured</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first email domain.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Domain
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {domains.map((domain) => (
            <div key={domain._id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-medium text-gray-900">{domain.domain}</h4>
                  {getStatusIcon(domain.status)}
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(domain.status)}`}>
                    {domain.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {domain.status === "pending" && (
                    <button
                      onClick={() => handleVerifyDomain(domain._id)}
                      disabled={verifying === domain._id}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {verifying === domain._id ? "Verifying..." : "Verify"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedDomain(domain)
                      setShowDnsModal(true)
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    DNS Records
                  </button>
                  <button
                    onClick={() => handleDeleteDomain(domain._id, domain.domain)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Domain Stats */}
              {domainStats[domain._id] && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{domainStats[domain._id].totalEmails}</div>
                    <div className="text-sm text-gray-500">Total Emails</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{domainStats[domain._id].totalAliases}</div>
                    <div className="text-sm text-gray-500">Aliases</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {(domainStats[domain._id].storageUsed / 1024 / 1024).toFixed(1)}MB
                    </div>
                    <div className="text-sm text-gray-500">Storage Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {domainStats[domain._id].lastActivity
                        ? new Date(domainStats[domain._id].lastActivity).toLocaleDateString()
                        : "No activity"}
                    </div>
                    <div className="text-sm text-gray-500">Last Activity</div>
                  </div>
                </div>
              )}

              {/* Domain Settings */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Catch-All Email</label>
                    <p className="text-sm text-gray-500">
                      Forward all emails to non-existent addresses to a default mailbox
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleCatchAll(domain._id, !domain.catchAllEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      domain.catchAllEnabled ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        domain.catchAllEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Domain Info */}
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex justify-between">
                  <span>Added: {new Date(domain.createdAt).toLocaleDateString()}</span>
                  {domain.verifiedAt && <span>Verified: {new Date(domain.verifiedAt).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Domain Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Domain">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Domain Name</label>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter your domain name without any protocol (http/https) or subdomain.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setShowAddModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddDomain}
            disabled={saving || !newDomain.trim()}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Domain"}
          </button>
        </div>
      </Modal>

      {/* DNS Records Modal */}
      <Modal
        isOpen={showDnsModal}
        onClose={() => setShowDnsModal(false)}
        title={`DNS Records for ${selectedDomain?.domain}`}
        size="large"
      >
        {selectedDomain && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">DNS Configuration Required</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Add these DNS records to your domain's DNS settings to enable email functionality. Changes may
                      take up to 24 hours to propagate.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MX Records */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">MX Records</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedDomain.dnsRecords.mx.map((record, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{record.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{record.value}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.priority}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => copyToClipboard(record.value)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TXT Records */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">TXT Records</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedDomain.dnsRecords.txt.map((record, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{record.name}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-900 break-all">{record.value}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => copyToClipboard(record.value)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CNAME Records */}
            {selectedDomain.dnsRecords.cname.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">CNAME Records</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedDomain.dnsRecords.cname.map((record, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{record.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {record.value}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => copyToClipboard(record.value)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <DocumentDuplicateIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowDnsModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
