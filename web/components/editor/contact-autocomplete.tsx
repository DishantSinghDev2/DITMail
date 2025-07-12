"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { X } from "lucide-react"

// --- INTERFACES & HELPERS ---
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

// A simple regex to validate email format before adding
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- RECIPIENT PILL SUB-COMPONENT ---
const RecipientPill = ({ email, onRemove }: { email: string; onRemove: () => void }) => (
  <div className="flex items-center gap-1 bg-gray-200 rounded-full px-2 py-1 text-sm">
    <Avatar className="h-5 w-5">
      <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
    <span className="truncate max-w-[150px]">{email}</span>
    <button type="button" onClick={onRemove} className="text-gray-500 hover:text-gray-800 rounded-full flex-shrink-0" aria-label={`Remove ${email}`}>
      <X className="h-3 w-3" />
    </button>
  </div>
)

// --- MAIN REFACTORED COMPONENT ---
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
      // Logic to load contacts from localStorage and API remains the same
      const localContacts = localStorage.getItem("ditmail-contacts")
      if (localContacts) {
        setContacts(JSON.parse(localContacts).map((c: any) => ({ ...c, lastUsed: toDate(c.lastUsed) })))
      }
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/contacts", { headers: { Authorization: `Bearer ${token}` }})
        if (response.ok) {
          const data = await response.json()
          const apiContacts = data.contacts.map((c: any) => ({ email: c.email, name: c.name, lastUsed: toDate(c.lastUsed) }))
          setContacts(apiContacts)
          localStorage.setItem("ditmail-contacts", JSON.stringify(apiContacts.map((c: any) => ({...c, lastUsed: c.lastUsed ? (c.lastUsed as Date).toISOString() : undefined }))))
        }
      } catch (error) { console.error("Error loading contacts:", error) }
    }
    loadContacts()
  }, [])

  useEffect(() => {
    if (inputValue.length < 1) {
      setShowSuggestions(false); return;
    }
    const filtered = contacts.filter(contact => !pills.includes(contact.email) && (contact.email.toLowerCase().includes(inputValue.toLowerCase()) || contact.name?.toLowerCase().includes(inputValue.toLowerCase()))).slice(0, 5)
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [inputValue, contacts, pills])

  // --- NEW: FUNCTION TO CREATE OR UPDATE CONTACTS ---
  const addOrUpdateContact = async (email: string) => {
    const existingContact = contacts.find(c => c.email.toLowerCase() === email.toLowerCase());
    let updatedContacts: Contact[];

    if (existingContact) {
      // If contact exists, just update its `lastUsed` date
      updatedContacts = contacts.map(c => c.email.toLowerCase() === email.toLowerCase() ? { ...c, lastUsed: new Date() } : c);
    } else {
      // If it's a new contact, create it and save it
      const newContact: Contact = { email, name: undefined, lastUsed: new Date() };
      updatedContacts = [...contacts, newContact];

      // Persist the new contact to the server
      try {
        const token = localStorage.getItem("accessToken");
        await fetch("/api/contacts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ email: newContact.email }), // Assuming API expects {email}
        });
      } catch (error) {
        console.error("Failed to save new contact to API:", error);
      }
    }

    // Update state and localStorage
    setContacts(updatedContacts);
    localStorage.setItem("ditmail-contacts", JSON.stringify(updatedContacts.map(c => ({...c, lastUsed: c.lastUsed ? (c.lastUsed as Date).toISOString() : undefined }))));
  };


  // --- UPDATED: ADDS A NEW PILL AND TRIGGERS CONTACT SAVE ---
  const addPill = (email: string) => {
    const trimmedEmail = email.trim();
    // Validate email format and check for duplicates before adding
    if (trimmedEmail && emailRegex.test(trimmedEmail) && !pills.includes(trimmedEmail)) {
      const newPills = [...pills, trimmedEmail];
      onChange(newPills.join(", "));
      addOrUpdateContact(trimmedEmail); // Use the new function to save the contact
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removePill = (emailToRemove: string) => {
    const newPills = pills.filter(email => email !== emailToRemove)
    onChange(newPills.join(", "))
  }

  // Handle keyboard events, now correctly adds new emails on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && inputValue === "" && pills.length > 0) {
      removePill(pills[pills.length - 1]);
      return;
    }

    if (e.key === "Enter" || e.key === "Tab") {
        if (showSuggestions && selectedIndex >= 0 && suggestions[selectedIndex]) {
          // If a suggestion is selected, add it
          e.preventDefault();
          addPill(suggestions[selectedIndex].email);
        } else if (inputValue) {
          // Otherwise, if there is input, try to add it as a new email
          e.preventDefault();
          addPill(inputValue);
        }
        return;
    }

    if (!showSuggestions) return;
    
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setSelectedIndex(p => (p < suggestions.length - 1 ? p + 1 : p)); break;
      case "ArrowUp": e.preventDefault(); setSelectedIndex(p => (p > 0 ? p - 1 : -1)); break;
      case "Escape": setShowSuggestions(false); break;
    }
  }

  // The JSX remains the same, as all changes were in the logic
  return (
    <div className="relative">
      <div ref={containerRef} className={`flex items-center flex-wrap gap-1 p-1 border rounded-md ${className}`} onClick={() => inputRef.current?.focus()}>
        {pills.map(email => (
          <RecipientPill key={email} email={email} onRemove={() => removePill(email)} />
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={pills.length === 0 ? placeholder : ""}
          className="flex-1 border-none outline-0 text-sm focus:ring-0 shadow-none p-0 h-auto bg-transparent min-w-[120px]"
          autoComplete="off"
          autoFocus
        />
      </div>
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          {suggestions.map((contact, index) => (
            <div key={contact.email} className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === selectedIndex ? "bg-blue-50" : ""}`} onClick={() => addPill(contact.email)} onMouseEnter={() => setSelectedIndex(index)}>
              <div className="text-sm font-medium">{contact.name || contact.email}</div>
              {contact.name && <div className="text-xs text-gray-500">{contact.email}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}