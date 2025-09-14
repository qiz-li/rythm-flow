import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import BurstTimeline from './BurstTimeline'
import { BarChart3, Clock, Activity } from 'lucide-react'

interface RhythmFeedbackProps {
  currentUser: User
  onlineUsers?: User[]
}

export default function RhythmFeedback({ currentUser, onlineUsers = [] }: RhythmFeedbackProps) {
  const { currentSession } = useSessionStore()

  // Session stats
  const sessionDuration = currentSession
    ? Math.floor((Date.now() - currentSession.createdAt) / 1000)
    : 0

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const totalContributions = currentSession
    ? currentSession.voiceContributions.length + currentSession.typingActivities.length
    : 0

  const totalVoiceTime = currentSession
    ? currentSession.voiceContributions.reduce((sum, vc) => sum + vc.duration, 0)
    : 0

  const totalTypingChars = currentSession
    ? currentSession.typingActivities.reduce((sum, ta) => sum + ta.charsAdded + ta.charsDeleted, 0)
    : 0

  return (
    <div className="h-full flex flex-col">

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Activity Timeline - This is unique, no duplication */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Contributions
          </h3>
          <BurstTimeline />
        </div>

        {/* Session Overview - Unique high-level stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Session Overview
          </h3>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{totalContributions}</div>
                  <div className="text-xs text-gray-600">Total Actions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{formatDuration(sessionDuration)}</div>
                  <div className="text-xs text-gray-600">Session Time</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                <div className="font-semibold text-blue-700">
                  {Math.round(totalVoiceTime / 1000)}s
                </div>
                <div className="text-blue-600">Voice Time</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                <div className="font-semibold text-green-700">{totalTypingChars}</div>
                <div className="text-green-600">Characters</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}