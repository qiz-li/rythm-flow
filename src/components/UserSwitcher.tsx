import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import { Users, UserCheck } from 'lucide-react'

interface UserSwitcherProps {
  className?: string
}

export default function UserSwitcher({ className = '' }: UserSwitcherProps) {
  const { 
    isDemoMode, 
    demoUsers, 
    currentActiveUser, 
    switchToUser 
  } = useSessionStore()

  if (!isDemoMode || demoUsers.length < 2) {
    return null
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">Demo Mode</h3>
      </div>
      
      <div className="space-y-2">
        {demoUsers.map((user) => (
          <button
            key={user.id}
            onClick={() => switchToUser(user)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
              currentActiveUser?.id === user.id
                ? 'bg-rhythm-primary/10 border border-rhythm-primary/20'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: user.color }}
            />
            <span className="text-sm font-medium text-gray-900 flex-1">
              {user.name}
            </span>
            {currentActiveUser?.id === user.id && (
              <UserCheck className="w-4 h-4 text-rhythm-primary" />
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Switch between users to test multi-user collaboration features
        </p>
      </div>
    </div>
  )
}
