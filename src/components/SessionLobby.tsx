import { useState, useEffect } from 'react'
import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import { Users, Plus, Settings, Wifi, WifiOff, Loader } from 'lucide-react'

interface SessionLobbyProps {
  onJoinSession: (user: User, sessionId: string) => void
}

const generateUserId = () => Math.random().toString(36).substr(2, 9)

const userColors = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
]

export default function SessionLobby({ onJoinSession }: SessionLobbyProps) {
  const [userName, setUserName] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  const {
    initializeSocket,
    createSession,
    joinSession,
    connectionStatus,
    currentSession
  } = useSessionStore()

  useEffect(() => {
    // Only initialize socket if not already connected
    if (connectionStatus === 'disconnected') {
      initializeSocket().catch(console.error)
    }
  }, [initializeSocket, connectionStatus])

  useEffect(() => {
    if (currentSession) {
      const user = currentSession.participants[0]
      if (user) {
        onJoinSession(user, currentSession.id)
      }
    }
  }, [currentSession, onJoinSession])

  const handleCreateSession = async () => {
    if (!userName.trim() || !sessionName.trim()) return

    const user: User = {
      id: generateUserId(),
      name: userName.trim(),
      color: userColors[Math.floor(Math.random() * userColors.length)]
    }

    try {
      setError('')
      setIsCreating(true)
      await createSession(sessionName.trim(), user)
    } catch (err) {
      setError('Failed to create session. Please try again.')
      console.error('Create session error:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinSession = async () => {
    if (!userName.trim() || !sessionId.trim()) return

    const user: User = {
      id: generateUserId(),
      name: userName.trim(),
      color: userColors[Math.floor(Math.random() * userColors.length)]
    }

    try {
      setError('')
      setIsJoining(true)
      await joinSession(sessionId.trim(), user)
    } catch (err) {
      setError('Failed to join session. Please check the session ID.')
      console.error('Join session error:', err)
    } finally {
      setIsJoining(false)
    }
  }

  const handleJoinDemo = async () => {
    if (!userName.trim()) return

    const user: User = {
      id: generateUserId(),
      name: userName.trim(),
      color: userColors[Math.floor(Math.random() * userColors.length)]
    }

    try {
      setError('')
      setIsJoining(true)
      await joinSession('demo-session', user)
    } catch (err) {
      setError('Demo session unavailable. Try creating a new session.')
      console.error('Join demo error:', err)
    } finally {
      setIsJoining(false)
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

  const isLoading = isCreating || isJoining || connectionStatus === 'connecting'

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
              onChange={(e) => setUserName(e.target.value)}
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
                onChange={(e) => setSessionName(e.target.value)}
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
                onChange={(e) => setSessionId(e.target.value)}
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
                  disabled={isLoading || connectionStatus === 'error'}
                  className="w-full bg-gradient-to-r from-rhythm-primary to-rhythm-secondary text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create New Session
                </button>

                <button
                  onClick={() => setIsJoining(true)}
                  disabled={isLoading || connectionStatus === 'error'}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Join Existing Session
                </button>

                <button
                  onClick={handleJoinDemo}
                  disabled={!userName.trim() || isLoading || connectionStatus === 'error'}
                  className="w-full border border-rhythm-primary/20 text-rhythm-primary py-2 px-4 rounded-lg hover:bg-rhythm-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
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
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
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
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
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
        </div>
      </div>
    </div>
  )
}