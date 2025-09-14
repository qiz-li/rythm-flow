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
      if (this.socket?.connected) {
        resolve(this.socket)
        return
      }

      const url = serverUrl || import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001'

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        retries: 3
      })

      this.socket.on('connect', () => {
        console.log('✅ Socket connected to server')
        this.reconnectAttempts = 0
        resolve(this.socket!)
      })

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        this.handleReconnection()
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason)
        // Don't auto-reconnect on intentional disconnects
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          console.log('Intentional disconnect, not reconnecting')
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

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Session operations
  createSession(sessionName: string, user: User): Promise<RhythmSession> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error('❌ Cannot create session: socket not connected')
        reject(new Error('Not connected to server'))
        return
      }

      console.log('📤 Emitting create-session event:', { sessionName, user })

      this.socket.once('session-created', (response) => {
        console.log('📥 Received session-created response:', response)
        if (response.success && response.session) {
          resolve(response.session)
        } else {
          reject(new Error(response.error || 'Failed to create session'))
        }
      })

      this.socket.emit('create-session', { sessionName, user })
    })
  }

  joinSession(sessionId: string, user: User): Promise<RhythmSession> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.error('❌ Cannot join session: socket not connected')
        reject(new Error('Not connected to server'))
        return
      }

      console.log('📤 Emitting join-session event:', { sessionId, user })

      this.socket.once('join-session-response', (response) => {
        console.log('📥 Received join-session-response:', response)
        if (response.success && response.session) {
          resolve(response.session)
        } else {
          reject(new Error(response.error || 'Failed to join session'))
        }
      })

      this.socket.emit('join-session', { sessionId, user })
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
    if (this.socket?.connected) {
      this.socket.emit('typing-activity', { sessionId, activity })
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