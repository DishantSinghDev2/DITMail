// components/mail/SettingsDropdown.tsx
"use client"

import { useEffect, useRef } from 'react'
import { SunIcon, MoonIcon, PaintBrushIcon, Cog6ToothIcon, CheckIcon } from '@heroicons/react/24/outline'

interface SettingsDropdownProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
  currentTheme: string
  onChangeTheme: (theme: string) => void
}

const themes = [
    { name: 'Default', class: 'theme-default', color: 'bg-blue-600' },
    { name: 'Forest', class: 'theme-forest', color: 'bg-emerald-600' },
    { name: 'Rose', class: 'theme-rose', color: 'bg-rose-600' },
    { name: 'Ocean', class: 'theme-ocean', color: 'bg-cyan-600' },
]

export default function SettingsDropdown({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  currentTheme,
  onChangeTheme,
}: SettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute top-12 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in-down"
    >
      <div className="p-2">
        {/* Dark Mode Toggle */}
        <div className="px-2 py-2 text-sm text-gray-700 dark:text-gray-300">
          <label htmlFor="darkModeToggle" className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center space-x-2">
              {isDarkMode ? <MoonIcon className="h-5 w-5"/> : <SunIcon className="h-5 w-5"/>}
              <span>Dark Mode</span>
            </span>
            <div className="relative">
              <input type="checkbox" id="darkModeToggle" className="sr-only" checked={isDarkMode} onChange={onToggleDarkMode} />
              <div className="block bg-gray-200 dark:bg-gray-600 w-10 h-6 rounded-full"></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isDarkMode ? 'transform translate-x-full bg-blue-500' : ''}`}></div>
            </div>
          </label>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

        {/* Theme Selector */}
        <div className="px-2 pt-2 pb-1 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center space-x-2 mb-2">
            <PaintBrushIcon className="h-5 w-5"/>
            <span>Theme</span>
          </div>
          <div className="grid grid-cols-4 gap-2 px-2">
            {themes.map(theme => (
              <button
                key={theme.name}
                title={theme.name}
                onClick={() => onChangeTheme(theme.class)}
                className={`w-full h-8 rounded-md flex items-center justify-center ${theme.color}`}
              >
                {currentTheme === theme.class && <CheckIcon className="h-5 w-5 text-white"/>}
              </button>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

        {/* Settings Link */}
        <button
          onClick={() => (window.location.href = "/settings")}
          className="w-full text-left flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <Cog6ToothIcon className="h-5 w-5" />
          <span>All Settings</span>
        </button>
      </div>
    </div>
  )
}