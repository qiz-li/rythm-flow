import { io, Socket } from 'socket.io-client'
import { User, VoiceContribution, TypingActivity, RhythmSession } from '../types'

interface ServerToClientEvents {
  'session-updated': (session: RhythmSession) => void
  'user-joined': (user: User) => void
  'user-left': (userId: string) => void
  'voice-contribution': (contribution: VoiceContribution) => void
  'typing-activity': (activity: TypingActivity) => void
  'user-presence': (users: User[]) => void
  'session-created': (response: { success: boolean; session?: RhythmSession; error?: string }) => void
  'join-session-response': (response: { success: boolean; session?: RhythmSession; error?: string }) => void
}

interface ClientToServerEvents {
  'join-session': (data: { sessionId: string; user: User }) => void
  'create-session': (data: { sessionName: string; user: User }) => void
  'leave-session': (data: { sessionId: string; userId: string }) => void
  'voice-contribution': (data: { sessionId: string; contribution: VoiceContribution }) => void
  'typing-activity': (data: { sessionId: string; activity: TypingActivity }) => void
  'request-presence': (sessionId: string) => void
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null

  connect(serverUrl?: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      console.log('🔌 [SocketService] Connect method called', { serverUrl, currentlyConnected: this.socket?.connected })

      if (this.socket?.connected) {
        console.log('✅ [SocketService] Already connected, resolving immediately')
        resolve(this.socket)
        return
      }

      const url = serverUrl || import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001'
      console.log('🔌 [SocketService] Attempting connection to:', url)
      console.log('🔍 [SocketService] Environment VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL)

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000, // Increased timeout
        retries: 5,     // Increased retries
        forceNew: true  // Force new connection
      })

