import { create } from 'zustand'
import { RhythmSession, VoiceContribution, TypingActivity, User } from '../types'
import { socketService } from '../services/socketService'
import { userPreferencesService } from '../services/userPreferencesService'

interface SessionState {
  currentSession: RhythmSession | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  onlineUsers: User[]
  currentUser: User | null
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

  // Content management
  updateContent: (content: string, broadcast?: boolean) => void
  getContent: () => string

  // Connection management
  initializeSocket: () => Promise<void>
  setConnectionStatus: (status: SessionState['connectionStatus']) => void
  setOnlineUsers: (users: User[]) => void
  setCurrentUser: (user: User) => void
  switchCurrentUser: (userId: string) => void
  updateUser: (userId: string, updates: Partial<User>) => void
  updateSessionName: (name: string) => void
  addUser: (user: User) => void
  removeUser: (userId: string) => void

  // Session synchronization
  synchronizeSession: () => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  connectionStatus: 'disconnected',
  onlineUsers: [],
  currentUser: null,
  isInitialized: false,

  // Session management
  setSession: (session) => {
    if (!session) {
      set({ currentSession: null })
      return
    }

    // Ensure contributions are sorted chronologically
    const sortedVoiceContributions = [...session.voiceContributions]
      .sort((a, b) => a.timestamp - b.timestamp)

    const sortedTypingActivities = [...session.typingActivities]
      .sort((a, b) => a.timestamp - b.timestamp)

    // Validate timestamps and remove invalid entries
    const now = Date.now()
    const maxFutureOffset = 5000
    const maxPastOffset = 24 * 60 * 60 * 1000

    const validVoiceContributions = sortedVoiceContributions.filter(contribution => {
      const isValidTimestamp = contribution.timestamp > 0 &&
                              contribution.timestamp <= now + maxFutureOffset &&
                              contribution.timestamp >= now - maxPastOffset
      if (!isValidTimestamp) {
        console.warn('⚠️ [SessionStore] Invalid voice contribution timestamp filtered out:', contribution)
      }
      return isValidTimestamp
    })

    const validTypingActivities = sortedTypingActivities.filter(activity => {
      const isValidTimestamp = activity.timestamp > 0 &&
                              activity.timestamp <= now + maxFutureOffset &&
                              activity.timestamp >= now - maxPastOffset
      if (!isValidTimestamp) {
        console.warn('⚠️ [SessionStore] Invalid typing activity timestamp filtered out:', activity)
      }
      return isValidTimestamp
    })

    set({
      currentSession: {
        ...session,
        voiceContributions: validVoiceContributions,
        typingActivities: validTypingActivities
      }
    })
  },

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

      // Set current user
      set({ currentUser: user })

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

      // Wait a moment for the socket to stabilize
      console.log('⏳ [SessionStore] Waiting for socket to stabilize...')
      console.log('🔍 [SessionStore] Socket state before stabilization:', {
        connected: socketService.isConnected(),
        socketId: socketService.getSocket()?.id
      })
      
