import { useState } from 'react'
import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import CollaborationSurface from './CollaborationSurface'
import RhythmFeedback from './RhythmFeedback'
import SessionHeader from './SessionHeader'
import SessionSummary from './SessionSummary'
import SessionBalanceDashboard from './SessionBalanceDashboard'
import SettingsModal from './SettingsModal'

interface WorkspaceViewProps {
  currentUser: User
  sessionId: string
  onLeaveSession: () => void
  onUserUpdate?: (user: User) => void
}

export default function WorkspaceView({ currentUser: propCurrentUser, sessionId, onLeaveSession, onUserUpdate }: WorkspaceViewProps) {
  const { currentSession, leaveSession, onlineUsers, connectionStatus, currentUser: storeCurrentUser, updateUser, updateSessionName } = useSessionStore()
  const [showSummary, setShowSummary] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Use store currentUser if available (for demo user switching), otherwise use prop
  const currentUser = storeCurrentUser || propCurrentUser

  const handleLeaveSession = () => {
    leaveSession(currentUser.id)
    onLeaveSession()
  }

  const handleUserUpdate = (updates: { name?: string; color?: string }) => {
    updateUser(currentUser.id, updates)

    // Also update the App component's user state
    if (onUserUpdate) {
      const updatedUser = { ...currentUser, ...updates }
      onUserUpdate(updatedUser)
    }
  }

  const handleSessionUpdate = (updates: { name?: string }) => {
    if (updates.name) {
      updateSessionName(updates.name)
    }
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Loading session...</div>
          <button
            onClick={handleLeaveSession}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Back to lobby
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SessionHeader
        sessionId={sessionId}
        currentUser={currentUser}
        onlineUsers={onlineUsers}
        connectionStatus={connectionStatus}
        onLeaveSession={handleLeaveSession}
        onShowSummary={() => setShowSummary(true)}
        onShowSettings={() => setShowSettings(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <CollaborationSurface currentUser={currentUser} />
        </div>

        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <SessionBalanceDashboard />
          </div>
          <div className="flex-1 overflow-hidden">
            <RhythmFeedback currentUser={currentUser} onlineUsers={onlineUsers} />
          </div>
        </div>
      </div>

      {showSummary && currentSession && (
        <SessionSummary
          session={currentSession}
          onClose={() => setShowSummary(false)}
        />
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentUser={currentUser}
        onUserUpdate={handleUserUpdate}
        onSessionUpdate={handleSessionUpdate}
      />
    </div>
  )
}