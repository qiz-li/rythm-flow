import { useEffect, useState } from 'react'
import { useSessionStore } from '../stores/sessionStore'

interface BurstEvent {
  id: string
  userId: string
  type: 'typing' | 'voice'
  start: number
  duration: number
  intensity: number
}

export default function BurstTimeline() {
  const { currentSession, demoUsers, isDemoMode } = useSessionStore()
  const [bursts, setBursts] = useState<BurstEvent[]>([])
  
  // Use demo users if in demo mode, otherwise use session participants
  const displayUsers = isDemoMode ? demoUsers : (currentSession?.participants || [])

  useEffect(() => {
    if (!currentSession) return

    const calculateBursts = () => {
      const now = Date.now()
      const timeWindow = 300000
      const newBursts: BurstEvent[] = []

      currentSession.typingActivities
        .filter(activity => (now - activity.timestamp) < timeWindow && activity.burstDuration > 0)
        .forEach(activity => {
          newBursts.push({
            id: `typing_${activity.timestamp}`,
            userId: activity.userId,
            type: 'typing',
            start: activity.timestamp,
            duration: activity.burstDuration,
            intensity: (activity.charsAdded + activity.charsDeleted) / Math.max(activity.burstDuration, 1000)
          })
        })

      currentSession.voiceContributions
        .filter(contribution => (now - contribution.timestamp) < timeWindow)
        .forEach(contribution => {
          newBursts.push({
            id: `voice_${contribution.id}`,
            userId: contribution.userId,
            type: 'voice',
            start: contribution.timestamp,
            duration: contribution.duration,
            intensity: contribution.duration / 10000
          })
        })

      setBursts(newBursts.sort((a, b) => b.start - a.start))
    }

    calculateBursts()
    const interval = setInterval(calculateBursts, 2000)

    return () => clearInterval(interval)
  }, [currentSession, displayUsers])

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
          const user = displayUsers.find(p => p.id === burst.userId)
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

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {bursts.slice(0, 10).map(burst => {
          const user = displayUsers.find(p => p.id === burst.userId)
          
          return (
            <div
              key={burst.id}
              className="flex items-center gap-3 p-2 bg-white rounded-md border border-gray-200 text-sm"
            >
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user?.color }}
                />
                <span className="font-medium text-gray-700">{user?.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  burst.type === 'voice' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {burst.type}
                </span>
              </div>
              
              <div className="text-right text-gray-500">
                <div className="text-xs">{formatTime(burst.start)}</div>
                <div className="text-xs">{formatDuration(burst.duration)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}