      // Wait for socket to be fully ready
      let attempts = 0
      const maxAttempts = 10
      while (!socketService.isConnected() && attempts < maxAttempts) {
        console.log(`⏳ [SessionStore] Waiting for socket connection... (${attempts + 1}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      console.log('🔍 [SessionStore] Socket state after stabilization:', {
        connected: socketService.isConnected(),
        socketId: socketService.getSocket()?.id
      })
      
      // Double-check socket connection
      if (!socketService.isConnected()) {
        console.error('❌ [SessionStore] Socket disconnected during stabilization')
        throw new Error('Socket connection lost during stabilization')
      }

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

      // Set online users from session participants immediately
      console.log('👥 [SessionStore] Setting online users from session participants:', session.participants.map(p => ({ id: p.id, name: p.name })))
      set({ onlineUsers: session.participants })
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

      // Set current user
      set({ currentUser: user })

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

      // Wait a moment for the socket to stabilize
      console.log('⏳ [SessionStore] Waiting for socket to stabilize...')
      console.log('🔍 [SessionStore] Socket state before stabilization:', {
        connected: socketService.isConnected(),
        socketId: socketService.getSocket()?.id
      })
      
      // Wait for socket to be fully ready
      let attempts = 0
      const maxAttempts = 10
      while (!socketService.isConnected() && attempts < maxAttempts) {
        console.log(`⏳ [SessionStore] Waiting for socket connection... (${attempts + 1}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      console.log('🔍 [SessionStore] Socket state after stabilization:', {
        connected: socketService.isConnected(),
        socketId: socketService.getSocket()?.id
      })
      
      // Double-check socket connection
      if (!socketService.isConnected()) {
        console.error('❌ [SessionStore] Socket disconnected during stabilization')
        throw new Error('Socket connection lost during stabilization')
      }

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

      // Set the current user in the store
      console.log('👤 [SessionStore] Setting current user in store:', user)
      set({ currentUser: user })

      // Set online users from session participants immediately
      console.log('👥 [SessionStore] Setting online users from session participants:', session.participants.map(p => ({ id: p.id, name: p.name })))
      set({ onlineUsers: session.participants })

      // Also request current presence as backup
      console.log('👥 [SessionStore] Requesting current presence for session:', sessionId)
      console.log('🔍 [SessionStore] Socket connected status:', socketService.isConnected())
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
    // Validate timestamp consistency
    const now = Date.now()
    const maxFutureOffset = 5000 // Allow 5 seconds in the future for clock skew
    const maxPastOffset = 24 * 60 * 60 * 1000 // Allow 24 hours in the past

    if (contribution.timestamp > now + maxFutureOffset || contribution.timestamp < now - maxPastOffset) {
      console.warn('⚠️ [SessionStore] Voice contribution timestamp out of range, adjusting:', {
        original: contribution.timestamp,
        now,
        adjusted: now
      })
      contribution.timestamp = now
    }

    set((state) => {
      if (!state.currentSession) return { currentSession: null }

      // Check for duplicates based on ID
      const existingContribution = state.currentSession.voiceContributions.find(vc => vc.id === contribution.id)
      if (existingContribution) {
        console.warn('⚠️ [SessionStore] Duplicate voice contribution ignored:', contribution.id)
        return state
      }

      // Insert in chronological order
      const contributions = [...state.currentSession.voiceContributions, contribution]
        .sort((a, b) => a.timestamp - b.timestamp)

      return {
        currentSession: {
          ...state.currentSession,
          voiceContributions: contributions,
        }
      }
    })

    if (broadcast && get().currentSession) {
      socketService.broadcastVoiceContribution(get().currentSession!.id, contribution)
    }
  },

  addTypingActivity: (activity, broadcast = true) => {
    console.log('⌨️ [SessionStore] AddTypingActivity called', { activity, broadcast, hasSession: !!get().currentSession })

    // Validate timestamp consistency
    const now = Date.now()
    const maxFutureOffset = 5000 // Allow 5 seconds in the future for clock skew
    const maxPastOffset = 24 * 60 * 60 * 1000 // Allow 24 hours in the past

    if (activity.timestamp > now + maxFutureOffset || activity.timestamp < now - maxPastOffset) {
      console.warn('⚠️ [SessionStore] Typing activity timestamp out of range, adjusting:', {
        original: activity.timestamp,
        now,
        adjusted: now
      })
      activity.timestamp = now
    }

    set((state) => {
      if (!state.currentSession) return { currentSession: null }

      // Check for exact duplicate activities (same timestamp and user)
      const exactDuplicates = state.currentSession.typingActivities.filter(
        ta => ta.userId === activity.userId && ta.timestamp === activity.timestamp
      )

      if (exactDuplicates.length > 0) {
        console.warn('⚠️ [SessionStore] Exact duplicate typing activity ignored:', activity)
        return state
      }

      // Insert in chronological order
      const activities = [...state.currentSession.typingActivities, activity]
        .sort((a, b) => a.timestamp - b.timestamp)

      return {
        currentSession: {
          ...state.currentSession,
          typingActivities: activities,
        }
      }
    })

    if (broadcast && get().currentSession) {
      console.log('📤 [SessionStore] Broadcasting typing activity for session:', get().currentSession!.id)
      console.log('🔍 [SessionStore] Activity details:', activity)
      console.log('🔍 [SessionStore] Socket connected:', socketService.isConnected())
      
      if (socketService.isConnected()) {
        socketService.broadcastTypingActivity(get().currentSession!.id, activity)
      } else {
        console.error('❌ [SessionStore] Cannot broadcast typing activity: socket not connected')
        console.log('🔄 [SessionStore] Attempting to reconnect socket...')
        // Try to reconnect the socket
        get().initializeSocket().catch(error => {
          console.error('❌ [SessionStore] Failed to reconnect socket:', error)
        })
      }
    } else if (!get().currentSession) {
      console.log('❌ [SessionStore] Cannot broadcast typing activity: no current session')
    } else if (!broadcast) {
      console.log('📥 [SessionStore] Not broadcasting typing activity (received from remote)')
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
  updateContent: (content: string, broadcast = true) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, content }
        : null,
    }))

