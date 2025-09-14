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

### Demo Mode with User Switching

The demo session now includes a **User Switcher** that allows you to test multi-user collaboration features:

1. **Join Demo Session**: Click "Quick Demo Session" to enter demo mode
2. **User Switcher**: In the right sidebar, you'll see a "Demo Mode" panel with two users:
   - Your real user (with your chosen name)
   - A simulated "Demo User" 
3. **Switch Users**: Click on either user to switch between them
4. **Simulated Activity**: The Demo User will automatically generate typing and voice activity
5. **Track Contributions**: All UI components now show contributions from both users:
   - Activity bars show both users' typing and voice rates
   - Burst timeline displays activity from both users
   - Balance indicator shows participation distribution
   - Session summary includes both users' metrics

### Testing Multi-User Features

1. **Switch to Demo User**: Click on "Demo User" in the switcher
2. **Observe Activity**: Watch the Demo User generate automatic activity
3. **Switch Back**: Click on your real user to contribute manually
4. **Type and Record**: Add your own typing and voice contributions
5. **Watch Balance**: See how the balance indicator changes as both users contribute
6. **Check Timeline**: View the burst timeline showing activity from both users

## Key Observations

The system focuses on **rhythm and patterns**, not content:
- **No semantic analysis** - only timing, volume, pace
- **Privacy-first** - measures contribution patterns, not what you say/type  
- **Balance awareness** - highlights when participation becomes uneven
- **Burst detection** - identifies sustained activity periods
- **Export-ready** - clean data for retrospectives

## Expected Demo Flow

1. **Setup** (30 seconds): Join demo session, see user switcher in sidebar
2. **User Switching** (1 minute): Switch between real user and demo user, observe automatic activity
3. **Type & Talk** (2 minutes): Add your own contributions while demo user generates activity
4. **Watch Metrics** (ongoing): Observe live activity bars, timeline, and balance from both users
5. **Session Summary** (30 seconds): Export and review participation data from both users
6. **Insights** (1 minute): Discuss rhythm patterns, multi-user balance, and contribution tracking

## Architecture Highlights

- **Real-time Updates**: Activity metrics update every 1-5 seconds
- **Privacy Controls**: No content storage, only timing/volume data
- **Responsive Design**: Works on desktop and mobile
- **Export Options**: JSON/CSV for integration with other tools
- **Extensible**: Ready for multi-user WebSocket integration