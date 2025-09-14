import { useEffect, useRef, useState } from 'react'
import { TypingActivity } from '../types'

interface TypingWaveformProps {
  activity: TypingActivity
  color: string
  className?: string
}

interface WavePoint {
  x: number
  y: number
  amplitude: number
}

export default function TypingWaveform({ activity, color, className = '' }: TypingWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const [wavePoints, setWavePoints] = useState<WavePoint[]>([])

  // Generate waveform data based on typing activity
  useEffect(() => {
    const generateWaveform = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const width = canvas.width
      const height = canvas.height
      const centerY = height / 2

      // Generate wave pattern based on typing characteristics
      const frequency = Math.max(activity.charsAdded + activity.charsDeleted, 1)
      const burstIntensity = Math.min(activity.burstDuration / 1000, 3) // Normalize to 0-3
      const baseAmplitude = Math.min(frequency * 8, height * 0.4)

      const points: WavePoint[] = []
      const numPoints = Math.max(32, frequency * 4) // More points for more complex typing

      for (let i = 0; i < numPoints; i++) {
        const x = (i / (numPoints - 1)) * width

        // Create multiple wave layers for richer visualization
        const primaryWave = Math.sin((i / numPoints) * Math.PI * 2 * frequency * 0.5)
        const harmonicWave = Math.sin((i / numPoints) * Math.PI * 4 * frequency * 0.3) * 0.3
        const burstWave = Math.sin((i / numPoints) * Math.PI * 8) * burstIntensity * 0.2

        const combinedWave = primaryWave + harmonicWave + burstWave
        const amplitude = baseAmplitude * combinedWave

        points.push({
          x,
          y: centerY + amplitude,
          amplitude: Math.abs(amplitude)
        })
      }

      setWavePoints(points)
    }

    generateWaveform()
  }, [activity])

  // Animate the waveform
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || wavePoints.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationStart = 0
    const animationDuration = Math.max(activity.burstDuration, 2000) // At least 2 seconds

    const animate = (timestamp: number) => {
      if (!animationStart) animationStart = timestamp
      const elapsed = timestamp - animationStart
      const progress = Math.min(elapsed / animationDuration, 1)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set up drawing style
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Draw animated waveform
      ctx.beginPath()

      wavePoints.forEach((point, index) => {
        // Create a reveal effect from left to right
        const revealProgress = Math.min((progress * wavePoints.length - index) / 10, 1)
        if (revealProgress <= 0) return

        // Add some dynamic movement to the wave
        const timeOffset = (elapsed / 1000) * 2 * Math.PI
        const dynamicY = point.y + Math.sin(timeOffset + index * 0.1) * point.amplitude * 0.1

        // Apply reveal progress
        const alpha = Math.max(0, revealProgress)
        const adjustedY = canvas.height / 2 + (dynamicY - canvas.height / 2) * alpha

        if (index === 0) {
          ctx.moveTo(point.x, adjustedY)
        } else {
          ctx.lineTo(point.x, adjustedY)
        }
      })

      ctx.stroke()

      // Draw glow effect for emphasis
      if (progress < 1) {
        ctx.shadowColor = color
        ctx.shadowBlur = 8
        ctx.globalAlpha = 0.6
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
      }

      // Continue animation if not complete
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [wavePoints, color, activity.burstDuration])

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="w-full h-full rounded bg-gradient-to-r from-gray-50/50 to-white/50"
        style={{ maxWidth: '200px', height: '60px' }}
      />

      {/* Activity metadata overlay */}
      <div className="absolute top-1 right-1 text-xs text-gray-600 bg-white/90 px-1.5 py-0.5 rounded-md shadow-sm border">
        {activity.charsAdded > 0 && <span className="text-green-600 font-medium">+{activity.charsAdded}</span>}
        {activity.charsDeleted > 0 && <span className="text-red-600 font-medium"> -{activity.charsDeleted}</span>}
      </div>

      {/* Duration indicator */}
      <div className="absolute bottom-1 left-1 text-xs text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
        {Math.round(activity.burstDuration)}ms
      </div>
    </div>
  )
}