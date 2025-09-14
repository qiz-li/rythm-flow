import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { User } from '../types'

const SESSION_STORAGE_KEY = 'rhythm-flow-session'
const USER_STORAGE_KEY = 'rhythm-flow-user'

interface SessionRecoveryData {
  sessionId: string
  user: User
  timestamp: number
}

export function useSessionRecovery() {
  const {
    currentSession,
    connectionStatus,
    joinSession,
    initializeSocket,
    setConnectionStatus
  } = useSessionStore()

  const recoveryAttempted = useRef(false)
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null)

  // Save session data for recovery
  useEffect(() => {
    if (currentSession && currentSession.participants.length > 0) {
      const currentUser = currentSession.participants.find(p => p.id)
      if (currentUser) {
        const recoveryData: SessionRecoveryData = {
          sessionId: currentSession.id,
          user: currentUser,
          timestamp: Date.now()
        }
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(recoveryData))
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser))
      }
    }
  }, [currentSession])

  // Clear session data when leaving
  const clearRecoveryData = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  // Attempt session recovery on mount or reconnection
  const attemptRecovery = useCallback(async () => {
    if (recoveryAttempted.current || currentSession) return

    try {
      const recoveryDataStr = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!recoveryDataStr) return

      const recoveryData: SessionRecoveryData = JSON.parse(recoveryDataStr)

      // Don't recover sessions older than 24 hours
      if (Date.now() - recoveryData.timestamp > 24 * 60 * 60 * 1000) {
        clearRecoveryData()
        return
      }

      recoveryAttempted.current = true
      console.log('Attempting to recover session:', recoveryData.sessionId)

      await initializeSocket()
      await joinSession(recoveryData.sessionId, recoveryData.user)

      console.log('Session recovery successful')
    } catch (error) {
      console.log('Session recovery failed:', error)
      clearRecoveryData()
    }
  }, [currentSession, initializeSocket, joinSession])

  // Handle connection status changes
  useEffect(() => {
    console.log('Connection status changed to:', connectionStatus)

    // Disable session recovery for now - causes issues with fresh sessions
    // TODO: Re-enable when recovery logic is properly implemented
    /*
    // Only attempt recovery once when connected and no session
    if (connectionStatus === 'connected' && !currentSession && !recoveryAttempted.current) {
      console.log('Attempting session recovery...')
      attemptRecovery()
    }
    */

    // Disable automatic reconnection for now to prevent loops
    // TODO: Re-enable with proper logic once connection is stable
    /*
    // Start reconnection attempts only for error/disconnected states
    else if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      console.log('Connection failed, starting reconnection attempts...')
      if (!reconnectInterval.current) {
        reconnectInterval.current = setInterval(async () => {
          try {
            console.log('Attempting to reconnect...')
            setConnectionStatus('connecting')
            await initializeSocket()
          } catch (error) {
            console.log('Reconnection failed:', error)
            setConnectionStatus('error')
          }
        }, 5000) // Try every 5 seconds
      }
    }
    */

    // Stop reconnection attempts when connected
    if (connectionStatus === 'connected' && reconnectInterval.current) {
      console.log('Connected - stopping reconnection attempts')
      clearInterval(reconnectInterval.current)
      reconnectInterval.current = null
    }
  }, [connectionStatus, currentSession, setConnectionStatus, attemptRecovery])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectInterval.current) {
        clearInterval(reconnectInterval.current)
        reconnectInterval.current = null
      }
    }
  }, [])

  return {
    attemptRecovery,
    clearRecoveryData,
    hasRecoveryData: !!localStorage.getItem(SESSION_STORAGE_KEY)
  }
}