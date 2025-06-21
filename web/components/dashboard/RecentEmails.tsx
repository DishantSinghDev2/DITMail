"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { EnvelopeIcon, PaperClipIcon, StarIcon } from "@heroicons/react/24/outline"
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid"
import Link from "next/link"

interface Email {
  id: string
  subject: string
  from: {
    email: string
    name: string
  }
  to: Array<{
    email: string
    name: string
  }>
  date: string
  body: {
    text: string
    html: string
  }
  attachments: Array<{
    filename: string
    size: number
  }>
  flags: {
    seen: boolean
    flagged: boolean
    answered: boolean
  }
  folder: string
}

export function RecentEmails() {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchRecentEmails()
    }
  }, [session])

  const fetchRecentEmails = async () => {
    try {
      const response = await fetch("/api/emails/folders/inbox/messages?limit=10", {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch emails")
      }

      const data = await response.json()
      setEmails(data.messages || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails")
    } finally {
      setLoading(false)
    }
  }

  const toggleFlag = async (emailId: string, flagged: boolean) => {
    try {
      await fetch("/api/emails/messages/mark", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          messageIds: [emailId],
          action: flagged ? "unflag" : "flag",
        }),
      })

      setEmails((prev) =>
        prev.map((email) =>
          email.id === emailId ? { ...email, flags: { ...email.flags, flagged: !flagged } } : email,
        ),
      )
    } catch (err) {
      console.error("Failed to toggle flag:", err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Emails</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Emails</h3>
        <div className="text-center py-8">
          <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{error}</p>
          <button onClick={fetchRecentEmails} className="mt-2 text-blue-600 hover:text-blue-500 font-medium">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Emails</h3>
          <Link href="/dashboard/email" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            View all
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {emails.length === 0 ? (
          <div className="text-center py-8">
            <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No emails found</p>
            <p className="text-sm text-gray-400 mt-1">Your recent emails will appear here</p>
          </div>
        ) : (
          emails.map((email) => (
            <div key={email.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {email.from.name?.charAt(0).toUpperCase() || email.from.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${email.flags.seen ? "text-gray-600" : "text-gray-900"}`}>
                      {email.from.name || email.from.email}
                    </p>
                    <div className="flex items-center space-x-2">
                      {email.attachments.length > 0 && <PaperClipIcon className="h-4 w-4 text-gray-400" />}
                      <button
                        onClick={() => toggleFlag(email.id, email.flags.flagged)}
                        className="text-gray-400 hover:text-yellow-500"
                      >
                        {email.flags.flagged ? (
                          <StarIconSolid className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <StarIcon className="h-4 w-4" />
                        )}
                      </button>
                      <span className="text-xs text-gray-500">{formatDate(email.date)}</span>
                    </div>
                  </div>

                  <p className={`text-sm ${email.flags.seen ? "text-gray-500" : "text-gray-700"} mt-1`}>
                    {truncateText(email.subject || "(No subject)", 60)}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">{truncateText(email.body.text || "", 80)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {emails.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <Link href="/dashboard/email" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            View all emails →
          </Link>
        </div>
      )}
    </div>
  )
}
