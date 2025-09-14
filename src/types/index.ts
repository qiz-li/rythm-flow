export interface User {
  id: string
  name: string
  color: string
}

export interface VoiceContribution {
  id: string
  userId: string
  timestamp: number
  duration: number
  transcription: string
  volume?: number
}

export interface TypingActivity {
  userId: string
  timestamp: number
  charsAdded: number
  charsDeleted: number
  burstDuration: number
}

export interface ContributionMetrics {
  userId: string
  voiceTime: number
  typingChars: number
  burstCount: number
  dominanceWindows: Array<{ start: number; end: number }>
}

export interface SessionSettings {
  windowSize: number
  burstThreshold: number
  showLiveMetrics: boolean
  enableNudges: boolean
  privacyMode: 'full' | 'aggregated'
}

export interface RhythmSession {
  id: string
  name: string
  participants: User[]
  voiceContributions: VoiceContribution[]
  typingActivities: TypingActivity[]
  sharedContent: string  // Add shared content
  settings: SessionSettings
  createdAt: number
  isActive: boolean
}