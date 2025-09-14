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
    try {
      console.log('🔄 Attempting to create session:', sessionName, 'as user:', user.name)
      set({ connectionStatus: 'connecting' })
      const session = await socketService.createSession(sessionName, user)
      console.log('✅ Successfully created session:', session)
      set({ currentSession: session, connectionStatus: 'connected' })
    } catch (error) {
      console.error('❌ Failed to create session:', error)
      set({ connectionStatus: 'error' })
      throw error
    }
  },

  joinSession: async (sessionId: string, user: User) => {
    try {
      console.log('🔄 Attempting to join session:', sessionId, 'as user:', user.name)
      set({ connectionStatus: 'connecting' })
      const session = await socketService.joinSession(sessionId, user)
      console.log('✅ Successfully joined session:', session)
      set({ currentSession: session, connectionStatus: 'connected' })

      // Request current presence
      socketService.requestPresence(sessionId)
    } catch (error) {
      console.error('❌ Failed to join session:', error)
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
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            typingActivities: [...state.currentSession.typingActivities, activity],
          }
        : null,
    }))

    if (broadcast && get().currentSession) {
      socketService.broadcastTypingActivity(get().currentSession!.id, activity)
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
    if (state.isInitialized || state.connectionStatus === 'connected' || state.connectionStatus === 'connecting') return

    try {
      set({ connectionStatus: 'connecting' })
      await socketService.connect()
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
      console.error('Failed to initialize socket:', error)
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