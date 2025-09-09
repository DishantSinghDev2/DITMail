"use client"
import type React from "react"
import { useState, useEffect, useRef, forwardRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getAvatarUrl = (email: string): string | null => {
  const trimmedEmail = email.trim();
  return `https://whatsyour.info/api/v1/avatar/${trimmedEmail}`;
};

const RecipientPill = ({ email, onRemove }: { email: string; onRemove: () => void }) => {
  const avatarUrl = getAvatarUrl(email);
  return (
    <div className="flex items-center gap-1 bg-gray-200 rounded-full px-2 py-1 text-sm">
      <Avatar className="h-5 w-5">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={email} />}
        <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate max-w-[150px]">{email}</span>
      <button type="button" onClick={onRemove} className="text-gray-500 hover:text-gray-800 rounded-full flex-shrink-0" aria-label={`Remove ${email}`}>
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

// Use forwardRef to allow parent components to get a ref to the input element
const ContactAutocomplete = forwardRef<HTMLInputElement, ContactAutocompleteProps>(
  ({ value, onChange, placeholder, className }, ref) => {
    const [inputValue, setInputValue] = useState("")
    const [pills, setPills] = useState<string[]>([])
    const [contacts, setContacts] = useState<Contact[]>([])
    const [suggestions, setSuggestions] = useState<Contact[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      if (typeof value !== "string") {
        console.error("Expected value to be a string, got:", typeof value)
        return
      }
      const emailsFromValue = value ? value.split(",").map(e => e.trim()).filter(Boolean) : []
      if (JSON.stringify(emailsFromValue) !== JSON.stringify(pills)) {
          setPills(emailsFromValue)
      }
    }, [value, pills])

  useEffect(() => {
    const loadContacts = async () => {
      const localContacts = localStorage.getItem("ditmail-contacts")
      if (localContacts) {
        setContacts(JSON.parse(localContacts).map((c: any) => ({ ...c, lastUsed: toDate(c.lastUsed) })))
      }
      try {
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/contacts", { headers: { Authorization: `Bearer ${token}` } })
        if (response.ok) {
          const data = await response.json()
          const apiContacts = data.contacts.map((c: any) => ({ email: c.email, name: c.name, lastUsed: toDate(c.lastUsed) }))
          setContacts(apiContacts)
          localStorage.setItem("ditmail-contacts", JSON.stringify(apiContacts.map((c: any) => ({ ...c, lastUsed: c.lastUsed ? (c.lastUsed as Date).toISOString() : undefined }))))
        }
      } catch (error) { console.error("Error loading contacts:", error) }
    }
    loadContacts()
  }, [])

  
    useEffect(() => {
        // Show recent/all contacts if input is empty but focused
        if (inputValue.length < 1) {
            const recentContacts = contacts
                .filter(contact => !pills.includes(contact.email))
                .sort((a, b) => (toDate(b.lastUsed)?.getTime() || 0) - (toDate(a.lastUsed)?.getTime() || 0))
                .slice(0, 5);
            setSuggestions(recentContacts);
            // Don't auto-show suggestions on empty, wait for focus.
            return;
        }

        const filtered = contacts.filter(contact =>
            !pills.includes(contact.email) &&
            (contact.email.toLowerCase().includes(inputValue.toLowerCase()) ||
             contact.name?.toLowerCase().includes(inputValue.toLowerCase()))
        ).slice(0, 5);

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
    }, [inputValue, contacts, pills]);


  const addOrUpdateContact = async (email: string) => {
    const existingContact = contacts.find(c => c.email.toLowerCase() === email.toLowerCase());
    let updatedContacts: Contact[];

    if (existingContact) {
      updatedContacts = contacts.map(c => c.email.toLowerCase() === email.toLowerCase() ? { ...c, lastUsed: new Date() } : c);
    } else {
      const newContact: Contact = { email, name: undefined, lastUsed: new Date() };
      updatedContacts = [...contacts, newContact];

      try {
        const token = localStorage.getItem("accessToken");
        await fetch("/api/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: newContact.email }),
        });
      } catch (error) {
        console.error("Failed to save new contact to API:", error);
      }
    }

    setContacts(updatedContacts);
    localStorage.setItem("ditmail-contacts", JSON.stringify(updatedContacts.map(c => ({ ...c, lastUsed: c.lastUsed ? (c.lastUsed as Date).toISOString() : undefined }))));
  };


 const addPill = (email: string) => {
      const trimmedEmail = email.trim();
      if (trimmedEmail && emailRegex.test(trimmedEmail) && !pills.includes(trimmedEmail)) {
        const newPills = [...pills, trimmedEmail];
        setPills(newPills); // Update local state immediately
        onChange(newPills.join(", ")); // Propagate change to parent
        addOrUpdateContact(trimmedEmail);
      }
      setInputValue("");
      setShowSuggestions(false);
      setSelectedIndex(-1);
    };
  
    const removePill = (emailToRemove: string) => {
      const newPills = pills.filter(email => email !== emailToRemove)
      setPills(newPills);
      onChange(newPills.join(", "))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && inputValue === "" && pills.length > 0) {
        e.preventDefault();
        removePill(pills[pills.length - 1]);
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        if (showSuggestions && selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault();
          addPill(suggestions[selectedIndex].email);
        } else if (inputValue) {
          e.preventDefault();
          addPill(inputValue); // Add the raw input value if it's valid
        }
        return;
      }

      if (!showSuggestions && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
          setShowSuggestions(true);
      }
      if (!showSuggestions) return;

      switch (e.key) {
        case "ArrowDown": e.preventDefault(); setSelectedIndex(p => (p < suggestions.length - 1 ? p + 1 : p)); break;
        case "ArrowUp": e.preventDefault(); setSelectedIndex(p => (p > 0 ? p - 1 : 0)); break;
        case "Escape": e.preventDefault(); setShowSuggestions(false); setSelectedIndex(-1); break;
      }
    }

    const handleFocus = () => {
        // Show suggestions on focus if the input is empty
        if (inputValue === "") {
            setShowSuggestions(true);
        }
    }

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        // Use a small timeout to allow click events on suggestions to register
        setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
                // Also, add any pending valid email in the input as a pill
                if(inputValue) {
                    addPill(inputValue);
                }
            }
        }, 150);
    }

  // The JSX remains the same, as all changes were in the logic
   return (
      <div className="relative" ref={containerRef} onBlur={handleBlur}>
        <div
          className={`flex items-center flex-wrap gap-1 p-1 border rounded-md ${className}`}
          onClick={() => (ref as React.RefObject<HTMLInputElement>)?.current?.focus()}
        >
          {pills.map(email => (
            <RecipientPill key={email} email={email} onRemove={() => removePill(email)} />
          ))}
          <input
            ref={ref} // Forwarded ref is attached here
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={pills.length === 0 ? placeholder : ""}
            className="flex-1 border-none outline-0 text-sm focus:ring-0 shadow-none p-0 h-auto bg-transparent min-w-[120px]"
            autoComplete="off"
          />
        </div>
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
            {suggestions.map((contact, index) => {
              const avatarUrl = getAvatarUrl(contact.email);
              return (
                <div
                  key={contact.email}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${index === selectedIndex ? "bg-blue-50 dark:bg-blue-900" : ""}`}
                  // Use onMouseDown to prevent the input's blur event from hiding the suggestions before the click registers
                  onMouseDown={(e) => {
                      e.preventDefault();
                      addPill(contact.email);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl} alt={contact.name || contact.email} />
                    <AvatarFallback>{(contact.name || contact.email).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{contact.name || contact.email}</div>
                    {contact.name && <div className="text-xs text-gray-500 dark:text-gray-400">{contact.email}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )
  }
);

ContactAutocomplete.displayName = 'ContactAutocomplete'; // Good practice for debugging

export default ContactAutocomplete;