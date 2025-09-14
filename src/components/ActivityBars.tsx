import { useEffect, useState } from 'react'
import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import { Keyboard, Mic } from 'lucide-react'

interface ActivityBarsProps {
  currentUser: User
}

interface ActivityData {
  userId: string
  typingRate: number
  voiceRate: number
  totalActivity: number
}

export default function ActivityBars({ currentUser }: ActivityBarsProps) {
  const { currentSession, demoUsers, isDemoMode } = useSessionStore()
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  
  // Use demo users if in demo mode, otherwise use session participants
  const displayUsers = isDemoMode ? demoUsers : (currentSession?.participants || [])

  useEffect(() => {
    if (!currentSession) return

    const calculateActivity = () => {
      const now = Date.now()
      const windowSize = 60000

      const activities: ActivityData[] = displayUsers.map(user => {
        const recentTyping = currentSession.typingActivities.filter(
          activity => activity.userId === user.id && (now - activity.timestamp) < windowSize
        )
        
        const recentVoice = currentSession.voiceContributions.filter(
          contribution => contribution.userId === user.id && (now - contribution.timestamp) < windowSize
        )

        const typingChars = recentTyping.reduce((sum, activity) => 
          sum + activity.charsAdded + activity.charsDeleted, 0
        )
        const voiceTime = recentVoice.reduce((sum, contribution) => 
          sum + contribution.duration, 0
        )

        const typingRate = typingChars / (windowSize / 60000)
        const voiceRate = voiceTime / (windowSize / 60000)
        const totalActivity = typingRate + (voiceRate / 1000)

        return {
          userId: user.id,
          typingRate,
          voiceRate,
          totalActivity
        }
      })

      setActivityData(activities)
    }

    calculateActivity()
    const interval = setInterval(calculateActivity, 1000)

    return () => clearInterval(interval)
  }, [currentSession, displayUsers])

  if (!currentSession) return null

  const maxActivity = Math.max(...activityData.map(data => data.totalActivity), 1)

  return (
    <div className="space-y-4">
      {displayUsers.map(user => {
        const userActivity = activityData.find(data => data.userId === user.id) || {
          userId: user.id,
          typingRate: 0,
          voiceRate: 0,
          totalActivity: 0
        }

        const isCurrentUser = user.id === currentUser.id

        return (
          <div key={user.id} className={`p-3 rounded-lg ${isCurrentUser ? 'bg-rhythm-primary/5 border border-rhythm-primary/20' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {user.name}
                  {isCurrentUser && <span className="text-rhythm-primary ml-1">(you)</span>}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(userActivity.totalActivity)} u/min
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Keyboard className="w-3 h-3 text-gray-400" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full activity-bar transition-all duration-500"
                    style={{ 
                      width: `${Math.min((userActivity.typingRate / Math.max(maxActivity, 1)) * 100, 100)}%`,
                      background: `linear-gradient(to right, ${user.color}40, ${user.color}80)`
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">
                  {Math.round(userActivity.typingRate)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Mic className="w-3 h-3 text-gray-400" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full activity-bar transition-all duration-500"
                    style={{ 
                      width: `${Math.min((userActivity.voiceRate / 1000 / Math.max(maxActivity, 1)) * 100, 100)}%`,
                      background: `linear-gradient(to right, ${user.color}60, ${user.color})`
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">
                  {Math.round(userActivity.voiceRate / 1000)}
                </span>
              </div>
            </div>

            {userActivity.totalActivity > 0 && (
              <div className="mt-2 flex items-center justify-center">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        )
      })}

      {activityData.every(data => data.totalActivity === 0) && (
        <div className="text-center py-6 text-gray-500">
          <div className="w-8 h-8 border-2 border-gray-300 border-dashed rounded-full mx-auto mb-2" />
          <p className="text-sm">No recent activity</p>
          <p className="text-xs">Start typing or recording to see live metrics</p>
        </div>
      )}
    </div>
  )
}