      console.log('🔌 [SocketService] Socket instance created with config:', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        retries: 5,
        forceNew: true
      })

      this.socket.on('connect', () => {
        console.log('✅ [SocketService] Socket connected to server successfully')
        console.log('🔌 [SocketService] Connection details:', {
          id: this.socket?.id,
          connected: this.socket?.connected,
          disconnected: this.socket?.disconnected
        })
        this.reconnectAttempts = 0
        resolve(this.socket!)
      })

      this.socket.on('connect_error', (error) => {
        console.error('❌ [SocketService] Socket connection error:', error)
        console.error('🔍 [SocketService] Error details:', {
          message: error.message,
          type: error.type,
          description: error.description,
          context: error.context,
          url
        })
        this.handleReconnection()
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 [SocketService] Socket disconnected:', reason)
        console.log('🔍 [SocketService] Disconnect details:', {
          reason,
          id: this.socket?.id,
          reconnectAttempts: this.reconnectAttempts
        })
        // Don't auto-reconnect on intentional disconnects
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          console.log('🔌 [SocketService] Intentional disconnect, not reconnecting')
        }
      })
    })
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.socket?.connect()
    }, delay)
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.socket?.disconnect()
    this.socket = null
  }

  reset() {
    console.log('🔄 [SocketService] Resetting socket connection')
    this.disconnect()
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Session operations
  createSession(sessionName: string, user: User): Promise<RhythmSession> {
    return new Promise((resolve, reject) => {
      console.log('🆕 [SocketService] CreateSession called', { sessionName, user })

      if (!this.socket?.connected) {
        console.error('❌ [SocketService] Cannot create session: socket not connected')
        console.error('🔍 [SocketService] Socket state:', {
          exists: !!this.socket,
          connected: this.socket?.connected,
          disconnected: this.socket?.disconnected,
          id: this.socket?.id
        })
        reject(new Error('Not connected to server'))
        return
      }

      console.log('📤 [SocketService] Emitting create-session event:', { sessionName, user })
      console.log('🔍 [SocketService] Current socket state before emit:', {
        connected: this.socket.connected,
        id: this.socket.id
      })

      // Set up timeout for response
      const timeout = setTimeout(() => {
        console.error('⏰ [SocketService] Create session timeout - no response received')
        reject(new Error('Create session timeout - server not responding'))
      }, 10000)

      this.socket.once('session-created', (response) => {
        clearTimeout(timeout)
        console.log('📥 [SocketService] Received session-created response:', response)
        if (response.success && response.session) {
          console.log('✅ [SocketService] Session created successfully:', response.session.id)
          resolve(response.session)
        } else {
          console.error('❌ [SocketService] Session creation failed:', response.error)
          reject(new Error(response.error || 'Failed to create session'))
        }
      })

      try {
        this.socket.emit('create-session', { sessionName, user })
        console.log('📤 [SocketService] Create-session event emitted successfully')
      } catch (emitError) {
        clearTimeout(timeout)
        console.error('❌ [SocketService] Error emitting create-session:', emitError)
        reject(emitError)
      }
    })
  }

  joinSession(sessionId: string, user: User): Promise<RhythmSession> {
    return new Promise((resolve, reject) => {
      console.log('🚪 [SocketService] JoinSession called', { sessionId, user })

      if (!this.socket?.connected) {
        console.error('❌ [SocketService] Cannot join session: socket not connected')
        console.error('🔍 [SocketService] Socket state:', {
          exists: !!this.socket,
          connected: this.socket?.connected,
          disconnected: this.socket?.disconnected,
          id: this.socket?.id
        })
        reject(new Error('Not connected to server'))
        return
      }

      console.log('📤 [SocketService] Emitting join-session event:', { sessionId, user })
      console.log('🔍 [SocketService] Current socket state before emit:', {
        connected: this.socket.connected,
        id: this.socket.id
      })

      // Set up timeout for response
      const timeout = setTimeout(() => {
        console.error('⏰ [SocketService] Join session timeout - no response received')
        reject(new Error('Join session timeout - server not responding'))
      }, 10000)

      this.socket.once('join-session-response', (response) => {
        clearTimeout(timeout)
        console.log('📥 [SocketService] Received join-session-response:', response)
        if (response.success && response.session) {
          console.log('✅ [SocketService] Session joined successfully:', response.session.id)
          resolve(response.session)
        } else {
          console.error('❌ [SocketService] Session join failed:', response.error)
          reject(new Error(response.error || 'Failed to join session'))
        }
      })

      try {
        this.socket.emit('join-session', { sessionId, user })
        console.log('📤 [SocketService] Join-session event emitted successfully')
      } catch (emitError) {
        clearTimeout(timeout)
        console.error('❌ [SocketService] Error emitting join-session:', emitError)
        reject(emitError)
      }
    })
  }

  leaveSession(sessionId: string, userId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave-session', { sessionId, userId })
    }
  }

  // Activity broadcasting
  broadcastVoiceContribution(sessionId: string, contribution: VoiceContribution) {
    if (this.socket?.connected) {
      this.socket.emit('voice-contribution', { sessionId, contribution })
    }
  }

  broadcastTypingActivity(sessionId: string, activity: TypingActivity) {
    console.log('⌨️ [SocketService] BroadcastTypingActivity called', { sessionId, activity, connected: this.socket?.connected })
    if (this.socket?.connected) {
      console.log('📤 [SocketService] Emitting typing-activity to server')
      this.socket.emit('typing-activity', { sessionId, activity })
    } else {
      console.error('❌ [SocketService] Cannot broadcast typing activity: socket not connected')
    }
  }

  requestPresence(sessionId: string) {
    if (this.socket?.connected) {
      this.socket.emit('request-presence', sessionId)
    }
  }

  // Event listeners
  onSessionUpdated(callback: (session: RhythmSession) => void) {
    this.socket?.on('session-updated', callback)
  }

  onUserJoined(callback: (user: User) => void) {
    this.socket?.on('user-joined', callback)
  }

  onUserLeft(callback: (userId: string) => void) {
    this.socket?.on('user-left', callback)
  }

  onVoiceContribution(callback: (contribution: VoiceContribution) => void) {
    this.socket?.on('voice-contribution', callback)
  }

  onTypingActivity(callback: (activity: TypingActivity) => void) {
    this.socket?.on('typing-activity', callback)
  }

  onUserPresence(callback: (users: User[]) => void) {
    this.socket?.on('user-presence', callback)
  }

  // Remove event listeners
  off(event: keyof ServerToClientEvents, callback?: Function) {
    if (callback) {
      this.socket?.off(event, callback as any)
    } else {
      this.socket?.off(event)
    }
  }
}

export const socketService = new SocketService()