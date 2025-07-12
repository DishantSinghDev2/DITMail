import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface RecipientInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

// Basic email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RecipientPillProps {
    email: string;
    onRemove: () => void;
    onClick: () => void;
}

const RecipientPill = ({ email, onRemove, onClick }: RecipientPillProps) => (
    <div 
        onClick={onClick}
        className="flex items-center gap-1 bg-gray-200 rounded-full px-2 py-1 text-sm cursor-pointer hover:bg-gray-300"
    >
        <Avatar className="h-5 w-5">
            <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{email}</span>
        <button 
            type="button" 
            onClick={(e) => {
                e.stopPropagation(); // Prevent pill click when removing
                onRemove();
            }}
            className="text-gray-500 hover:text-gray-800 rounded-full"
        >
            <X className="h-3 w-3" />
        </button>
    </div>
);


export default function RecipientInput({ value, onChange, placeholder }: RecipientInputProps) {
    const [emails, setEmails] = useState<string[]>(value ? value.split(',').map(e => e.trim()).filter(Boolean) : []);
    const [inputValue, setInputValue] = useState('');
    const [editingEmail, setEditingEmail] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Sync parent form state with component state
        const parentEmails = value ? value.split(',').map(e => e.trim()).filter(Boolean) : [];
        setEmails(parentEmails);
    }, [value]);

    const updateParent = (updatedEmails: string[]) => {
        onChange(updatedEmails.join(', '));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
            e.preventDefault();
            const newEmail = inputValue.trim();
            if (emailRegex.test(newEmail) && !emails.includes(newEmail)) {
                const updatedEmails = [...emails, newEmail];
                setEmails(updatedEmails);
                updateParent(updatedEmails);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
            const lastEmail = emails[emails.length - 1];
            removeEmail(lastEmail);
        }
    };

    const removeEmail = (emailToRemove: string) => {
        const updatedEmails = emails.filter(email => email !== emailToRemove);
        setEmails(updatedEmails);
        updateParent(updatedEmails);
    };

    const handlePillClick = (email: string) => {
        setEditingEmail(email);
        setInputValue(email);
        removeEmail(email); // Temporarily remove from pills to edit in input
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    return (
        <div 
            className="flex flex-wrap items-center gap-1 border-0 border-b rounded-none focus-within:border-blue-500 p-1"
            onClick={() => inputRef.current?.focus()}
        >
            {emails.map(email => (
                <RecipientPill 
                    key={email} 
                    email={email} 
                    onRemove={() => removeEmail(email)}
                    onClick={() => handlePillClick(email)}
                />
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={emails.length === 0 ? placeholder : ''}
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 min-w-[100px]"
            />
        </div>
    );
}