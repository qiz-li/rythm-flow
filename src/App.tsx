import { useState, useEffect } from 'react'
import SessionLobby from './components/SessionLobby'
import WorkspaceView from './components/WorkspaceView'
import ConnectionStatus from './components/ConnectionStatus'
import BalanceToastContainer from './components/BalanceToastContainer'
import { User } from './types'
import { useSessionStore } from './stores/sessionStore'
import { useSessionRecovery } from './hooks/useSessionRecovery'

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const { currentSession, currentUser: storeCurrentUser } = useSessionStore()
  const { clearRecoveryData } = useSessionRecovery()

  // Sync with session store currentUser to keep App state up to date
  useEffect(() => {
    if (storeCurrentUser && currentUser?.id === storeCurrentUser.id) {
      // Update App's currentUser state when store currentUser changes
      setCurrentUser(storeCurrentUser)
    }
  }, [storeCurrentUser, currentUser?.id])

  // Only sync session clearing, not user setting (let handleJoinSession handle user setting)
  useEffect(() => {
    if (!currentSession) {
      setCurrentUser(null)
      setSessionId(null)
    }
  }, [currentSession])

  const handleJoinSession = (user: User, sessionId: string) => {
    setCurrentUser(user)
    setSessionId(sessionId)
  }

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser)
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
          onUserUpdate={handleUserUpdate}
        />
      )}
      <ConnectionStatus />
      <BalanceToastContainer />
    </>
  )
}

export default App