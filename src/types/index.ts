export interface TypingBaseline {
  wpm: number
  accuracy: number
  duration: number
  timestamp: number
}

export interface User {
  id: string
  name: string
  color: string
  typingBaseline?: TypingBaseline
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

export interface UserBalance {
  userId: string
  voiceContribution: number // 0-1 percentage of total voice time
  typingContribution: number // 0-1 percentage of total typing
  overallBalance: number // 0-1 combined balance score
  participationLevel: 'silent' | 'low' | 'balanced' | 'dominant'
  lastActivity: number // timestamp
}

export interface BalanceToast {
  id: string
  userId: string
  message: string
  type: 'encourage' | 'moderate' | 'praise' | 'engage'
  timestamp: number
  duration: number
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
  content: string
  settings: SessionSettings
  createdAt: number
  isActive: boolean
}