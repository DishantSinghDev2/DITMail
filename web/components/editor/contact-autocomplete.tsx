"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface Contact {
  email: string
  name?: string
  lastUsed?: Date | string
}

interface ContactAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const toDate = (d: unknown): Date | undefined => {
  if (!d) return undefined
  const dt = new Date(d as string | number | Date)
  return isNaN(dt.getTime()) ? undefined : dt
}

export default function ContactAutocomplete({ value, onChange, placeholder, className }: ContactAutocompleteProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [suggestions, setSuggestions] = useState<Contact[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load contacts from localStorage and API
  useEffect(() => {
    const loadContacts = async () => {
      // Load from localStorage first for instant results
      const localContacts = localStorage.getItem("ditmail-contacts")
      if (localContacts) {
        const parsed = JSON.parse(localContacts).map((c: any) => ({
          ...c,
          lastUsed: toDate(c.lastUsed),
        }))
        setContacts(parsed)
      }

      // Load from API in background
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/contacts", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          const apiContacts = data.contacts.map((contact: any) => ({
            email: contact.email,
            name: contact.name,
            lastUsed: toDate(contact.lastUsed),
          }))
          setContacts(apiContacts)
          localStorage.setItem(
            "gmail-contacts",
            JSON.stringify(
              apiContacts.map((c) => ({
                ...c,
                // store as ISO string for consistency
                lastUsed: c.lastUsed ? (c.lastUsed as Date).toISOString() : undefined,
              })),
            ),
          )
        }
      } catch (error) {
        console.error("Error loading contacts:", error)
      }
    }

    loadContacts()
  }, [])

  // Filter suggestions based on input
  useEffect(() => {
    if (!value || value.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const lastEmail = value.split(",").pop()?.trim() || ""
    if (lastEmail.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const filtered = contacts
      .filter(
        (contact) =>
          contact.email.toLowerCase().includes(lastEmail.toLowerCase()) ||
          contact.name?.toLowerCase().includes(lastEmail.toLowerCase()),
      )
      .slice(0, 5)
      .sort((a, b) => {
        const ad = a.lastUsed ? +a.lastUsed : 0
        const bd = b.lastUsed ? +b.lastUsed : 0
        return bd - ad || a.email.localeCompare(b.email)
      })

    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
    setSelectedIndex(-1)
  }, [value, contacts])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
      case "Tab":
        if (selectedIndex >= 0) {
          e.preventDefault()
          selectContact(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const selectContact = (contact: Contact) => {
    const emails = value
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
    emails[emails.length - 1] = contact.email
    const newValue = emails.join(", ") + (emails.length > 0 ? ", " : "")
    onChange(newValue)
    setShowSuggestions(false)
    setSelectedIndex(-1)

    // Update last used
    updateContactUsage(contact.email)
  }

  const updateContactUsage = (email: string) => {
    const updatedContacts = contacts.map((contact) =>
      contact.email === email ? { ...contact, lastUsed: new Date() } : contact,
    )
    setContacts(updatedContacts)
    localStorage.setItem(
      "ditmail-contacts",
      JSON.stringify(
        updatedContacts.map((c) => ({
          ...c,
          lastUsed: c.lastUsed ? (c.lastUsed as Date).toISOString() : undefined,
        })),
      ),
    )
  }

  const removeLastEmail = () => {
    const emails = value
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
    if (emails.length > 0) {
      emails.pop()
      onChange(emails.length > 0 ? emails.join(", ") + ", " : "")
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value && setSuggestions(contacts.slice(0, 5))}
          placeholder={placeholder}
          className={className}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeLastEmail}
            className="ml-1 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((contact, index) => (
            <div
              key={contact.email}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === selectedIndex ? "bg-blue-50" : ""}`}
              onClick={() => selectContact(contact)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{contact.email}</div>
                  {contact.name && <div className="text-xs text-gray-500">{contact.name}</div>}
                </div>
                {contact.lastUsed && (
                  <div className="text-xs text-gray-400">{new Date(contact.lastUsed).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
