import { useState } from 'react'
import { RhythmSession, ContributionMetrics } from '../types'
import { Download, Share2, FileText, BarChart } from 'lucide-react'

interface SessionSummaryProps {
  session: RhythmSession
  onClose: () => void
}

export default function SessionSummary({ session, onClose }: SessionSummaryProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')

  const calculateMetrics = (): ContributionMetrics[] => {
    return session.participants.map(user => {
      const userVoice = session.voiceContributions.filter(c => c.userId === user.id)
      const userTyping = session.typingActivities.filter(a => a.userId === user.id)
      
      const voiceTime = userVoice.reduce((sum, c) => sum + c.duration, 0)
      const typingChars = userTyping.reduce((sum, a) => sum + a.charsAdded + a.charsDeleted, 0)
      
      const burstCount = userVoice.length + 
        userTyping.filter(a => a.burstDuration > 0).length

      const dominanceWindows = userVoice.map(c => ({
        start: c.timestamp,
        end: c.timestamp + c.duration
      }))

      return {
        userId: user.id,
        voiceTime,
        typingChars,
        burstCount,
        dominanceWindows
      }
    })
  }

  const metrics = calculateMetrics()
  const totalDuration = Date.now() - session.createdAt
  const totalVoiceTime = metrics.reduce((sum, m) => sum + m.voiceTime, 0)
  const totalTypingChars = metrics.reduce((sum, m) => sum + m.typingChars, 0)

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const exportData = () => {
    const data = {
      sessionId: session.id,
      sessionName: session.name,
      duration: totalDuration,
      participants: session.participants.map(p => p.name),
      metrics: metrics.map(m => {
        const user = session.participants.find(p => p.id === m.userId)
        return {
          participant: user?.name,
          voiceTime: m.voiceTime,
          typingChars: m.typingChars,
          burstCount: m.burstCount,
          dominanceWindows: m.dominanceWindows.length
        }
      }),
      summary: {
        totalVoiceTime,
        totalTypingChars,
        totalContributions: session.voiceContributions.length + session.typingActivities.length
      }
    }

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rhythm-flow-${session.id}-summary.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const csvContent = [
        ['Participant', 'Voice Time (s)', 'Typing Chars', 'Burst Count', 'Dominance Windows'].join(','),
        ...data.metrics.map(m => [
          m.participant,
          Math.round(m.voiceTime / 1000),
          m.typingChars,
          m.burstCount,
          m.dominanceWindows
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rhythm-flow-${session.id}-summary.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-rhythm-primary" />
                Session Summary
              </h2>
              <p className="text-gray-600">{session.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-rhythm-primary">
                {formatDuration(totalDuration)}
              </div>
              <div className="text-sm text-gray-600">Session Duration</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-rhythm-secondary">
                {session.participants.length}
              </div>
              <div className="text-sm text-gray-600">Participants</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-rhythm-accent">
                {session.voiceContributions.length + session.typingActivities.length}
              </div>
              <div className="text-sm text-gray-600">Total Contributions</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart className="w-5 h-5" />
              Participation Breakdown
            </h3>
            <div className="space-y-4">
              {metrics.map(metric => {
                const user = session.participants.find(p => p.id === metric.userId)
                const voicePercentage = totalVoiceTime > 0 ? (metric.voiceTime / totalVoiceTime) * 100 : 0
                const typingPercentage = totalTypingChars > 0 ? (metric.typingChars / totalTypingChars) * 100 : 0
                
                return (
                  <div key={metric.userId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: user?.color }}
                      />
                      <span className="font-medium text-gray-900">{user?.name}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Voice Contribution</div>
                        <div className="font-medium">{formatDuration(metric.voiceTime)} ({Math.round(voicePercentage)}%)</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Typing Activity</div>
                        <div className="font-medium">{metric.typingChars} chars ({Math.round(typingPercentage)}%)</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Activity Bursts</div>
                        <div className="font-medium">{metric.burstCount}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Dominance Windows</div>
                        <div className="font-medium">{metric.dominanceWindows.length}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Export format:</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-rhythm-primary focus:border-transparent"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-rhythm-primary text-white rounded-lg hover:bg-rhythm-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}