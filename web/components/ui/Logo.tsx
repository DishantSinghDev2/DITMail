import Link from "next/link"
import { Mail } from "lucide-react"

interface LogoProps {
  className?: string
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center space-x-2 ${className}`}>
      <div className="bg-blue-600 p-2 rounded-lg">
        <Mail className="w-6 h-6 text-white" />
      </div>
      <span className="text-2xl font-bold text-gray-900">DITMail</span>
    </Link>
  )
}
