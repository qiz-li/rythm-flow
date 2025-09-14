const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"], // Support both Vite ports
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})

// In-memory storage for demo purposes
const sessions = new Map()
const userSessions = new Map()

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

    // Add user if not already in session
    if (!session.participants.find(p => p.id === user.id)) {
      session.participants.push(user)
    }

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
      session.voiceContributions.push(contribution)
      return true
    }
    return false
  }

  addTypingActivity(sessionId, activity) {
    const session = sessions.get(sessionId)
    if (session) {
      session.typingActivities.push(activity)
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

  socket.on('create-session', ({ sessionName, user }) => {
    try {
      const session = sessionManager.createSession(sessionName, user)
      socket.join(session.id)
      socket.userId = user.id
      socket.sessionId = session.id

      socket.emit('session-created', { success: true, session })
      console.log(`Session created: ${session.id} by ${user.name}`)
    } catch (error) {
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

  socket.on('typing-activity', ({ sessionId, activity }) => {
    console.log(`⌨️ Typing activity from ${activity.userId} in session ${sessionId}`)
    console.log(`🔍 Activity details:`, activity)
    console.log(`🏠 Room ${sessionId} has ${io.sockets.adapter.rooms.get(sessionId)?.size || 0} members`)
    console.log(`👤 Socket ${socket.id} is in session ${socket.sessionId}`)

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
    const onlineUsers = sessionManager.getOnlineUsers(sessionId)
    socket.emit('user-presence', onlineUsers)
  })

  socket.on('disconnect', () => {
    if (socket.sessionId && socket.userId) {
      sessionManager.leaveSession(socket.sessionId, socket.userId)
      socket.to(socket.sessionId).emit('user-left', socket.userId)

      const updatedSession = sessionManager.getSession(socket.sessionId)
      if (updatedSession) {
        socket.to(socket.sessionId).emit('session-updated', updatedSession)
      }
    }

    console.log(`User disconnected: ${socket.id}`)
  })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
  console.log(`Demo session available at: demo-session`)
})