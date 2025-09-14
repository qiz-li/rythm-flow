# Rhythm Flow

A collaborative workspace that analyzes contribution patterns and rhythm rather than content semantics. Focus on participation balance, activity bursts, and real-time engagement metrics.

## Features

### Core Concept
- **Shared Workspace**: Minimalist interface supporting both voice (transcribed via OpenAI Whisper) and typing contributions
- **Rhythm Analysis**: Focuses on pace, volume, and patterns of contributions, not content meaning
- **Real-time Feedback**: Live visualization of activity levels, burst patterns, and participation balance

### Input Channels
1. **Voice Channel**
   - Live speech capture and transcription via **OpenAI Whisper API**
   - High-quality real-time transcription with confidence scoring
   - Speaker attribution with timestamps
   - Prosodic cues (talk time, pauses, overlap) for rhythm analysis
   - Graceful fallback to mock transcriptions when API unavailable

2. **Typing Channel**  
   - Keystroke activity tracking (insertions, deletions, bursts, pauses)
   - Timestamped activity segments
   - No content analysis - only timing and volume metrics

### Real-time Visualizations
- **Activity Bars**: Per-participant contribution rate (voice seconds/min + typed chars/min)
- **Burst Timeline**: Visual blocks showing sustained speaking/typing activity
- **Balance Indicator**: Team balance score reflecting equitable floor sharing
- **Soft Nudges**: Optional gentle cues when participation becomes imbalanced

### Privacy & Controls
- **Content Agnostic**: Uses timing and volume only, no semantic analysis
- **Aggregation Options**: Can send windowed aggregates instead of raw event streams
- **Session Controls**: Host manages metric visibility and nudge settings
- **Transparency**: Clear UI indicators show exactly what's measured and shared

## Development

```bash
# Install dependencies
npm install

# Configure OpenAI API (optional for demo)
cp .env.example .env.local
# Add your OpenAI API key to .env.local

# Start development server
npm run dev

# Build for production  
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

## OpenAI Whisper Integration

This app integrates with **OpenAI Whisper API** for real-time speech transcription:

- **Real-time transcription**: Convert speech to text with high accuracy using Whisper-1 model
- **Word-level timestamps**: Precise timing information for rhythm analysis
- **Confidence scoring**: Quality indicators for transcription reliability
- **Fallback mode**: Intelligent mock transcriptions when API is unavailable
- **Connection monitoring**: Live status indicator in the voice controls

### Setup OpenAI API

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env.local`:
   ```
   VITE_OPENAI_API_KEY=your_api_key_here
   ```
3. App will automatically detect and use the API when configured

## Usage

1. **Create or Join Session**: Enter display name and create new session or join demo
2. **Contribute**: Type in shared document or use voice recording
3. **Monitor Rhythm**: Watch live activity bars and burst timeline in sidebar
4. **Session Summary**: Export participation metrics and patterns when complete

## Demo Script

The demo showcases:
- Two users typing with different patterns
- One user adding voice contributions  
- Live visualization of activity bars and burst indicators
- Balance indicator responding to participation changes
- Clean participation report at session end

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Audio**: Web Audio API + MediaRecorder
- **Icons**: Lucide React
- **Data Fetching**: TanStack Query

## Architecture

- `src/components/`: UI components for workspace, feedback, and controls
- `src/stores/`: Zustand stores for session state management  
- `src/types/`: TypeScript interfaces and types
- `src/utils/`: Utility functions and helpers
- `src/services/`: External service integrations (OpenAI Whisper API)

## Metrics Tracked

- **Rate**: Characters/minute (typing), seconds/minute (speaking)
- **Volume**: Cumulative characters/seconds per participant
- **Bursts**: Contiguous contributions separated by pauses
- **Balance**: Evenness of contribution distribution over time
- **Overlap**: Speaking overlap detection for interruption patterns