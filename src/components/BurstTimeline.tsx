import { useEffect, useState } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import TypingWaveform from './TypingWaveform'

interface BurstEvent {
  id: string
  userId: string
  type: 'typing' | 'voice'
  start: number
  duration: number
  intensity: number
}

export default function BurstTimeline() {
  const { currentSession } = useSessionStore()
  const [bursts, setBursts] = useState<BurstEvent[]>([])

  useEffect(() => {
    if (!currentSession) return

    const calculateBursts = () => {
      const now = Date.now()
      const timeWindow = 300000
      const newBursts: BurstEvent[] = []

      console.log('🔄 [BurstTimeline] Processing typing activities:', {
        total: currentSession.typingActivities.length,
        activities: currentSession.typingActivities.map(a => ({
          userId: a.userId,
          timestamp: a.timestamp,
          burstDuration: a.burstDuration,
          charsAdded: a.charsAdded,
          charsDeleted: a.charsDeleted
        }))
      })

      // Process typing activities with validation
      currentSession.typingActivities
        .filter(activity => {
          const isInWindow = (now - activity.timestamp) < timeWindow
          const hasValidDuration = activity.burstDuration >= 0 // Allow 0 duration for single keystrokes
          const hasValidTimestamp = activity.timestamp > 0 && activity.timestamp <= now + 5000 // Allow small clock skew
          return isInWindow && hasValidDuration && hasValidTimestamp
        })
        .forEach(activity => {
          const burstId = `typing_${activity.userId}_${activity.timestamp}`
          // Check for duplicates
          if (!newBursts.find(b => b.id === burstId)) {
            const burst = {
              id: burstId,
              userId: activity.userId,
              type: 'typing' as const,
              start: activity.timestamp,
              duration: Math.max(activity.burstDuration, 500), // Minimum 500ms for visibility
              intensity: Math.min((activity.charsAdded + activity.charsDeleted) / Math.max(activity.burstDuration, 500), 2)
            }
            newBursts.push(burst)
            console.log('✅ [BurstTimeline] Added typing burst:', burst)
          }
        })

      // Process voice contributions with validation
      currentSession.voiceContributions
        .filter(contribution => {
          const isInWindow = (now - contribution.timestamp) < timeWindow
          const hasValidDuration = contribution.duration > 0
          const hasValidTimestamp = contribution.timestamp > 0 && contribution.timestamp <= now + 5000
          return isInWindow && hasValidDuration && hasValidTimestamp
        })
        .forEach(contribution => {
          const burstId = `voice_${contribution.id}`
          // Check for duplicates
          if (!newBursts.find(b => b.id === burstId)) {
            newBursts.push({
              id: burstId,
              userId: contribution.userId,
              type: 'voice',
              start: contribution.timestamp,
              duration: contribution.duration,
              intensity: Math.min(contribution.duration / 10000, 1)
            })
          }
        })

      // Sort by start time (most recent first) and ensure consistent ordering
      setBursts(newBursts.sort((a, b) => {
        if (b.start !== a.start) return b.start - a.start
        // If timestamps are equal, sort by type then userId for consistency
        if (a.type !== b.type) return a.type.localeCompare(b.type)
        return a.userId.localeCompare(b.userId)
      }))
    }

    calculateBursts()
    const interval = setInterval(calculateBursts, 2000)

    return () => clearInterval(interval)
  }, [currentSession])

  if (!currentSession || bursts.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <div className="w-full h-2 bg-gray-200 rounded-full mb-3" />
        <p className="text-sm">No activity bursts detected</p>
        <p className="text-xs">Sustained activity will appear as timeline blocks</p>
      </div>
    )
  }

  const now = Date.now()
  const timeWindow = 300000
  const startTime = now - timeWindow

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    const seconds = Math.round(ms / 1000)
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-3">
      <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gray-300" />
        </div>
        
        {bursts.map(burst => {
          const user = currentSession.participants.find(p => p.id === burst.userId)
          const position = ((burst.start - startTime) / timeWindow) * 100
          const width = Math.max((burst.duration / timeWindow) * 100, 0.5)
          
          return (
            <div
              key={burst.id}
              className="absolute top-1 bottom-1 burst-indicator transition-opacity hover:opacity-80"
              style={{
                left: `${Math.max(0, position)}%`,
                width: `${Math.min(width, 100 - position)}%`,
                backgroundColor: user?.color || '#6366f1',
                opacity: Math.min(burst.intensity * 0.7 + 0.3, 1)
              }}
              title={`${user?.name} - ${burst.type} - ${formatDuration(burst.duration)}`}
            />
          )
        })}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {bursts.slice(0, 15).map(burst => {
          const user = currentSession.participants.find(p => p.id === burst.userId)

          // Find the original typing activity for waveform generation
          const typingActivity = burst.type === 'typing'
            ? currentSession.typingActivities.find(activity =>
                activity.userId === burst.userId &&
                activity.timestamp === burst.start
              )
            : null

          return (
            <div
              key={burst.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: user?.color }}
                />
                <span className="font-medium text-gray-700 truncate">{user?.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${
                  burst.type === 'voice'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {burst.type}
                </span>
              </div>

              {/* Waveform visualization for typing activities */}
              {typingActivity && (
                <div className="flex-shrink-0">
                  <TypingWaveform
                    activity={typingActivity}
                    color={user?.color || '#6366f1'}
                    className="w-24 h-8"
                  />
                </div>
              )}

              <div className="text-right text-gray-500 flex-shrink-0 min-w-16">
                <div className="text-xs">{formatTime(burst.start)}</div>
                <div className="text-xs">{formatDuration(burst.duration)}</div>
                {burst.type === 'typing' && typingActivity && (
                  <div className="text-xs text-green-600 font-medium">
                    {typingActivity.charsAdded > 0 && `+${typingActivity.charsAdded}`}
                    {typingActivity.charsDeleted > 0 && ` -${typingActivity.charsDeleted}`}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}