import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ContactAutocomplete from './contact-autocomplete'; // Make sure this path is correct

interface RecipientInputProps {
    value: string; // The comma-separated string of emails from the form
    onChange: (value: string) => void; // Function to update the form's value
    placeholder?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RecipientPillProps {
    email: string;
    onRemove: () => void;
}

const RecipientPill = ({ email, onRemove }: RecipientPillProps) => (
    <div className="flex items-center gap-1 bg-gray-200 rounded-full px-2 py-1 text-sm">
        <Avatar className="h-5 w-5">
            <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="truncate max-w-[150px]">{email}</span>
        <button 
            type="button" 
            onClick={onRemove}
            className="text-gray-500 hover:text-gray-800 rounded-full flex-shrink-0"
        >
            <X className="h-3 w-3" />
        </button>
    </div>
);

export default function RecipientInput({ value, onChange, placeholder }: RecipientInputProps) {
    // State for the list of email pills
    const [emails, setEmails] = useState<string[]>([]);
    // State for the text currently in the input field
    const [inputValue, setInputValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Effect to parse the incoming value string from the form into an array of emails
    useEffect(() => {
        const parsedEmails = value ? value.split(',').map(e => e.trim()).filter(Boolean) : [];
        setEmails(parsedEmails);
    }, [value]);

    // Function to notify the parent form of any changes
    const updateParentForm = (updatedEmails: string[]) => {
        onChange(updatedEmails.join(', '));
    };

    // Adds a new email to the list from the input field
    const addEmailFromInput = () => {
        const newEmail = inputValue.trim();
        // Validate and ensure it's not a duplicate
        if (emailRegex.test(newEmail) && !emails.includes(newEmail)) {
            const updatedEmails = [...emails, newEmail];
            setEmails(updatedEmails);
            updateParentForm(updatedEmails);
            setInputValue(''); // Clear the input
        }
    };
    
    // Handler for selecting a suggestion from ContactAutocomplete
    const handleSelectSuggestion = (selectedEmail: string) => {
        if (selectedEmail && !emails.includes(selectedEmail)) {
            const updatedEmails = [...emails, selectedEmail];
            setEmails(updatedEmails);
            updateParentForm(updatedEmails);
            setInputValue(''); // Clear the input
        }
    };

    // Handler for keyboard events in the input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
            e.preventDefault();
            addEmailFromInput();
        } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
            // Remove the last pill on backspace if input is empty
            removeEmail(emails[emails.length - 1]);
        }
    };

    // Removes an email pill from the list
    const removeEmail = (emailToRemove: string) => {
        const updatedEmails = emails.filter(email => email !== emailToRemove);
        setEmails(updatedEmails);
        updateParentForm(updatedEmails);
    };

    return (
        // The container manages focus and layout
        <div 
            ref={containerRef}
            className="flex flex-wrap items-center gap-1 border-0 border-b rounded-none focus-within:border-blue-500 p-1"
        >
            {/* Render the pills for existing recipients */}
            {emails.map(email => (
                <RecipientPill 
                    key={email} 
                    email={email} 
                    onRemove={() => removeEmail(email)}
                />
            ))}
            {/* Use ContactAutocomplete for the input part */}
            <ContactAutocomplete
                value={inputValue}
                onChange={setInputValue} // Update input value as user types
                onSelect={handleSelectSuggestion} // Handle when a suggestion is clicked
                onKeyDown={handleKeyDown} // Handle Enter, Comma, Backspace
                placeholder={emails.length === 0 ? placeholder : ''}
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 min-w-[120px] p-0 h-auto"
            />
        </div>
    );
}