// components/mail/FilterPopover.tsx
"use client"

import { useEffect, useRef } from 'react'
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface FilterPopoverProps {
  filters: { unread: boolean; starred: boolean; hasAttachments: boolean };
  onFiltersChange: (newFilters: any) => void;
  onClose: () => void;
}

export default function FilterPopover({ filters, onFiltersChange, onClose }: FilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFiltersChange((prev: any) => ({ ...prev, [name]: checked }));
  };

  return (
    <div ref={popoverRef} className="absolute top-14 right-0 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in-down p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-white">Filter Emails</h3>
        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input type="checkbox" name="unread" checked={filters.unread} onChange={handleCheckboxChange} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
          <span className="text-gray-700 dark:text-gray-300">Unread</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input type="checkbox" name="starred" checked={filters.starred} onChange={handleCheckboxChange} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
          <span className="text-gray-700 dark:text-gray-300">Starred</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input type="checkbox" name="hasAttachments" checked={filters.hasAttachments} onChange={handleCheckboxChange} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
          <span className="text-gray-700 dark:text-gray-300">Has Attachments</span>
        </label>
      </div>
    </div>
  );
}