"use client"

import type React from "react"

import { Fragment } from "react"
import { Menu, Transition } from "@headlessui/react"

interface DropdownItem {
  label: string
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
  danger?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: "left" | "right"
}

export default function Dropdown({ trigger, items, align = "right" }: DropdownProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button as="div">{trigger}</Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2 w-56 origin-top-${align} divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50`}
        >
          <div className="px-1 py-1">
            {items.map((item, index) => (
              <Menu.Item key={index} disabled={item.disabled}>
                {({ active }) => (
                  <button
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`${active ? "bg-gray-100" : ""} ${
                      item.danger ? "text-red-600" : "text-gray-900"
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    {item.label}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
