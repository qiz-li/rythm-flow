const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: [
      // Development
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      // Production - Update these with your actual domains
      "https://*.vercel.app",
      "https://*.netlify.app",
      /^https:\/\/rhythm-flow.*\.vercel\.app$/,
      /^https:\/\/.*--rhythm-flow.*\.netlify\.app$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000,
  connectTimeout: 20000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6
})

// In-memory storage for demo purposes
const sessions = new Map()
const userSessions = new Map()

// User color palette
const userColors = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
]

// Function to get available color for a session
const getAvailableColor = (existingParticipants) => {
  const usedColors = new Set(existingParticipants.map(p => p.color))
  const availableColors = userColors.filter(color => !usedColors.has(color))

  if (availableColors.length > 0) {
    return availableColors[Math.floor(Math.random() * availableColors.length)]
  }

  // If all colors are used, return a random color (fallback for sessions with >10 users)
  return userColors[Math.floor(Math.random() * userColors.length)]
}

// Session management
class SessionManager {
  createSession(sessionName, creator) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`

    const session = {
      id: sessionId,
      name: sessionName,
      participants: [creator],
      voiceContributions: [],
      typingActivities: [],
      content: '', // Add shared content
      settings: {
        windowSize: 30000,
        burstThreshold: 5,
        showLiveMetrics: true,
        enableNudges: true,
        privacyMode: 'full'
      },
      createdAt: Date.now(),
      isActive: true
    }

    sessions.set(sessionId, session)
    userSessions.set(creator.id, sessionId)

    return session
  }

  joinSession(sessionId, user) {
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    // Check if user is already in session
    const existingUser = session.participants.find(p => p.id === user.id)
    if (existingUser) {
      // User already exists, update their info but keep existing color unless changed
      Object.assign(existingUser, user)
      userSessions.set(user.id, sessionId)
      return session
    }

    // Check for color conflicts with existing participants
    const conflictingUser = session.participants.find(p => p.color === user.color)
    if (conflictingUser) {
      // Assign a new available color to avoid conflict
      user.color = getAvailableColor(session.participants)
      console.log(`🎨 Color conflict resolved for user ${user.name}: ${user.color}`)
    }

    // Add new user to session
    session.participants.push(user)
    userSessions.set(user.id, sessionId)
    return session
  }

  leaveSession(sessionId, userId) {
    const session = sessions.get(sessionId)
    if (session) {
      session.participants = session.participants.filter(p => p.id !== userId)

      // Remove session if no participants
      if (session.participants.length === 0) {
        sessions.delete(sessionId)
      }
    }

    userSessions.delete(userId)
  }

  addVoiceContribution(sessionId, contribution) {
    const session = sessions.get(sessionId)
    if (session) {
      // Validate timestamp consistency
      const now = Date.now()
      const maxFutureOffset = 5000 // Allow 5 seconds in the future for clock skew
      const maxPastOffset = 24 * 60 * 60 * 1000 // Allow 24 hours in the past

      if (contribution.timestamp > now + maxFutureOffset || contribution.timestamp < now - maxPastOffset) {
        console.warn('⚠️ [Server] Voice contribution timestamp out of range, adjusting:', {
          contributionId: contribution.id,
          original: contribution.timestamp,
          now,
          adjusted: now
        })
        contribution.timestamp = now
      }

      // Check for duplicates based on ID
      const existingContribution = session.voiceContributions.find(vc => vc.id === contribution.id)
      if (existingContribution) {
        console.warn('⚠️ [Server] Duplicate voice contribution ignored:', contribution.id)
        return false
      }

      // Add and maintain chronological order
      session.voiceContributions.push(contribution)
      session.voiceContributions.sort((a, b) => a.timestamp - b.timestamp)

      return true
    }
    return false
  }

  addTypingActivity(sessionId, activity) {
    const session = sessions.get(sessionId)
    if (session) {
      // Validate timestamp consistency
      const now = Date.now()
      const maxFutureOffset = 5000 // Allow 5 seconds in the future for clock skew
      const maxPastOffset = 24 * 60 * 60 * 1000 // Allow 24 hours in the past

      if (activity.timestamp > now + maxFutureOffset || activity.timestamp < now - maxPastOffset) {
        console.warn('⚠️ [Server] Typing activity timestamp out of range, adjusting:', {
          userId: activity.userId,
          original: activity.timestamp,
          now,
          adjusted: now
        })
        activity.timestamp = now
      }

      // Check for exact duplicates (same timestamp and user) - allow rapid typing
      const exactDuplicates = session.typingActivities.filter(
        ta => ta.userId === activity.userId && ta.timestamp === activity.timestamp
      )

      if (exactDuplicates.length > 0) {
        console.warn('⚠️ [Server] Exact duplicate typing activity ignored:', {
          userId: activity.userId,
          timestamp: activity.timestamp
        })
        return false
      }

      // Add and maintain chronological order
      session.typingActivities.push(activity)
      session.typingActivities.sort((a, b) => a.timestamp - b.timestamp)

      return true
    }
    return false
  }

  getSession(sessionId) {
    return sessions.get(sessionId)
  }

  getOnlineUsers(sessionId) {
    const session = sessions.get(sessionId)
    return session ? session.participants : []
  }

  updateContent(sessionId, content) {
    const session = sessions.get(sessionId)
    if (session) {
      session.content = content
      return true
    }
    return false
  }
}

const sessionManager = new SessionManager()

// Create demo session
const demoUser = {
  id: 'demo-user',
  name: 'Demo User',
  color: '#6366f1'
}

sessionManager.createSession('Demo Session', demoUser)
sessions.set('demo-session', {
  ...sessions.get(sessionManager.getSession(userSessions.get('demo-user')).id),
  id: 'demo-session'
})
sessions.delete(userSessions.get('demo-user'))
userSessions.delete('demo-user')

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id} from ${socket.handshake.address}`)
  console.log(`🔍 Connection details:`, {
    transport: socket.conn.transport.name,
    upgraded: socket.conn.upgraded,
    remoteAddress: socket.handshake.address,
    headers: socket.handshake.headers.origin
  })

  // Track connection state
  socket.connectedAt = Date.now()
  socket.lastActivity = Date.now()
  
  // Set up a timeout to track inactive connections
  socket.activityTimeout = setTimeout(() => {
    if (socket.connected && Date.now() - socket.lastActivity > 30000) {
      console.log(`⚠️ [Server] Socket ${socket.id} has been inactive for 30 seconds`)
    }
  }, 30000)

  // Debug: log all incoming events
  socket.onAny((eventName, ...args) => {
    socket.lastActivity = Date.now()
    console.log(`📡 [DEBUG] Received event '${eventName}' from ${socket.id}:`, args)
    console.log(`🔍 [DEBUG] Socket state:`, {
      connected: socket.connected,
      sessionId: socket.sessionId,
      userId: socket.userId,
      connectedFor: Date.now() - socket.connectedAt
    })
    
    // Special handling for create-session events
    if (eventName === 'create-session') {
      console.log(`🆕 [DEBUG] CREATE-SESSION EVENT RECEIVED!`)
      console.log(`🔍 [DEBUG] Event data:`, args[0])
      console.log(`🔍 [DEBUG] Event args length:`, args.length)
      console.log(`🔍 [DEBUG] Event args:`, args)
    }
  })

  console.log(`🔧 [Server] Registering create-session handler for socket ${socket.id}`)
  socket.on('create-session', (data) => {
    console.log(`🆕 [Server] CREATE-SESSION HANDLER CALLED!`)
    console.log(`🔍 [Server] Received data:`, data)
    
    const { sessionName, user } = data
    try {
      console.log(`🆕 [Server] Creating session '${sessionName}' for user ${user.name} (${user.id})`)
      console.log(`🔍 [Server] Socket state:`, {
        connected: socket.connected,
        id: socket.id,
        connectedFor: Date.now() - socket.connectedAt
      })
      
      const session = sessionManager.createSession(sessionName, user)
      socket.join(session.id)
      socket.userId = user.id
      socket.sessionId = session.id

      console.log(`✅ [Server] Session created successfully: ${session.id}`)
      socket.emit('session-created', { success: true, session })
      console.log(`Session created: ${session.id} by ${user.name}`)
    } catch (error) {
      console.error(`❌ [Server] Failed to create session: ${error.message}`)
      socket.emit('session-created', { success: false, error: error.message })
      console.error(`Failed to create session: ${error.message}`)
    }
  })

  socket.on('join-session', ({ sessionId, user }) => {
    try {
      const session = sessionManager.joinSession(sessionId, user)
      socket.join(sessionId)
      socket.userId = user.id
      socket.sessionId = sessionId

      // Debug room membership
      console.log(`👥 Socket ${socket.id} joined room ${sessionId}`)
      console.log(`🏠 Room ${sessionId} now has ${io.sockets.adapter.rooms.get(sessionId)?.size || 0} members`)

      socket.emit('join-session-response', { success: true, session })
      socket.to(sessionId).emit('user-joined', user)
      socket.to(sessionId).emit('session-updated', session)

      console.log(`${user.name} joined session: ${sessionId}`)
    } catch (error) {
      socket.emit('join-session-response', { success: false, error: error.message })
    }
  })

  socket.on('leave-session', ({ sessionId, userId }) => {
    sessionManager.leaveSession(sessionId, userId)
    socket.leave(sessionId)
    socket.to(sessionId).emit('user-left', userId)

    const updatedSession = sessionManager.getSession(sessionId)
    if (updatedSession) {
      socket.to(sessionId).emit('session-updated', updatedSession)
    }

    console.log(`User ${userId} left session: ${sessionId}`)
  })

  socket.on('voice-contribution', ({ sessionId, contribution }) => {
    console.log(`🎤 Voice contribution from ${contribution.userId} in session ${sessionId}`)
    if (sessionManager.addVoiceContribution(sessionId, contribution)) {
      socket.to(sessionId).emit('voice-contribution', contribution)
      console.log(`📤 Broadcasted voice contribution to session ${sessionId}`)

      const updatedSession = sessionManager.getSession(sessionId)
      if (updatedSession) {
        io.to(sessionId).emit('session-updated', updatedSession)
      }
    }
  })

  // Test message handler
  socket.on('test-message', (data) => {
    console.log(`🧪 [DEBUG] Received test-message from ${socket.id}:`, data)
  })

  // Test create-session handler
  socket.on('test-create-session', (data) => {
    console.log(`🧪 [DEBUG] Received test-create-session from ${socket.id}:`, data)
  })

  socket.on('typing-activity', ({ sessionId, activity }) => {
    console.log(`⌨️ Typing activity from ${activity.userId} in session ${sessionId}`)
    console.log(`🔍 Activity details:`, activity)
    console.log(`🏠 Room ${sessionId} has ${io.sockets.adapter.rooms.get(sessionId)?.size || 0} members`)
    console.log(`👤 Socket ${socket.id} is in session ${socket.sessionId}`)
    console.log(`🔍 Socket rooms:`, Array.from(socket.rooms))
    console.log(`🔍 All rooms:`, Array.from(io.sockets.adapter.rooms.keys()))

    if (sessionManager.addTypingActivity(sessionId, activity)) {
      console.log(`📤 Broadcasting typing activity to ${(io.sockets.adapter.rooms.get(sessionId)?.size || 0) - 1} other users`)
      socket.to(sessionId).emit('typing-activity', activity)
      console.log(`✅ Broadcasted typing activity to session ${sessionId}`)

      const updatedSession = sessionManager.getSession(sessionId)
      if (updatedSession) {
        io.to(sessionId).emit('session-updated', updatedSession)
        console.log(`📤 Sent session-updated to all users in ${sessionId}`)
      }
    } else {
      console.log(`❌ Failed to add typing activity to session ${sessionId}`)
    }
  })

  socket.on('request-presence', (sessionId) => {
    console.log(`👥 [Server] Received request-presence for session ${sessionId} from socket ${socket.id}`)
    const onlineUsers = sessionManager.getOnlineUsers(sessionId)
    console.log(`👥 [Server] Sending user-presence with ${onlineUsers.length} users:`, onlineUsers.map(u => ({ id: u.id, name: u.name })))
    socket.emit('user-presence', onlineUsers)
  })

  socket.on('content-update', ({ sessionId, content, userId }) => {
    console.log(`📝 [Server] Content update from ${userId} in session ${sessionId}`)
    console.log(`🔍 [Server] Content length: ${content.length}`)
    
    if (sessionManager.updateContent(sessionId, content)) {
      // Broadcast content update to all other users in the session
      socket.to(sessionId).emit('content-update', { content, userId })
      console.log(`📤 [Server] Broadcasted content update to session ${sessionId}`)
      
      // Also send session-updated to keep everything in sync
      const updatedSession = sessionManager.getSession(sessionId)
      if (updatedSession) {
        io.to(sessionId).emit('session-updated', updatedSession)
        console.log(`📤 [Server] Sent session-updated with new content`)
      }
    } else {
      console.log(`❌ [Server] Failed to update content for session ${sessionId}`)
    }
  })

  socket.on('disconnect', () => {
    // Clear the activity timeout
    if (socket.activityTimeout) {
      clearTimeout(socket.activityTimeout)
    }
    
    if (socket.sessionId && socket.userId) {
      sessionManager.leaveSession(socket.sessionId, socket.userId)
      socket.to(socket.sessionId).emit('user-left', socket.userId)

      const updatedSession = sessionManager.getSession(socket.sessionId)
      if (updatedSession) {
        socket.to(socket.sessionId).emit('session-updated', updatedSession)
      }
    }

    console.log(`User disconnected: ${socket.id}`)
    console.log(`🔍 [Server] Connection duration: ${Date.now() - socket.connectedAt}ms`)
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    sessions: sessions.size,
    uptime: process.uptime()
  })
})

// Basic info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Rhythm Flow Socket.IO Server',
    version: '1.0.0',
    status: 'running',
    sessions: sessions.size,
    endpoints: {
      health: '/health',
      websocket: 'ws://this-domain'
    }
  })
})

const PORT = process.env.PORT || 3001
// Restart trigger

httpServer.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`)
  console.log(`🎯 Demo session available at: demo-session`)
})