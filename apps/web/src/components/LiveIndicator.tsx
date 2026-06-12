'use client'

interface LiveIndicatorProps {
  isActive: boolean
}

export function LiveIndicator({ isActive }: LiveIndicatorProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
      <span className="text-sm text-gray-400">Live</span>
    </div>
  )
}