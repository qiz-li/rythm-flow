import { useEffect, useState } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { AlertTriangle, CheckCircle, Users } from 'lucide-react'

interface BalanceData {
  score: number
  level: 'good' | 'warning' | 'danger'
  dominantUser?: string
  suggestion?: string
}

export default function BalanceIndicator() {
  const { currentSession, demoUsers, isDemoMode } = useSessionStore()
  const [balance, setBalance] = useState<BalanceData>({
    score: 1.0,
    level: 'good'
  })
  
  // Use demo users if in demo mode, otherwise use session participants
  const displayUsers = isDemoMode ? demoUsers : (currentSession?.participants || [])

  useEffect(() => {
    if (!currentSession) return

    const calculateBalance = () => {
      const now = Date.now()
      const windowSize = 120000

      const participantActivity = displayUsers.map(user => {
        const recentTyping = currentSession.typingActivities.filter(
          activity => activity.userId === user.id && (now - activity.timestamp) < windowSize
        )
        
        const recentVoice = currentSession.voiceContributions.filter(
          contribution => contribution.userId === user.id && (now - contribution.timestamp) < windowSize
        )

        const typingActivity = recentTyping.reduce((sum, activity) => 
          sum + activity.charsAdded + activity.charsDeleted, 0
        )
        const voiceActivity = recentVoice.reduce((sum, contribution) => 
          sum + contribution.duration, 0
        )

        return {
          userId: user.id,
          userName: user.name,
          totalActivity: typingActivity + (voiceActivity / 100)
        }
      })

      const totalActivity = participantActivity.reduce((sum, user) => sum + user.totalActivity, 0)
      
      if (totalActivity === 0) {
        setBalance({
          score: 1.0,
          level: 'good'
        })
        return
      }

      const activityRatios = participantActivity.map(user => ({
        ...user,
        ratio: user.totalActivity / totalActivity
      }))

      const maxRatio = Math.max(...activityRatios.map(user => user.ratio))
      const dominantUser = activityRatios.find(user => user.ratio === maxRatio)

      let level: 'good' | 'warning' | 'danger' = 'good'
      let suggestion: string | undefined

      if (maxRatio > 0.8 && displayUsers.length > 1) {
        level = 'danger'
        suggestion = `${dominantUser?.userName} is dominating the conversation. Consider inviting others to contribute.`
      } else if (maxRatio > 0.6 && displayUsers.length > 1) {
        level = 'warning'
        suggestion = 'Contribution is somewhat unbalanced. Try to encourage more participation from quieter voices.'
      }

      const expectedActiveRatio = 1 / Math.max(displayUsers.length, 1)
      const balanceScore = 1 - Math.abs(maxRatio - expectedActiveRatio)

      setBalance({
        score: Math.max(balanceScore, 0),
        level,
        dominantUser: level !== 'good' ? dominantUser?.userName : undefined,
        suggestion
      })
    }

    calculateBalance()
    const interval = setInterval(calculateBalance, 5000)

    return () => clearInterval(interval)
  }, [currentSession, displayUsers])

  if (!currentSession) return null

  const getBalanceColor = (level: string) => {
    switch (level) {
      case 'good': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'danger': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getBalanceIcon = (level: string) => {
    switch (level) {
      case 'good': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'danger': return <AlertTriangle className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const scorePercentage = balance.score * 100

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-2 ${getBalanceColor(balance.level)}`}>
            {getBalanceIcon(balance.level)}
            <span className="font-medium capitalize">{balance.level} Balance</span>
          </div>
          <div className="text-sm text-gray-500">
            {Math.round(scorePercentage)}%
          </div>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              balance.level === 'good' 
                ? 'bg-gradient-to-r from-green-400 to-green-600' 
                : balance.level === 'warning'
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                : 'bg-gradient-to-r from-red-400 to-red-600'
            }`}
            style={{ width: `${scorePercentage}%` }}
          />
        </div>
      </div>

      {balance.suggestion && (
        <div className={`p-3 rounded-lg ${
          balance.level === 'warning' 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`text-sm ${
            balance.level === 'warning' ? 'text-yellow-800' : 'text-red-800'
          }`}>
            {balance.suggestion}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Participation Distribution
        </h4>
        
        {displayUsers.map(user => {
          const now = Date.now()
          const windowSize = 120000
          
          const recentTyping = currentSession.typingActivities.filter(
            activity => activity.userId === user.id && (now - activity.timestamp) < windowSize
          )
          const recentVoice = currentSession.voiceContributions.filter(
            contribution => contribution.userId === user.id && (now - contribution.timestamp) < windowSize
          )
          
          const activity = recentTyping.reduce((sum, act) => sum + act.charsAdded + act.charsDeleted, 0) +
                          recentVoice.reduce((sum, cont) => sum + cont.duration / 100, 0)
          
          const totalActivity = displayUsers.reduce((total, p) => {
            const pTyping = currentSession.typingActivities.filter(
              act => act.userId === p.id && (now - act.timestamp) < windowSize
            )
            const pVoice = currentSession.voiceContributions.filter(
              cont => cont.userId === p.id && (now - cont.timestamp) < windowSize
            )
            return total + pTyping.reduce((sum, act) => sum + act.charsAdded + act.charsDeleted, 0) +
                   pVoice.reduce((sum, cont) => sum + cont.duration / 100, 0)
          }, 0)
          
          const percentage = totalActivity > 0 ? (activity / totalActivity) * 100 : 0
          
          return (
            <div key={user.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: user.color + '80'
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}