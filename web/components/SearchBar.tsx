"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, ClockIcon } from "@heroicons/react/24/outline"

interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  filters: any
  onFiltersChange: (filters: any) => void
  onSearch: () => void
  suggestions?: string[]
  recentSearches?: string[]
}

export default function SearchBar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  onSearch,
  suggestions = [],
  recentSearches = [],
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [tempFilters, setTempFilters] = useState(filters)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem("searchHistory")
    if (history) {
      setSearchHistory(JSON.parse(history))
    }
  }, [])

  useEffect(() => {
    setTempFilters(filters)
  }, [filters])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      // Add to search history
      const newHistory = [query, ...searchHistory.filter((h) => h !== query)].slice(0, 10)
      setSearchHistory(newHistory)
      localStorage.setItem("searchHistory", JSON.stringify(newHistory))
    }
    setShowSuggestions(false)
    onSearch()
  }

  const handleQueryChange = (value: string) => {
    onQueryChange(value)
    setShowSuggestions(value.length > 0 || searchHistory.length > 0)
  }

  const selectSuggestion = (suggestion: string) => {
    onQueryChange(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const applyFilters = () => {
    onFiltersChange(tempFilters)
    setShowFilters(false)
    onSearch()
  }

  const clearFilters = () => {
    const clearedFilters = {
      unread: false,
      starred: false,
      hasAttachments: false,
      priority: "",
      dateRange: "",
      sender: "",
      recipient: "",
      size: "",
      folder: "",
      label: "",
    }
    setTempFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    onSearch()
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem("searchHistory")
  }

  const removeFromHistory = (item: string) => {
    const newHistory = searchHistory.filter((h) => h !== item)
    setSearchHistory(newHistory)
    localStorage.setItem("searchHistory", JSON.stringify(newHistory))
  }

  const hasActiveFilters = Object.values(filters).some((value) => value && value !== "")

  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase().includes(query.toLowerCase()) && s !== query)
    .slice(0, 5)

  const displayedHistory = searchHistory
    .filter((h) => h.toLowerCase().includes(query.toLowerCase()) && h !== query)
    .slice(0, 5)

  return (
    <div className="relative space-y-3">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="flex-1 relative" ref={dropdownRef}>
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowSuggestions(query.length > 0 || searchHistory.length > 0)}
            placeholder="Search emails, contacts, subjects..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Search suggestions dropdown */}
          {showSuggestions && (filteredSuggestions.length > 0 || displayedHistory.length > 0) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
              {/* Recent searches */}
              {displayedHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent</span>
                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  </div>
                  {displayedHistory.map((item, index) => (
                    <div key={index} className="flex items-center group">
                      <button
                        type="button"
                        onClick={() => selectSuggestion(item)}
                        className="flex-1 px-3 py-2 text-left hover:bg-gray-100 text-sm flex items-center space-x-2"
                      >
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span>{item}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromHistory(item)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {filteredSuggestions.length > 0 && (
                <div>
                  {displayedHistory.length > 0 && <div className="border-t border-gray-200" />}
                  <div className="px-3 py-2 bg-gray-50 border-b">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggestions</span>
                  </div>
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm flex items-center space-x-2"
                    >
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 border border-gray-300 rounded-md relative transition-colors ${
            hasActiveFilters
              ? "bg-blue-100 text-blue-600 border-blue-300"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
          title="Advanced filters"
        >
          <FunnelIcon className="h-5 w-5" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              !
            </span>
          )}
        </button>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-md p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
            <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-gray-200 rounded transition-colors">
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filters */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tempFilters.unread}
                    onChange={(e) => setTempFilters({ ...tempFilters, unread: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Unread only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tempFilters.starred}
                    onChange={(e) => setTempFilters({ ...tempFilters, starred: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Starred only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tempFilters.hasAttachments}
                    onChange={(e) => setTempFilters({ ...tempFilters, hasAttachments: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Has attachments</span>
                </label>
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={tempFilters.priority}
                onChange={(e) => setTempFilters({ ...tempFilters, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any priority</option>
                <option value="high">High priority</option>
                <option value="normal">Normal priority</option>
                <option value="low">Low priority</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={tempFilters.dateRange}
                onChange={(e) => setTempFilters({ ...tempFilters, dateRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="3months">Last 3 months</option>
                <option value="year">This year</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {/* Sender Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">From</label>
              <input
                type="email"
                value={tempFilters.sender}
                onChange={(e) => setTempFilters({ ...tempFilters, sender: e.target.value })}
                placeholder="sender@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Recipient Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">To</label>
              <input
                type="email"
                value={tempFilters.recipient}
                onChange={(e) => setTempFilters({ ...tempFilters, recipient: e.target.value })}
                placeholder="recipient@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Size Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Size</label>
              <select
                value={tempFilters.size}
                onChange={(e) => setTempFilters({ ...tempFilters, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any size</option>
                <option value="small">Small (&lt; 1MB)</option>
                <option value="medium">Medium (1-10MB)</option>
                <option value="large">Large (&gt; 10MB)</option>
                <option value="huge">Very large (&gt; 25MB)</option>
              </select>
            </div>

            {/* Folder Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Folder</label>
              <select
                value={tempFilters.folder}
                onChange={(e) => setTempFilters({ ...tempFilters, folder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any folder</option>
                <option value="inbox">Inbox</option>
                <option value="sent">Sent</option>
                <option value="drafts">Drafts</option>
                <option value="archive">Archive</option>
                <option value="spam">Spam</option>
                <option value="trash">Trash</option>
              </select>
            </div>

            {/* Label Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Label</label>
              <input
                type="text"
                value={tempFilters.label}
                onChange={(e) => setTempFilters({ ...tempFilters, label: e.target.value })}
                placeholder="Label name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Custom date range */}
          {tempFilters.dateRange === "custom" && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={tempFilters.startDate || ""}
                  onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={tempFilters.endDate || ""}
                  onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
