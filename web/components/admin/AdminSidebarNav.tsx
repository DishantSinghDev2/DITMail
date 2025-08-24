"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export function AdminSidebarNav({ navigation }: { navigation: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 py-6">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-white"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}