import { useEffect, useRef, useState } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { TypingActivity } from '../types'

interface UserWaveData {
  userId: string
  color: string
  name: string
  totalChars: number
  recentActivity: number // timestamp of most recent activity
  intensity: number // combined intensity from recent activities
  burstDuration: number // average burst duration
}

export default function LiveTypingWaveform() {
  const { currentSession } = useSessionStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [userWaves, setUserWaves] = useState<UserWaveData[]>([])

  // Aggregate typing activities by user for cleaner visualization
  useEffect(() => {
    if (!currentSession) {
      setUserWaves([])
      return
    }

    const now = Date.now()
    const recentWindow = 8000 // Show user waves for 8 seconds after last activity

    // Group activities by user and aggregate their data
    const userActivityMap = new Map<string, TypingActivity[]>()

    currentSession.typingActivities
      .filter(activity => now - activity.timestamp < recentWindow)
      .forEach(activity => {
        if (!userActivityMap.has(activity.userId)) {
          userActivityMap.set(activity.userId, [])
        }
        userActivityMap.get(activity.userId)!.push(activity)
      })

    const aggregatedWaves: UserWaveData[] = []

    userActivityMap.forEach((activities, userId) => {
      const user = currentSession.participants.find(p => p.id === userId)
      if (!user) return

      // Calculate aggregated metrics
      const totalChars = activities.reduce((sum, a) => sum + a.charsAdded + a.charsDeleted, 0)
      const recentActivity = Math.max(...activities.map(a => a.timestamp))
      const avgBurstDuration = activities.reduce((sum, a) => sum + a.burstDuration, 0) / activities.length

      // Calculate intensity based on recent activity
      const activityAge = now - recentActivity
      const freshnessMultiplier = Math.max(0, 1 - (activityAge / recentWindow))
      const intensity = Math.min(totalChars * freshnessMultiplier / 10, 1)

      aggregatedWaves.push({
        userId,
        color: user.color,
        name: user.name,
        totalChars,
        recentActivity,
        intensity,
        burstDuration: avgBurstDuration
      })
    })

    // Sort by recent activity (most recent first)
    aggregatedWaves.sort((a, b) => b.recentActivity - a.recentActivity)

    setUserWaves(aggregatedWaves.slice(0, 3)) // Show up to 3 users
  }, [currentSession?.typingActivities])

  // Animate the user waveforms with improved smoothness and rhythm
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || userWaves.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = (timestamp: number) => {
      const now = Date.now()

      // Clear canvas with a subtle gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, 'rgba(249, 250, 251, 0.95)')
      gradient.addColorStop(1, 'rgba(243, 244, 246, 0.95)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      userWaves.forEach((userWave, waveIndex) => {
        const timeSinceLastActivity = now - userWave.recentActivity
        const fadeProgress = timeSinceLastActivity / 8000 // 8 second fade
        const alpha = Math.max(0, 1 - fadeProgress)

        if (alpha <= 0) return

        // More satisfying wave properties with smoother motion
        const baseAmplitude = Math.min(userWave.totalChars * 1.5 + 20, canvas.height * 0.25)
        const frequency = Math.max(userWave.totalChars / 8, 0.5) // Slower, more rhythmic frequency

        // Position waves vertically - evenly spaced
        const waveY = (canvas.height / (userWaves.length + 1)) * (waveIndex + 1)
        const numPoints = 256 // More points for ultra-smooth curves

        // Enhanced drawing style with smoother lines
        ctx.globalAlpha = alpha * (0.8 + userWave.intensity * 0.2)
        ctx.strokeStyle = userWave.color
        ctx.lineWidth = 2.5 + userWave.intensity * 0.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Draw main waveform with improved mathematical model
        ctx.beginPath()
        for (let i = 0; i < numPoints; i++) {
          const x = (i / (numPoints - 1)) * canvas.width
          const progress = i / numPoints

          // Slower, more rhythmic time progression
          const t = progress + (timestamp / 3000) * (0.5 + userWave.intensity * 0.5)

          // Create more satisfying, rhythmic wave patterns
          const primaryWave = Math.sin(t * Math.PI * 2 * frequency * 0.4)
          const rhythmWave = Math.sin(t * Math.PI * 1.2 * frequency * 0.7) * 0.6
          const harmonicWave = Math.sin(t * Math.PI * 3.6 * frequency * 0.3) * 0.3
          const personalityWave = Math.sin(t * Math.PI * 2.8 + waveIndex * 1.2) * 0.2

          // Add breathing effect for more organic feel
          const breathingWave = Math.sin(timestamp / 4000 + waveIndex) * 0.15

          const combinedWave = primaryWave + rhythmWave + harmonicWave + personalityWave + breathingWave

          // Apply smooth envelope for natural amplitude variation
          const envelope = 0.7 + 0.3 * Math.sin(progress * Math.PI)
          const amplitude = baseAmplitude * combinedWave * userWave.intensity * envelope

          const y = waveY + amplitude

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()

        // Enhanced glow effect for more satisfying visuals
        ctx.globalAlpha = alpha * 0.4
        ctx.shadowColor = userWave.color
        ctx.shadowBlur = 8
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.shadowBlur = 0

        // Additional subtle inner glow
        ctx.globalAlpha = alpha * 0.2
        ctx.shadowColor = userWave.color
        ctx.shadowBlur = 15
        ctx.lineWidth = 0.5
        ctx.stroke()
        ctx.shadowBlur = 0
      })

      ctx.globalAlpha = 1

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [userWaves])

  if (!currentSession || userWaves.length === 0) {
    return (
      <div className="w-full h-24 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">Live Typing Visualization</div>
          <div className="text-xs text-gray-400">Waveforms appear when users are typing</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        className="w-full h-24 rounded-lg border border-gray-200 shadow-sm"
        style={{ maxWidth: '100%' }}
      />

      {/* Typing counter */}
      <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs text-gray-600">
        {userWaves.length} user{userWaves.length !== 1 ? 's' : ''} typing
      </div>

      {/* User badges below the waveform */}
      <div className="mt-2 flex gap-2 flex-wrap">
        {userWaves.map((user) => (
          <div key={user.userId} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full text-xs border border-gray-200">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: user.color }}
            />
            <span className="text-gray-700 font-medium">{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}