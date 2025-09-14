# Multi-User Collaboration Guide

This document covers the multi-user real-time collaboration features added to Rhythm Flow.

## 🌟 Overview

Rhythm Flow now supports real-time multi-user collaboration with the following capabilities:

- **Real-time Sessions**: Multiple users can join the same session and collaborate live
- **Live Presence**: See who's online and actively participating
- **Activity Synchronization**: Voice and typing activities are shared in real-time
- **Session Recovery**: Automatic reconnection and session restoration
- **Connection Management**: Robust error handling and reconnection logic

## 🚀 Quick Start

### 1. Start the Full Application
```bash
# Install dependencies (first time only)
npm install

# Start both client and server
npm run dev:full
```

This will start:
- **Client**: http://localhost:5173 (React app)
- **Server**: http://localhost:3001 (Socket.IO server)

### 2. Test Multi-User Features

1. **Open two browser windows** to http://localhost:5173
2. **Create a session** in the first window:
   - Enter your name (e.g., "Alice")
   - Click "Create New Session"
   - Enter a session name
3. **Join the session** in the second window:
   - Enter a different name (e.g., "Bob")
   - Click "Join Existing Session"
   - Enter the session ID displayed in the first window
4. **Start collaborating**:
   - Type in either window - see activity sync in real-time
   - Record voice in either window - see contributions appear for both users
   - Watch the online users list update automatically

## 🏗 Architecture

### Frontend Components

#### Socket Service (`src/services/socketService.ts`)
- Manages WebSocket connection to the collaboration server
- Handles automatic reconnection with exponential backoff
- Provides type-safe event emission and handling
- Manages connection state and error recovery

#### Session Store (`src/stores/sessionStore.ts`)
- Enhanced Zustand store with real-time capabilities
- Manages session state, online users, and connection status
- Integrates with socket service for activity broadcasting
- Handles session creation, joining, and leaving

#### Session Recovery Hook (`src/hooks/useSessionRecovery.ts`)
- Automatically saves session data to localStorage
- Attempts to recover sessions after disconnection
- Manages reconnection attempts and cleanup
- Expires old session data (24 hours)

### Backend Server (`server/index.js`)

#### Session Management
- In-memory session storage (for demo purposes)
- User presence tracking
- Session creation and joining logic
- Activity broadcasting between participants

#### Socket Events
- **Incoming**: `create-session`, `join-session`, `leave-session`, `voice-contribution`, `typing-activity`
- **Outgoing**: `session-created`, `join-session-response`, `user-joined`, `user-left`, `session-updated`

## 🔧 Configuration

### Environment Variables

#### Client (`.env.local`)
```env
# OpenAI API key for voice transcription
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Socket.IO server URL
VITE_SOCKET_URL=ws://localhost:3001
```

#### Server
```env
# Port for collaboration server
PORT=3001

# CORS origins (comma-separated)
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

### Development Scripts
```bash
# Start full stack (client + server)
npm run dev:full

# Start client only (limited functionality)
npm run dev

