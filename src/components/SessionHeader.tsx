import { User } from '../types'
import { LogOut, Users, Settings, Share2, FileText, Wifi, WifiOff, Loader } from 'lucide-react'

interface SessionHeaderProps {
  sessionId: string
  currentUser: User
  onlineUsers: User[]
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  onLeaveSession: () => void
  onShowSummary: () => void
  onShowSettings: () => void
}

export default function SessionHeader({
  sessionId,
  currentUser,
  onlineUsers,
  connectionStatus,
  onLeaveSession,
  onShowSummary,
  onShowSettings
}: SessionHeaderProps) {
  const sessionName = sessionId === 'demo-session' ? 'Demo Session' : 'Rhythm Flow Session'

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />
      case 'connecting':
        return <Loader className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'error':
      case 'disconnected':
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />
    }
  }

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-r from-rhythm-primary to-rhythm-secondary rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{sessionName}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">Session ID: {sessionId.slice(-8)}</p>
              {getConnectionIcon()}
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">
                {onlineUsers.length} participant{onlineUsers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Online users preview */}
          {onlineUsers.length > 1 && (
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="w-6 h-6 rounded-full border-2 border-white"
                    style={{ backgroundColor: user.color }}
                    title={user.name}
                  />
                ))}
                {onlineUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-gray-600 font-medium">+{onlineUsers.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentUser.color }}
            />
            <span className="text-sm font-medium text-gray-700">{currentUser.name}</span>
          </div>

          <button
            onClick={copySessionId}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy session ID"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={onShowSummary}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="View session summary"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={onShowSettings}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Session settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onLeaveSession}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Leave session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}