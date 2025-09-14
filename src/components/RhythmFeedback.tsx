import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import ActivityBars from './ActivityBars'
import BurstTimeline from './BurstTimeline'
import BalanceIndicator from './BalanceIndicator'
import { BarChart3, Clock, Users, User as UserIcon } from 'lucide-react'

interface RhythmFeedbackProps {
  currentUser: User
  onlineUsers?: User[]
}

export default function RhythmFeedback({ currentUser, onlineUsers = [] }: RhythmFeedbackProps) {
  const { currentSession, demoUsers, isDemoMode } = useSessionStore()
  
  // Use demo users if in demo mode, otherwise use online users
  const displayUsers = isDemoMode ? demoUsers : onlineUsers

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
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-rhythm-primary" />
          Rhythm Analytics
        </h2>
        <p className="text-sm text-gray-600 mt-1">Live contribution patterns</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Online Users */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            {isDemoMode ? 'Demo Participants' : 'Online Participants'} ({displayUsers.length})
          </h3>
          <div className="space-y-2">
            {displayUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                <span className="text-sm text-gray-700 flex-1">{user.name}</span>
                {user.id === currentUser.id && (
                  <span className="text-xs text-rhythm-primary font-medium">You</span>
                )}
                {isDemoMode && user.name === 'Demo User' && (
                  <span className="text-xs text-purple-600 font-medium">Sim</span>
                )}
              </div>
            ))}
            {displayUsers.length === 0 && (
              <div className="text-sm text-gray-500 italic">No other participants online</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Activity Levels
          </h3>
          <ActivityBars currentUser={currentUser} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Contribution Timeline
          </h3>
          <BurstTimeline />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Session Balance
          </h3>
          <BalanceIndicator />
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Session Duration:</span>
            <span className="font-mono">{formatDuration(sessionDuration)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Contributions:</span>
            <span className="font-mono">{totalContributions}</span>
          </div>
          <div className="flex justify-between">
            <span>Active Participants:</span>
            <span className="font-mono">{displayUsers.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}