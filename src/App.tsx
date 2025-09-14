import { useState, useEffect } from 'react'
import SessionLobby from './components/SessionLobby'
import WorkspaceView from './components/WorkspaceView'
import ConnectionStatus from './components/ConnectionStatus'
import { User } from './types'
import { useSessionStore } from './stores/sessionStore'
import { useSessionRecovery } from './hooks/useSessionRecovery'

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const { currentSession } = useSessionStore()
  const { clearRecoveryData } = useSessionRecovery()

  // Sync with session store
  useEffect(() => {
    if (currentSession && currentSession.participants.length > 0) {
      const user = currentSession.participants[0]
      setCurrentUser(user)
      setSessionId(currentSession.id)
    } else if (!currentSession) {
      setCurrentUser(null)
      setSessionId(null)
    }
  }, [currentSession])

  const handleJoinSession = (user: User, sessionId: string) => {
    setCurrentUser(user)
    setSessionId(sessionId)
  }

  const handleLeaveSession = () => {
    setCurrentUser(null)
    setSessionId(null)
    clearRecoveryData()
  }

  return (
    <>
      {!currentUser || !sessionId ? (
        <SessionLobby onJoinSession={handleJoinSession} />
      ) : (
        <WorkspaceView
          currentUser={currentUser}
          sessionId={sessionId}
          onLeaveSession={handleLeaveSession}
        />
      )}
      <ConnectionStatus />
    </>
  )
}

export default App