import { useEffect, useState } from 'react'
import { BalanceToast as BalanceToastType } from '../types'
import { MessageCircle, Users, Star, TrendingUp } from 'lucide-react'

interface BalanceToastProps {
  toast: BalanceToastType
  onDismiss: (toastId: string) => void
}

export default function BalanceToast({ toast, onDismiss }: BalanceToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Slide in animation
    const showTimer = setTimeout(() => setIsVisible(true), 100)

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onDismiss(toast.id), 300) // Wait for exit animation
    }, toast.duration)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(dismissTimer)
    }
  }, [toast.id, toast.duration, onDismiss])

  const getToastStyle = () => {
    const baseClasses = "transform transition-all duration-300 ease-out"

    if (isExiting) {
      return `${baseClasses} translate-x-full opacity-0`
    } else if (isVisible) {
      return `${baseClasses} translate-x-0 opacity-100`
    } else {
      return `${baseClasses} translate-x-full opacity-0`
    }
  }

  const getToastColor = () => {
    switch (toast.type) {
      case 'encourage':
        return 'bg-blue-500 border-blue-600'
      case 'moderate':
        return 'bg-orange-500 border-orange-600'
      case 'praise':
        return 'bg-green-500 border-green-600'
      case 'engage':
        return 'bg-purple-500 border-purple-600'
      default:
        return 'bg-gray-500 border-gray-600'
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'encourage':
        return <TrendingUp className="w-4 h-4" />
      case 'moderate':
        return <Users className="w-4 h-4" />
      case 'praise':
        return <Star className="w-4 h-4" />
      case 'engage':
        return <MessageCircle className="w-4 h-4" />
      default:
        return <MessageCircle className="w-4 h-4" />
    }
  }

  const handleClick = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  return (
    <div className={getToastStyle()}>
      <div
        onClick={handleClick}
        className={`
          ${getToastColor()}
          text-white px-4 py-3 rounded-lg shadow-lg cursor-pointer
          flex items-center gap-3 max-w-sm border-l-4
          hover:scale-105 transition-transform duration-200
        `}
      >
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1 text-sm font-medium">
          {toast.message}
        </div>

        <div className="flex-shrink-0 text-xs opacity-75">
          click to dismiss
        </div>
      </div>
    </div>
  )
}