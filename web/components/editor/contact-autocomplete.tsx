// components/editor/ContactAutocomplete.tsx

"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

const RecipientPill = ({ email, onRemove }: { email: string; onRemove: () => void }) => (
  <div className="flex items-center gap-1 bg-gray-200 rounded-full px-2 py-1 text-sm">
    <Avatar className="h-5 w-5">
      <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
    <span className="truncate max-w-[150px]">{email}</span>
    <button type="button" onClick={onRemove} className="text-gray-500 hover:text-gray-800 rounded-full flex-shrink-0">
      <X className="h-3 w-3" />
    </button>
  </div>
)

export default function ContactAutocomplete({ value, onChange, placeholder, className }: ContactAutocompleteProps) {
  const [inputValue, setInputValue] = useState("")
  const [pills, setPills] = useState<string[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [suggestions, setSuggestions] = useState<Contact[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const emailsFromValue = value ? value.split(",").map(e => e.trim()).filter(Boolean) : []
    setPills(emailsFromValue)
  }, [value])

  useEffect(() => {
    const loadContacts = async () => {
      // Logic to load contacts from localStorage and API
    }
    loadContacts()
  }, [])

  useEffect(() => {
    if (inputValue.length < 1) {
      setShowSuggestions(false);
      return;
    }
    const filtered = contacts.filter(contact => !pills.includes(contact.email) && (contact.email.toLowerCase().includes(inputValue.toLowerCase()) || contact.name?.toLowerCase().includes(inputValue.toLowerCase()))).slice(0, 5)
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [inputValue, contacts, pills])

  const updateContactUsage = (email: string) => {
    // Logic to update lastUsed date for a contact
  }

  const addPill = (email: string) => {
    const trimmedEmail = email.trim()
    if (trimmedEmail && !pills.includes(trimmedEmail)) {
      const newPills = [...pills, trimmedEmail]
      onChange(newPills.join(", "))
      updateContactUsage(trimmedEmail)
    }
    setInputValue("")
    setShowSuggestions(false)
  }

  const removePill = (emailToRemove: string) => {
    const newPills = pills.filter(email => email !== emailToRemove)
    onChange(newPills.join(", "))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && inputValue === "" && pills.length > 0) {
      removePill(pills[pills.length - 1])
    }
    if (!showSuggestions) return;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setSelectedIndex(p => (p < suggestions.length - 1 ? p + 1 : p)); break;
      case "ArrowUp": e.preventDefault(); setSelectedIndex(p => (p > 0 ? p - 1 : -1)); break;
      case "Enter": case "Tab":
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault();
          addPill(suggestions[selectedIndex].email);
        } else if (inputValue) {
          e.preventDefault();
          addPill(inputValue);
        }
        break;
      case "Escape": setShowSuggestions(false); break;
    }
  }

  return (
    <div className="relative">
      <div ref={containerRef} className={`flex items-center flex-wrap gap-1 p-1 border rounded-md ${className}`} onClick={() => inputRef.current?.focus()}>
        {pills.map(email => (
          <RecipientPill key={email} email={email} onRemove={() => removePill(email)} />
        ))}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={pills.length === 0 ? placeholder : ""}
          className="flex-1 border-none outline-none focus:ring-0 shadow-none p-0 h-auto bg-transparent min-w-[120px]"
        />
      </div>
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          {suggestions.map((contact, index) => (
            <div key={contact.email} className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === selectedIndex ? "bg-blue-50" : ""}`} onClick={() => addPill(contact.email)}>
              <div className="text-sm font-medium">{contact.name || contact.email}</div>
              {contact.name && <div className="text-xs text-gray-500">{contact.email}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}