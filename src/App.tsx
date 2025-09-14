import { useState, useEffect } from 'react'
import SessionLobby from './components/SessionLobby'
import WorkspaceView from './components/WorkspaceView'
import TypingCalibration from './components/TypingCalibration'
import ConnectionStatus from './components/ConnectionStatus'
import BalanceToastContainer from './components/BalanceToastContainer'
import { User, TypingBaseline } from './types'
import { useSessionStore } from './stores/sessionStore'
import { useSessionRecovery } from './hooks/useSessionRecovery'

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showCalibration, setShowCalibration] = useState(false)
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const { currentSession, currentUser: storeCurrentUser, updateUser } = useSessionStore()
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
    // Check if user already has a baseline
    if (user.typingBaseline) {
      // User already calibrated, join directly
      setCurrentUser(user)
      setSessionId(sessionId)
    } else {
      // Show calibration first
      setPendingUser(user)
      setPendingSessionId(sessionId)
      setShowCalibration(true)
    }
  }

  const handleCalibrationComplete = (baseline: TypingBaseline) => {
    if (!pendingUser || !pendingSessionId) return

    // Add baseline to user
    const userWithBaseline: User = {
      ...pendingUser,
      typingBaseline: baseline
    }

    // Update user in session store
    updateUser(pendingUser.id, { typingBaseline: baseline })

    // Complete the join process
    setCurrentUser(userWithBaseline)
    setSessionId(pendingSessionId)

    // Clear pending state and hide calibration
    setPendingUser(null)
    setPendingSessionId(null)
    setShowCalibration(false)

    console.log('📊 User baseline calibrated:', {
      userId: userWithBaseline.id,
      wpm: baseline.wpm,
      accuracy: baseline.accuracy
    })
  }

  const handleCalibrationSkip = () => {
    if (!pendingUser || !pendingSessionId) return

    // Join without baseline
    setCurrentUser(pendingUser)
    setSessionId(pendingSessionId)

    // Clear pending state and hide calibration
    setPendingUser(null)
    setPendingSessionId(null)
    setShowCalibration(false)

    console.log('⏭️ User skipped baseline calibration:', pendingUser.id)
  }

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser)
  }

  const handleLeaveSession = () => {
    setCurrentUser(null)
    setSessionId(null)
    setShowCalibration(false)
    setPendingUser(null)
    setPendingSessionId(null)
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

      {showCalibration && (
        <TypingCalibration
          onComplete={handleCalibrationComplete}
          onSkip={handleCalibrationSkip}
        />
      )}

      <ConnectionStatus />
      <BalanceToastContainer />
    </>
  )
}

export default App