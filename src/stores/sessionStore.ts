import { create } from 'zustand'
import { RhythmSession, VoiceContribution, TypingActivity, User } from '../types'
import { socketService } from '../services/socketService'

interface SessionState {
  currentSession: RhythmSession | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  onlineUsers: User[]
  isInitialized: boolean

  // Session management
  setSession: (session: RhythmSession) => void
  createSession: (sessionName: string, user: User) => Promise<void>
  joinSession: (sessionId: string, user: User) => Promise<void>
  leaveSession: (userId: string) => void
  clearSession: () => void

  // Activity management
  addVoiceContribution: (contribution: VoiceContribution, broadcast?: boolean) => void
  addTypingActivity: (activity: TypingActivity, broadcast?: boolean) => void
  updateSettings: (settings: Partial<RhythmSession['settings']>) => void

  // Connection management
  initializeSocket: () => Promise<void>
  setConnectionStatus: (status: SessionState['connectionStatus']) => void
  setOnlineUsers: (users: User[]) => void
  addUser: (user: User) => void
  removeUser: (userId: string) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  connectionStatus: 'disconnected',
  onlineUsers: [],
  isInitialized: false,

  // Session management
  setSession: (session) => set({ currentSession: session }),

  createSession: async (sessionName: string, user: User) => {
    const startTime = Date.now()
    try {
      console.log('🔄 [SessionStore] Attempting to create session:', sessionName, 'as user:', user.name)
      console.log('🔍 [SessionStore] User details:', user)
      console.log('🔍 [SessionStore] Current store state before create:', {
        currentSession: get().currentSession?.id || 'none',
        connectionStatus: get().connectionStatus,
        isInitialized: get().isInitialized
      })

      // Ensure socket is initialized and connected first
      if (!get().isInitialized || get().connectionStatus !== 'connected') {
        console.log('🔌 [SessionStore] Socket not ready, initializing first...')
        set({ connectionStatus: 'connecting' })
        await get().initializeSocket()
      }

      // Verify socket is actually connected before proceeding
      if (!socketService.isConnected()) {
        console.error('❌ [SessionStore] Socket not connected after initialization')
        throw new Error('Failed to establish socket connection')
      }

      console.log('🔄 [SessionStore] Socket ready, calling socketService.createSession')

      const session = await socketService.createSession(sessionName, user)
      const duration = Date.now() - startTime

      console.log('✅ [SessionStore] Successfully created session:', session)
      console.log('🔍 [SessionStore] Session creation took:', duration + 'ms')
      console.log('🔍 [SessionStore] Session details:', {
        id: session.id,
        name: session.name,
        participantCount: session.participants.length,
        createdAt: new Date(session.createdAt).toISOString()
      })

      set({ currentSession: session, connectionStatus: 'connected' })
      console.log('✅ [SessionStore] Store updated with new session')
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ [SessionStore] Failed to create session after', duration + 'ms:', error)
      console.error('🔍 [SessionStore] Error details:', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack?.split('\n').slice(0, 3)
      })
      set({ connectionStatus: 'error' })
      throw error
    }
  },

  joinSession: async (sessionId: string, user: User) => {
    const startTime = Date.now()
    try {
      console.log('🚪 [SessionStore] Attempting to join session:', sessionId, 'as user:', user.name)
      console.log('🔍 [SessionStore] User details:', user)
      console.log('🔍 [SessionStore] Current store state before join:', {
        currentSession: get().currentSession?.id || 'none',
        connectionStatus: get().connectionStatus,
        isInitialized: get().isInitialized
      })

      // Ensure socket is initialized and connected first
      if (!get().isInitialized || get().connectionStatus !== 'connected') {
        console.log('🔌 [SessionStore] Socket not ready, initializing first...')
        set({ connectionStatus: 'connecting' })
        await get().initializeSocket()
      }

      // Verify socket is actually connected before proceeding
      if (!socketService.isConnected()) {
        console.error('❌ [SessionStore] Socket not connected after initialization')
        throw new Error('Failed to establish socket connection')
      }

      console.log('🚪 [SessionStore] Socket ready, calling socketService.joinSession')

      const session = await socketService.joinSession(sessionId, user)
      const duration = Date.now() - startTime

      console.log('✅ [SessionStore] Successfully joined session:', session)
      console.log('🔍 [SessionStore] Session join took:', duration + 'ms')
      console.log('🔍 [SessionStore] Session details:', {
        id: session.id,
        name: session.name,
        participantCount: session.participants.length,
        userIsParticipant: session.participants.some(p => p.id === user.id)
      })

      set({ currentSession: session, connectionStatus: 'connected' })
      console.log('✅ [SessionStore] Store updated with joined session')

      // Request current presence
      console.log('👥 [SessionStore] Requesting current presence for session:', sessionId)
      socketService.requestPresence(sessionId)
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ [SessionStore] Failed to join session after', duration + 'ms:', error)
      console.error('🔍 [SessionStore] Error details:', {
        sessionId,
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack?.split('\n').slice(0, 3)
      })
      set({ connectionStatus: 'error' })
      throw error
    }
  },

  leaveSession: (userId: string) => {
    const { currentSession } = get()
    if (currentSession) {
      socketService.leaveSession(currentSession.id, userId)
      set({
        currentSession: null,
        connectionStatus: 'disconnected',
        onlineUsers: []
      })
    }
  },

  clearSession: () => set({
    currentSession: null,
    connectionStatus: 'disconnected',
    onlineUsers: []
  }),

  // Activity management
  addVoiceContribution: (contribution, broadcast = true) => {
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            voiceContributions: [...state.currentSession.voiceContributions, contribution],
          }
        : null,
    }))

    if (broadcast && get().currentSession) {
      socketService.broadcastVoiceContribution(get().currentSession!.id, contribution)
    }
  },

  addTypingActivity: (activity, broadcast = true) => {
    console.log('⌨️ [SessionStore] AddTypingActivity called', { activity, broadcast, hasSession: !!get().currentSession })
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            typingActivities: [...state.currentSession.typingActivities, activity],
          }
        : null,
    }))

    if (broadcast && get().currentSession) {
      console.log('📤 [SessionStore] Broadcasting typing activity for session:', get().currentSession!.id)
      socketService.broadcastTypingActivity(get().currentSession!.id, activity)
    } else if (!get().currentSession) {
      console.log('❌ [SessionStore] Cannot broadcast typing activity: no current session')
    }
  },

  updateSettings: (newSettings) =>
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            settings: { ...state.currentSession.settings, ...newSettings },
          }
        : null,
    })),

  // Connection management
  initializeSocket: async () => {
    const state = get()
    console.log('🔌 [SessionStore] InitializeSocket called')
    console.log('🔍 [SessionStore] Current state:', {
      isInitialized: state.isInitialized,
      connectionStatus: state.connectionStatus,
      currentSession: state.currentSession?.id || 'none'
    })

    // If we're in error state, reset the socket first
    if (state.connectionStatus === 'error') {
      console.log('🔄 [SessionStore] Connection in error state, resetting socket')
      socketService.reset()
      set({ connectionStatus: 'disconnected', isInitialized: false })
    }

    if (state.connectionStatus === 'connected' || state.connectionStatus === 'connecting') {
      console.log('🚫 [SessionStore] Socket already connected or connecting, skipping')
      return
    }

    const startTime = Date.now()
    try {
      console.log('🔌 [SessionStore] Setting connection status to connecting')
      set({ connectionStatus: 'connecting' })

      console.log('🔌 [SessionStore] Calling socketService.connect()')
      await socketService.connect()
      const duration = Date.now() - startTime

      console.log('✅ [SessionStore] Socket connected successfully in', duration + 'ms')
      set({ connectionStatus: 'connected', isInitialized: true })

      // Set up event listeners
      socketService.onSessionUpdated((session) => {
        set({ currentSession: session })
      })

      socketService.onUserJoined((user) => {
        get().addUser(user)
      })

      socketService.onUserLeft((userId) => {
        get().removeUser(userId)
      })

      socketService.onVoiceContribution((contribution) => {
        get().addVoiceContribution(contribution, false) // Don't re-broadcast
      })

      socketService.onTypingActivity((activity) => {
        get().addTypingActivity(activity, false) // Don't re-broadcast
      })

      socketService.onUserPresence((users) => {
        set({ onlineUsers: users })
      })

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ [SessionStore] Failed to initialize socket after', duration + 'ms:', error)
      console.error('🔍 [SessionStore] Socket initialization error details:', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack?.split('\n').slice(0, 3)
      })
      set({ connectionStatus: 'error' })
      throw error
    }
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addUser: (user) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.find(u => u.id === user.id)
        ? state.onlineUsers
        : [...state.onlineUsers, user],
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            participants: state.currentSession.participants.find(u => u.id === user.id)
              ? state.currentSession.participants
              : [...state.currentSession.participants, user]
          }
        : null
    }))
  },

  removeUser: (userId) => {
    set((state) => ({
      onlineUsers: state.onlineUsers.filter(u => u.id !== userId),
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            participants: state.currentSession.participants.filter(u => u.id !== userId)
          }
        : null
    }))
  }
}))