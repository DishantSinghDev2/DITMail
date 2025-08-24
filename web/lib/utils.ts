import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: "short" })
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }
}

/**
 * Serializes data to ensure it's a plain, JSON-serializable object.
 * This is crucial when passing data from Server Components to Client Components,
 * or when caching data that might contain non-plain types like Mongoose documents,
 * Date objects, or ObjectId instances.
 *
 * @param data The data to serialize.
 * @returns A plain, JSON-serializable version of the data.
 */
export function serialize<T>(data: T): T {
  // Use JSON.parse(JSON.stringify(data)) as a robust way to deep clone and serialize.
  // This handles Dates, ObjectIds (if .toJSON() is implemented or they are within a Mongoose doc),
  // and other non-plain structures by converting them to their string representations.
  return JSON.parse(JSON.stringify(data));
}