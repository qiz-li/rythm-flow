import { useSessionStore } from '../stores/sessionStore'
import { Play, Volume2 } from 'lucide-react'

export default function VoiceContributions() {
  const { currentSession } = useSessionStore()

  if (!currentSession?.voiceContributions.length) {
    return (
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3 flex-shrink-0">
          <Volume2 className="w-4 h-4" />
          Voice Contributions
        </h3>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Volume2 className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No voice contributions yet</p>
            <p className="text-gray-400 text-xs">Voice recordings will appear here</p>
          </div>
        </div>
      </div>
    )
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3 flex-shrink-0">
        <Volume2 className="w-4 h-4" />
        Voice Contributions
      </h3>

      <div className="flex-1 overflow-y-auto space-y-3">
        {currentSession.voiceContributions
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((contribution) => {
            const participant = currentSession.participants.find(p => p.id === contribution.userId)

            return (
              <div
                key={contribution.id}
                className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: participant?.color || '#6366f1' }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {participant?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(contribution.timestamp)}
                  </div>
                </div>

                <div className={`rounded-md p-2 mb-2 ${
                  contribution.transcription.startsWith('[')
                    ? 'bg-gray-50 border border-gray-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <p className={`text-sm ${
                    contribution.transcription.startsWith('[')
                      ? 'text-gray-600 italic'
                      : 'text-gray-800'
                  }`}>
                    {contribution.transcription}
                  </p>
                  {contribution.volume && contribution.volume > 0.9 && !contribution.transcription.startsWith('[') && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-700">High confidence</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="p-1 text-gray-500 hover:text-rhythm-primary hover:bg-rhythm-primary/10 rounded transition-colors">
                      <Play className="w-3 h-3" />
                    </button>
                    <div className="text-xs text-gray-500">
                      Duration: {formatDuration(contribution.duration)}
                    </div>
                  </div>

                  {contribution.volume && (
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rhythm-accent rounded-full"
                          style={{ width: `${contribution.volume * 100}%` }}
                        />
                      </div>
                      <Volume2 className="w-3 h-3 text-gray-400" />
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