# Start server only
npm run server
```

## 🔄 Real-time Features

### Session Management
- **Create Session**: Generate unique session ID and initialize empty session
- **Join Session**: Add user to existing session and sync current state
- **Leave Session**: Remove user and clean up empty sessions
- **Session Recovery**: Restore sessions after network interruptions

### Activity Synchronization
- **Voice Contributions**: Real-time sharing of voice recordings and transcriptions
- **Typing Activities**: Live synchronization of typing patterns and bursts
- **Presence Updates**: Automatic tracking of online/offline status

### Connection Handling
- **Auto-reconnection**: Exponential backoff reconnection strategy
- **Connection Status**: Visual indicators for connection state
- **Error Recovery**: Graceful handling of network issues
- **Manual Reconnect**: User-triggered reconnection attempts

## 📡 Socket Events Reference

### Client → Server

#### `create-session`
```typescript
{
  sessionName: string,
  user: User
}
```
Creates a new collaboration session.

#### `join-session`
```typescript
{
  sessionId: string,
  user: User
}
```
Joins an existing session.

#### `leave-session`
```typescript
{
  sessionId: string,
  userId: string
}
```
Leaves the current session.

#### `voice-contribution`
```typescript
{
  sessionId: string,
  contribution: VoiceContribution
}
```
Broadcasts a voice contribution to all session participants.

#### `typing-activity`
```typescript
{
  sessionId: string,
  activity: TypingActivity
}
```
Broadcasts typing activity to all session participants.

### Server → Client

#### `session-created`
```typescript
RhythmSession
```
Confirms session creation and provides session details.

#### `join-session-response`
```typescript
{
  success: boolean,
  session?: RhythmSession,
  error?: string
}
```
Response to join session request.

#### `user-joined`
```typescript
User
```
Notifies when a new user joins the session.

#### `user-left`
```typescript
string // userId
```
Notifies when a user leaves the session.

#### `session-updated`
```typescript
RhythmSession
```
Broadcasts session state updates.

## 🐛 Troubleshooting

### Connection Issues

**Problem**: Can't connect to collaboration server
- **Solution**: Ensure server is running (`npm run server`)
- **Check**: Verify `VITE_SOCKET_URL` in `.env.local`
- **Firewall**: Allow WebSocket connections on port 3001

**Problem**: Frequent disconnections
- **Solution**: Check network stability
- **Auto-recovery**: App will automatically attempt to reconnect
- **Manual**: Use the retry button in connection status indicator

### Session Issues

**Problem**: Can't join session with ID
- **Solution**: Verify session ID is correct (case-sensitive)
- **Timing**: Ensure session creator's browser is still open
- **Recovery**: Try creating a new session

**Problem**: Activities not syncing
- **Solution**: Check connection status indicator
- **Refresh**: Try refreshing both browser windows
- **Network**: Verify stable internet connection

### Recovery Issues

**Problem**: Session not recovering after disconnection
- **Solution**: Session recovery data may have expired (24 hours)
- **Storage**: Clear browser storage if having persistent issues
- **Manual**: Rejoin session using session ID

## 🧪 Testing

### Manual Testing Checklist

#### Basic Functionality
- [ ] Create new session with custom name
- [ ] Join existing session with session ID
- [ ] See online users list update in real-time
- [ ] Copy session ID functionality works

#### Activity Synchronization
- [ ] Typing in one window appears in activity feed of other windows
- [ ] Voice recording in one window appears for all participants
- [ ] Activity counters update in real-time
- [ ] Timeline shows contributions from all users

#### Connection Handling
- [ ] Connection status indicator shows correct state
- [ ] Automatic reconnection works after network interruption
- [ ] Manual reconnection button functions
- [ ] Session recovery after browser refresh

#### Edge Cases
- [ ] Last user leaving session cleans up properly
- [ ] Multiple users joining simultaneously
- [ ] User leaving mid-activity
- [ ] Server restart handling

### Automated Testing

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build production version
npm run build
```

## 🚀 Deployment

### Production Considerations

1. **WebSocket Server**: Deploy with proper WebSocket support (not just HTTP)
2. **CORS Configuration**: Update CORS origins for your production domain
3. **SSL/TLS**: Use `wss://` for secure WebSocket connections in production
4. **Load Balancing**: Consider sticky sessions for WebSocket connections
5. **Monitoring**: Add logging and monitoring for connection health

### Example Production Config

```env
# Production client
VITE_SOCKET_URL=wss://your-collaboration-server.com

# Production server
PORT=3001
CORS_ORIGIN=https://your-app.com,https://www.your-app.com
```

## 🔮 Future Enhancements

- **Persistent Sessions**: Database storage for session persistence
- **User Authentication**: Secure user management and session access
- **File Sharing**: Real-time document collaboration
- **Voice Chat**: Direct peer-to-peer voice communication
- **Session Analytics**: Advanced metrics and insights
- **Mobile Support**: Responsive design for mobile collaboration
- **Integration APIs**: Webhooks and third-party integrations