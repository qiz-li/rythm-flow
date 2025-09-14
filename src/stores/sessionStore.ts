import { create } from 'zustand'
import { RhythmSession, VoiceContribution, TypingActivity, User } from '../types'
import { socketService } from '../services/socketService'

interface SessionState {
  currentSession: RhythmSession | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  onlineUsers: User[]
  isInitialized: boolean
  currentActiveUser: User | null
  demoUsers: User[]
  isDemoMode: boolean

  // Session management
  setSession: (session: RhythmSession) => void
  createSession: (sessionName: string, user: User) => Promise<void>
  joinSession: (sessionId: string, user: User) => Promise<void>
  leaveSession: (userId: string) => void
  clearSession: () => void

  // User switching (demo mode)
  switchToUser: (user: User) => void
  initializeDemoMode: (realUser: User) => void
  simulateDemoUserActivity: () => void

  // Activity management
  addVoiceContribution: (contribution: VoiceContribution, broadcast?: boolean) => void
  addTypingActivity: (activity: TypingActivity, broadcast?: boolean) => void
  updateSettings: (settings: Partial<RhythmSession['settings']>) => void
  
  // Content management
  updateSharedContent: (content: string, broadcast?: boolean) => void

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
  currentActiveUser: null,
  demoUsers: [],
  isDemoMode: false,

  // Session management
  setSession: (session) => set({ currentSession: session }),

  createSession: async (sessionName: string, user: User) => {
    try {
      console.log('🔄 Attempting to create session:', sessionName, 'as user:', user.name)
      set({ connectionStatus: 'connecting' })
      
      // Ensure socket is connected and event listeners are set up
      await get().initializeSocket()
      
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
      
      // Ensure socket is connected and event listeners are set up
      await get().initializeSocket()
      
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
    onlineUsers: [],
    currentActiveUser: null,
    demoUsers: [],
    isDemoMode: false
  }),

  // User switching (demo mode)
  switchToUser: (user: User) => {
    set({ currentActiveUser: user })
  },

  initializeDemoMode: (realUser: User) => {
    const { isDemoMode } = get()
    
    // Don't initialize if already in demo mode
    if (isDemoMode) return
    
    const demoUser: User = {
      id: 'demo-user-fixed', // Use a fixed ID to prevent duplicates
      name: 'Demo User',
      color: '#8b5cf6'
    }
    
    set({ 
      isDemoMode: true,
      currentActiveUser: realUser,
      demoUsers: [realUser, demoUser]
    })

    // Note: We don't add demo users to the session participants anymore
    // Instead, we handle demo users at the display level in components
  },

  simulateDemoUserActivity: () => {
    const { currentSession, demoUsers, isDemoMode } = get()
    if (!isDemoMode || !currentSession || demoUsers.length < 2) return

    const demoUser = demoUsers.find(u => u.id === 'demo-user-fixed')
    if (!demoUser) return

    // Simulate typing activity
    const now = Date.now()
    const typingActivity: TypingActivity = {
      userId: demoUser.id,
      timestamp: now,
      charsAdded: Math.floor(Math.random() * 5) + 1,
      charsDeleted: Math.random() > 0.8 ? Math.floor(Math.random() * 2) : 0,
      burstDuration: Math.random() > 0.5 ? Math.floor(Math.random() * 3000) + 1000 : 0
    }

    get().addTypingActivity(typingActivity, false)

    // Occasionally simulate voice contribution
    if (Math.random() > 0.9) {
      const voiceContribution: VoiceContribution = {
        id: 'demo-voice-' + Math.random().toString(36).substr(2, 9),
        userId: demoUser.id,
        timestamp: now,
        duration: Math.floor(Math.random() * 10000) + 3000,
        transcription: 'This is a simulated voice contribution from the demo user.',
        volume: Math.random() * 0.5 + 0.3
      }
      get().addVoiceContribution(voiceContribution, false)
    }
  },

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

    if (broadcast && get().currentSession && !get().isDemoMode) {
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

    if (broadcast && get().currentSession && !get().isDemoMode) {
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

  // Content management
  updateSharedContent: (content, broadcast = true) => {
    console.log('📝 [SessionStore] Updating shared content', { contentLength: content.length, broadcast })
    
    set((state) => ({
      currentSession: state.currentSession
        ? {
            ...state.currentSession,
            sharedContent: content,
          }
        : null,
    }))

    if (broadcast && get().currentSession && !get().isDemoMode) {
      console.log('📤 [SessionStore] Broadcasting content update for session:', get().currentSession!.id)
      socketService.broadcastContentUpdate(get().currentSession!.id, content)
    }
  },

  // Connection management
  initializeSocket: async () => {
    const state = get()
    
    // Always ensure socket is connected, but only set up event listeners once
    if (!state.isInitialized) {
      const startTime = Date.now()
      try {
        console.log('🔌 [SessionStore] Initializing socket connection...')
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

        socketService.onContentUpdate((content) => {
          console.log('🔥 [DEBUG] Received content-update event!', { contentLength: content.length })
          get().updateSharedContent(content, false) // Don't re-broadcast
        })

        socketService.onUserPresence((users) => {
          set({ onlineUsers: users })
        })

        console.log('✅ [SessionStore] Socket initialized and event listeners registered')

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
    } else {
      console.log('🔌 [SessionStore] Socket already initialized, ensuring connection...')
      if (!socketService.isConnected()) {
        await socketService.connect()
        set({ connectionStatus: 'connected' })
      }
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