    if (broadcast && get().currentSession && get().currentUser) {
      const { currentSession, currentUser } = get()
      socketService.broadcastContentUpdate(currentSession!.id, content, currentUser!.id)
    }
  },

  getContent: () => {
    const { currentSession } = get()
    return currentSession?.content || ''
  },

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
        get().setSession(session) // Use setSession for proper validation
        // Update online users from session participants
        console.log('👥 [SessionStore] Updating online users from session-updated:', session.participants.map(p => ({ id: p.id, name: p.name })))
        set({ onlineUsers: session.participants })
        // Synchronize after a short delay to allow all updates to process
        setTimeout(() => get().synchronizeSession(), 100)
      })

      // Add disconnect listener to track when socket disconnects
      const socket = socketService.getSocket()
      if (socket) {
        socket.on('disconnect', (reason) => {
          console.log('🔌 [SessionStore] Socket disconnected during session:', reason)
          console.log('🔍 [SessionStore] Disconnect details:', {
            reason,
            socketId: socket.id,
            timestamp: new Date().toISOString()
          })
          set({ connectionStatus: 'disconnected' })
        })
        
        // Add connection error listener
        socket.on('connect_error', (error) => {
          console.error('❌ [SessionStore] Socket connection error:', error)
          set({ connectionStatus: 'error' })
        })
      }

      socketService.onUserJoined((user) => {
        get().addUser(user)
      })

      socketService.onUserLeft((userId) => {
        get().removeUser(userId)
      })

      socketService.onVoiceContribution((contribution) => {
        get().addVoiceContribution(contribution, false) // Don't re-broadcast
        // Synchronize after receiving remote contribution
        setTimeout(() => get().synchronizeSession(), 100)
      })

      socketService.onTypingActivity((activity) => {
        get().addTypingActivity(activity, false) // Don't re-broadcast
        // Synchronize after receiving remote activity
        setTimeout(() => get().synchronizeSession(), 100)
      })

      socketService.onUserPresence((users) => {
        console.log('👥 [SessionStore] Received user-presence event:', users.map(u => ({ id: u.id, name: u.name })))
        set({ onlineUsers: users })
      })

      socketService.onContentUpdate(({ content, userId }) => {
        console.log('📝 [SessionStore] Received content update from user:', userId)
        get().updateContent(content, false) // Don't re-broadcast
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

  setCurrentUser: (user) => set({ currentUser: user }),

  switchCurrentUser: (userId) => {
    const { currentSession } = get()
    if (!currentSession) return

    // Only allow switching in demo sessions (demo sessions have predictable IDs starting with 'demo')
    if (!currentSession.id.startsWith('demo')) {
      console.warn('⚠️ [SessionStore] User switching only allowed in demo sessions')
      return
    }

    // Find the user to switch to
    const targetUser = currentSession.participants.find(p => p.id === userId)
    if (targetUser) {
      console.log('🔄 [SessionStore] Switching current user to:', targetUser.name)
      set({ currentUser: targetUser })
    } else {
      console.warn('⚠️ [SessionStore] User not found for switching:', userId)
    }
  },

  updateUser: (userId, updates) => {
    set((state) => {
      const updatedCurrentUser = state.currentUser?.id === userId
        ? { ...state.currentUser, ...updates }
        : state.currentUser

      return {
        currentUser: updatedCurrentUser,
        onlineUsers: state.onlineUsers.map(u =>
          u.id === userId ? { ...u, ...updates } : u
        ),
        currentSession: state.currentSession ? {
          ...state.currentSession,
          participants: state.currentSession.participants.map(u =>
            u.id === userId ? { ...u, ...updates } : u
          )
        } : null
      }
    })

    // Save to localStorage for persistence
    if (updates.name || updates.color) {
      const { currentUser } = get()
      if (currentUser && currentUser.id === userId) {
        userPreferencesService.saveUserPreferences(userId, {
          name: updates.name || currentUser.name,
          color: updates.color || currentUser.color
        })
      }
    }

    // Broadcast user update to other participants
    const { currentSession, currentUser } = get()
    if (currentSession && currentUser && currentUser.id === userId) {
      console.log('🔄 Broadcasting user update to session:', userId, updates)
      socketService.updateUser(currentSession.id, {
        ...currentUser,
        ...updates
      })
    }
  },

  updateSessionName: (name) => {
    set((state) => ({
      currentSession: state.currentSession ? {
        ...state.currentSession,
        name
      } : null
    }))

    // Broadcast session update if connected
    const { currentSession } = get()
    if (currentSession) {
      // You might want to add a socket event for session updates
      console.log('Session name updated:', name)
    }
  },

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
  },

  // Session synchronization
  synchronizeSession: () => {
    const { currentSession } = get()
    if (!currentSession) return

    // Re-validate and re-sort all contributions to ensure consistency
    const now = Date.now()
    const maxFutureOffset = 5000
    const maxPastOffset = 24 * 60 * 60 * 1000

    // Remove duplicates and invalid entries from voice contributions
    const uniqueVoiceContributions = currentSession.voiceContributions
      .filter((contribution, index, array) => {
        // Remove duplicates by ID
        const firstIndex = array.findIndex(c => c.id === contribution.id)
        const isUnique = firstIndex === index

        // Validate timestamp
        const isValidTimestamp = contribution.timestamp > 0 &&
                                contribution.timestamp <= now + maxFutureOffset &&
                                contribution.timestamp >= now - maxPastOffset

        return isUnique && isValidTimestamp
      })
      .sort((a, b) => a.timestamp - b.timestamp)

    // Remove duplicates and invalid entries from typing activities
    const uniqueTypingActivities = currentSession.typingActivities
      .filter((activity, index, array) => {
        // Remove duplicates by userId and timestamp (within 1 second)
        const isDuplicate = array.some((other, otherIndex) =>
          otherIndex < index &&
          other.userId === activity.userId &&
          Math.abs(other.timestamp - activity.timestamp) < 1000
        )

        // Validate timestamp
        const isValidTimestamp = activity.timestamp > 0 &&
                                activity.timestamp <= now + maxFutureOffset &&
                                activity.timestamp >= now - maxPastOffset

        return !isDuplicate && isValidTimestamp
      })
      .sort((a, b) => a.timestamp - b.timestamp)

    // Update session with cleaned data
    set((state) => ({
      currentSession: state.currentSession ? {
        ...state.currentSession,
        voiceContributions: uniqueVoiceContributions,
        typingActivities: uniqueTypingActivities
      } : null
    }))
  }
}))