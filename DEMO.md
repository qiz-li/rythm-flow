# Rhythm Flow Demo Guide

## Quick Start

1. **Install and Run**
   ```bash
   npm install
   npm run dev
   ```
   The app will open at `http://localhost:3000`

2. **Optional: Configure Wispr Flow**
   ```bash
   cp .env.example .env.local
   # Add your Wispr Flow API key to .env.local for real transcription
   ```
   
3. **Join Demo Session**
   - Enter your name (e.g., "Alice", "Bob", "Charlie")
   - Click "Join Demo Session" for instant access
   - Or create a new named session

## Demo Features to Test

### 1. Typing Activity Detection
- Start typing in the collaborative document
- Watch the **Activity Bars** in the right sidebar show your typing rate
- Notice how bursts of typing appear in the **Burst Timeline**
- Pause typing to see activity levels decrease

### 2. Voice Recording & Transcription
- **Check Wispr Flow Status**: Look for the connection indicator in voice controls
- Click the microphone button to start recording
- Speak for a few seconds and click stop  
- Watch the transcription process (spinning loader)
- **With API**: Real transcription appears with confidence indicators
- **Without API**: Intelligent mock transcription generates realistic phrases
- Voice activity appears in activity bars and timeline

### 3. Real-time Rhythm Analysis
- **Activity Bars**: Show live chars/min (typing) and seconds/min (voice)
- **Burst Timeline**: Visual blocks for sustained activity
- **Balance Indicator**: Shows participation balance (currently shows "Good" for single user)

### 4. Session Summary
- Click the document icon (📄) in the header
- View detailed participation breakdown
- Export data as JSON or CSV
- See metrics: voice time, typing chars, burst count, dominance windows

## Multi-User Simulation

To test multi-user features (simulated):

1. Type rapidly for 30 seconds, then pause
2. Record a 10-second voice message
3. Type slowly for another minute
4. Check the session summary to see:
   - Participation distribution
   - Activity patterns
   - Rhythm analysis

## Key Observations

The system focuses on **rhythm and patterns**, not content:
- **No semantic analysis** - only timing, volume, pace
- **Privacy-first** - measures contribution patterns, not what you say/type  
- **Balance awareness** - highlights when participation becomes uneven
- **Burst detection** - identifies sustained activity periods
- **Export-ready** - clean data for retrospectives

## Expected Demo Flow

1. **Setup** (30 seconds): Join session, see clean interface
2. **Type & Talk** (2 minutes): Alternate between typing and voice recording
3. **Watch Metrics** (ongoing): Observe live activity bars and timeline
4. **Session Summary** (30 seconds): Export and review participation data
5. **Insights** (1 minute): Discuss rhythm patterns vs content analysis

## Architecture Highlights

- **Real-time Updates**: Activity metrics update every 1-5 seconds
- **Privacy Controls**: No content storage, only timing/volume data
- **Responsive Design**: Works on desktop and mobile
- **Export Options**: JSON/CSV for integration with other tools
- **Extensible**: Ready for multi-user WebSocket integration