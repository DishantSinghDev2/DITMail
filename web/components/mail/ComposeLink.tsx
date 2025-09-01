"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function ComposeLink({ isExpanded }: { isExpanded: boolean }) {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  // Add/override "compose" param
  params.set("compose", "new");

  return (
    <Link
      href={`?${params.toString()}`}
      className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-medium shadow-sm"
    >
      <PlusIcon className="h-5 w-5 flex-shrink-0" />
      {isExpanded && <span className="whitespace-nowrap text-sm">Compose</span>}
    </Link>
  );
}
