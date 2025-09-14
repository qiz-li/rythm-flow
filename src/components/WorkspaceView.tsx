import { useState } from 'react'
import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import CollaborationSurface from './CollaborationSurface'
import RhythmFeedback from './RhythmFeedback'
import SessionHeader from './SessionHeader'
import SessionSummary from './SessionSummary'

interface WorkspaceViewProps {
  currentUser: User
  sessionId: string
  onLeaveSession: () => void
}

export default function WorkspaceView({ currentUser, sessionId, onLeaveSession }: WorkspaceViewProps) {
  const { currentSession, leaveSession, onlineUsers, connectionStatus } = useSessionStore()
  const [showSummary, setShowSummary] = useState(false)

  const handleLeaveSession = () => {
    leaveSession(currentUser.id)
    onLeaveSession()
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
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <CollaborationSurface currentUser={currentUser} />
        </div>

        <div className="w-80 border-l border-gray-200 bg-white">
          <RhythmFeedback currentUser={currentUser} onlineUsers={onlineUsers} />
        </div>
      </div>

      {showSummary && currentSession && (
        <SessionSummary
          session={currentSession}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}