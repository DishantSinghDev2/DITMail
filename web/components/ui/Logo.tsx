interface LogoProps {
  className?: string
}

export function Logo({ className = "h-8 w-auto" }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">D</span>
        </div>
        <span className="text-xl font-bold text-gray-900">DITMail</span>
      </div>
    </div>
  )
}
