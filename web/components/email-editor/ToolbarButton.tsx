// components/email-editor/ToolbarButton.tsx
"use client"

import type React from "react"

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
}

export const ToolbarButton = ({ isActive, children, ...props }: ToolbarButtonProps) => {
  return (
    <button
      type="button"
      className={`p-2 rounded-md transition-colors text-gray-600 hover:bg-gray-200 ${
        isActive ? "bg-gray-200 text-gray-900" : "hover:bg-gray-100"
      }`}
      {...props}
    >
      {children}
    </button>
  )
}