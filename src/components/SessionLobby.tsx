import { useState, useEffect } from 'react'
import { User, TypingBaseline } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import { userPreferencesService } from '../services/userPreferencesService'
import { Users, Plus, Settings, Wifi, WifiOff, Loader } from 'lucide-react'

interface SessionLobbyProps {
  onJoinSession: (user: User, sessionId: string) => void
}

const generateUserId = () => Math.random().toString(36).substr(2, 9)

const userColors = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
]

const getAvailableColor = (existingParticipants: User[]): string => {
  const usedColors = new Set(existingParticipants.map(p => p.color))
  const availableColors = userColors.filter(color => !usedColors.has(color))

  if (availableColors.length > 0) {
    return availableColors[Math.floor(Math.random() * availableColors.length)]
  }

  // If all colors are used, return a random color (fallback for sessions with >10 users)
  return userColors[Math.floor(Math.random() * userColors.length)]
}

export default function SessionLobby({ onJoinSession }: SessionLobbyProps) {
  const [userName, setUserName] = useState('')
  const [userColor, setUserColor] = useState(userColors[Math.floor(Math.random() * userColors.length)])
  const [savedTypingBaseline, setSavedTypingBaseline] = useState<TypingBaseline | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [isJoiningSession, setIsJoiningSession] = useState(false)
  const [error, setError] = useState('')
  const [currentJoiningUser, setCurrentJoiningUser] = useState<User | null>(null)

  // Debug state to track what's happening
  const [debugInfo, setDebugInfo] = useState<any[]>([])

  const addDebugLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
    const logEntry = { timestamp, message, data }
    console.log(`🐛 [${timestamp}] ${message}`, data || '')
    setDebugInfo(prev => [...prev.slice(-9), logEntry]) // Keep last 10 entries
  }

  const {
    initializeSocket,
    createSession,
    joinSession,
    connectionStatus,
    currentSession
  } = useSessionStore()

  // Load saved user preferences on mount
  useEffect(() => {
    const savedPrefs = userPreferencesService.getLastUsedPreferences()
    if (savedPrefs) {
      setUserName(savedPrefs.name)
      setUserColor(savedPrefs.color)
      setSavedTypingBaseline(savedPrefs.typingBaseline || null)
      addDebugLog('Loaded saved user preferences', savedPrefs)
    }
  }, [])

  useEffect(() => {
    addDebugLog('Socket initialization check', { connectionStatus })
    // Only initialize socket if not already connected
    if (connectionStatus === 'disconnected') {
      addDebugLog('Initializing socket...')
      initializeSocket().catch((error) => {
        addDebugLog('Socket initialization failed', error)
        console.error(error)
      })
    }
  }, [initializeSocket, connectionStatus])

  useEffect(() => {
    addDebugLog('Current session changed', { currentSession, hasSession: !!currentSession, currentJoiningUser })
    if (currentSession && currentJoiningUser) {
      addDebugLog('Calling onJoinSession', { user: currentJoiningUser, sessionId: currentSession.id })
      onJoinSession(currentJoiningUser, currentSession.id)
      setCurrentJoiningUser(null) // Clear after successful join
    }
  }, [currentSession, currentJoiningUser, onJoinSession])

  const handleCreateSession = async () => {
    addDebugLog('Create session attempt', { userName: userName.trim(), sessionName: sessionName.trim() })

    if (!userName.trim() || !sessionName.trim()) {
      addDebugLog('Create session validation failed', { userName: userName.trim(), sessionName: sessionName.trim() })
      return
    }

    const user: User = {
      id: generateUserId(),
      name: userName.trim(),
      color: getAvailableColor([]), // No existing participants for session creation
      typingBaseline: savedTypingBaseline || undefined
    }

    addDebugLog('Generated user for session creation', user)

    try {
      setError('')
      addDebugLog('Setting isCreatingSession to true')
      setIsCreatingSession(true)

      // Additional safeguard: ensure socket is ready before proceeding
      addDebugLog('Pre-create connection check', { connectionStatus })
      if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
        addDebugLog('Socket not ready, initializing first...')
        await initializeSocket()
        addDebugLog('Socket initialization completed', { connectionStatus })
      }

      // Wait a moment for connection status to stabilize
      if (connectionStatus === 'connecting') {
        addDebugLog('Socket still connecting, waiting...')
        await new Promise(resolve => setTimeout(resolve, 500))
        addDebugLog('Wait completed, current status:', { connectionStatus })
      }

      addDebugLog('Calling createSession with user and sessionName')
      const result = await createSession(sessionName.trim(), user)
      addDebugLog('Create session successful', result)
      setCurrentJoiningUser(user) // Track the user who just created the session
    } catch (err) {
      addDebugLog('Create session failed', err)
      setError('Failed to create session. Please try again.')
      console.error('Create session error:', err)
    } finally {
      addDebugLog('Setting isCreatingSession to false')
      setIsCreatingSession(false)
    }
  }

  const handleJoinSession = async () => {
    addDebugLog('Join session attempt', { userName: userName.trim(), sessionId: sessionId.trim() })

    if (!userName.trim() || !sessionId.trim()) {
      addDebugLog('Join session validation failed', { userName: userName.trim(), sessionId: sessionId.trim() })
      return
    }

    const user: User = {
      id: generateUserId(),
      name: userName.trim(),
      color: userColor, // Server will handle color conflicts automatically
      typingBaseline: savedTypingBaseline || undefined
    }

    addDebugLog('Generated user for session joining', user)

    try {
      setError('')
      addDebugLog('Setting isJoiningSession to true')
      setIsJoiningSession(true)

      // Additional safeguard: ensure socket is ready before proceeding
      addDebugLog('Pre-join connection check', { connectionStatus })
      if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
        addDebugLog('Socket not ready, initializing first...')
        try {
          await initializeSocket()
          addDebugLog('Socket initialization completed', { connectionStatus })
        } catch (initError) {
          addDebugLog('Socket initialization failed', initError)
          throw new Error(`Failed to initialize socket: ${(initError as Error).message}`)
        }
      }

      // Wait a moment for connection status to stabilize
      if (connectionStatus === 'connecting') {
        addDebugLog('Socket still connecting, waiting...')
        await new Promise(resolve => setTimeout(resolve, 1000)) // Increased to 1 second
        addDebugLog('Wait completed, current status:', { connectionStatus })
      }

      // Final check: ensure we're actually connected before proceeding
      if (connectionStatus !== 'connected') {
        addDebugLog('Socket still not connected after initialization', { connectionStatus })
        throw new Error(`Socket connection failed. Status: ${connectionStatus}`)
      }

      addDebugLog('Calling joinSession with user and sessionId')
      const result = await joinSession(sessionId.trim(), user)
      addDebugLog('Join session successful', result)
      setCurrentJoiningUser(user) // Track the user who just joined the session
    } catch (err) {
      addDebugLog('Join session failed', err)
      setError('Failed to join session. Please check the session ID.')
      console.error('Join session error:', err)
    } finally {
      addDebugLog('Setting isJoiningSession to false')
      setIsJoiningSession(false)
    }
  }

  const handleJoinDemo = async () => {
    addDebugLog('Join demo session attempt', { userName: userName.trim() })

    if (!userName.trim()) {
      addDebugLog('Join demo validation failed - no username')
      return
    }

    const user: User = {
      id: generateUserId(),
      name: userName.trim(),
      color: userColor,
      typingBaseline: savedTypingBaseline || undefined
    }

    addDebugLog('Generated user for demo session', user)

    try {
      setError('')
      addDebugLog('Setting isJoiningSession to true')
      setIsJoiningSession(true)

      // Additional safeguard: ensure socket is ready before proceeding
      addDebugLog('Pre-demo connection check', { connectionStatus })
      if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
        addDebugLog('Socket not ready, initializing first...')
        await initializeSocket()
        addDebugLog('Socket initialization completed', { connectionStatus })
      }

      // Wait a moment for connection status to stabilize
      if (connectionStatus === 'connecting') {
        addDebugLog('Socket still connecting, waiting...')
        await new Promise(resolve => setTimeout(resolve, 500))
        addDebugLog('Wait completed, current status:', { connectionStatus })
      }

      addDebugLog('Calling joinSession for demo-session')
      const result = await joinSession('demo-session', user)
      addDebugLog('Join demo session successful', result)
      setCurrentJoiningUser(user) // Track the user who just joined the demo session
    } catch (err) {
      addDebugLog('Join demo session failed', err)
      setError('Demo session unavailable. Try creating a new session.')
      console.error('Join demo error:', err)
    } finally {
      addDebugLog('Setting isJoiningSession to false')
      setIsJoiningSession(false)
    }
  }

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

  // Separate loading states: socket initialization vs session actions
  const isSocketConnecting = connectionStatus === 'connecting' && !isCreatingSession && !isJoiningSession
  const isPerformingAction = isCreatingSession || isJoiningSession
  const isLoading = isPerformingAction
  const showConnectionError = connectionStatus === 'error' && !isPerformingAction

  // Debug logging for state changes
  useEffect(() => {
    addDebugLog('State changed', {
      isCreating,
      isJoining,
      isCreatingSession,
      isJoiningSession,
      connectionStatus,
      isLoading,
      isSocketConnecting,
      isPerformingAction,
      userName: userName.length,
      sessionName: sessionName.length,
      sessionId: sessionId.length
    })
  }, [isCreating, isJoining, isCreatingSession, isJoiningSession, connectionStatus, isLoading, isSocketConnecting, isPerformingAction, userName.length, sessionName.length, sessionId.length])

  return (
    <div className="min-h-screen bg-gradient-to-br from-rhythm-primary/10 to-rhythm-secondary/10 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-rhythm-primary to-rhythm-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Rhythm Flow</h1>
          <p className="text-gray-600">Collaborative workspace focused on contribution rhythms</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
              {connectionStatus === 'error' && (
                <button
                  onClick={async () => {
                    addDebugLog('Manual refresh button clicked')
                    setError('')
                    try {
                      await initializeSocket()
                      addDebugLog('Manual refresh successful')
                    } catch (err) {
                      addDebugLog('Manual refresh failed', err)
                    }
                  }}
                  className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                >
                  Retry Connection
                </button>
              )}
            </div>
          )}

          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => {
                addDebugLog('Username changed', { value: e.target.value, disabled: isLoading })
                setUserName(e.target.value)
              }}
              placeholder="Enter your display name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rhythm-primary focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {isCreating && (
            <div>
              <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 mb-1">
                Session Name
              </label>
              <input
                id="sessionName"
                type="text"
                value={sessionName}
                onChange={(e) => {
                  addDebugLog('Session name changed', { value: e.target.value, disabled: isLoading })
                  setSessionName(e.target.value)
                }}
                placeholder="Enter session name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rhythm-primary focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          )}

          {isJoining && !isCreating && (
            <div>
              <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-1">
                Session ID
              </label>
              <input
                id="sessionId"
                type="text"
                value={sessionId}
                onChange={(e) => {
                  addDebugLog('Session ID changed', { value: e.target.value, disabled: isLoading })
                  setSessionId(e.target.value)
                }}
                placeholder="Enter session ID to join"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rhythm-primary focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-3 pt-4">
            {!isCreating && !isJoining ? (
              <>
                <button
                  onClick={() => setIsCreating(true)}
                  disabled={isLoading || showConnectionError}
                  className="w-full bg-gradient-to-r from-rhythm-primary to-rhythm-secondary text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPerformingAction ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create New Session
                </button>

                <button
                  onClick={() => setIsJoining(true)}
                  disabled={isLoading || showConnectionError}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPerformingAction ? <Loader className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Join Existing Session
                </button>

                <button
                  onClick={handleJoinDemo}
                  disabled={!userName.trim() || isLoading || showConnectionError}
                  className="w-full border border-rhythm-primary/20 text-rhythm-primary py-2 px-4 rounded-lg hover:bg-rhythm-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isJoiningSession ? <Loader className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  Quick Demo Session
                </button>
              </>
            ) : isCreating ? (
              <>
                <button
                  onClick={handleCreateSession}
                  disabled={!userName.trim() || !sessionName.trim() || isLoading}
                  className="w-full bg-gradient-to-r from-rhythm-primary to-rhythm-secondary text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingSession ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create & Join Session
                </button>

                <button
                  onClick={() => {setIsCreating(false); setError('')}}
                  disabled={isLoading}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleJoinSession}
                  disabled={!userName.trim() || !sessionId.trim() || isLoading}
                  className="w-full bg-gradient-to-r from-rhythm-primary to-rhythm-secondary text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isJoiningSession ? <Loader className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Join Session
                </button>

                <button
                  onClick={() => {setIsJoining(false); setError('')}}
                  disabled={isLoading}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              <span className="capitalize">{connectionStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Real-time collaboration
            </div>
          </div>

          {/* Debug panel - only show in development */}
          {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
            <details className="mt-4 p-2 bg-gray-50 rounded text-xs">
              <summary className="cursor-pointer text-gray-600 mb-2">Debug Info ({debugInfo.length})</summary>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {debugInfo.slice(-5).map((log, i) => (
                  <div key={i} className="font-mono text-xs">
                    <span className="text-gray-500">[{log.timestamp}]</span>
                    <span className="ml-1">{log.message}</span>
                    {log.data && (
                      <span className="ml-1 text-blue-600">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}