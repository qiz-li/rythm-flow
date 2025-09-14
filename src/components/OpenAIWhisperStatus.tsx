import { useEffect, useState } from 'react'
import { openaiWhisperService } from '../services/openaiWhisperService'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

export default function OpenAIWhisperStatus() {
  const [status, setStatus] = useState<{
    available: boolean
    testing: boolean
    lastTest?: number
    reason?: string
  }>({
    available: false,
    testing: false
  })

  useEffect(() => {
    const checkStatus = async () => {
      const serviceStatus = openaiWhisperService.getStatus()

      if (serviceStatus.available) {
        setStatus(prev => ({ ...prev, testing: true }))

        try {
          const isConnected = await openaiWhisperService.testConnection()
          setStatus({
            available: isConnected,
            testing: false,
            lastTest: Date.now(),
            reason: isConnected ? undefined : 'Connection test failed'
          })
        } catch (error) {
          setStatus({
            available: false,
            testing: false,
            lastTest: Date.now(),
            reason: 'Connection test failed'
          })
        }
      } else {
        setStatus({
          available: false,
          testing: false,
          lastTest: Date.now(),
          reason: serviceStatus.reason
        })
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    if (status.testing) {
      return <Clock className="w-3 h-3 text-blue-500 animate-spin" />
    }
    if (status.available) {
      return <CheckCircle className="w-3 h-3 text-green-500" />
    }
    if (status.reason?.includes('API key')) {
      return <AlertTriangle className="w-3 h-3 text-yellow-500" />
    }
    return <XCircle className="w-3 h-3 text-red-500" />
  }

  const getStatusText = () => {
    if (status.testing) {
      return 'Testing connection...'
    }
    if (status.available) {
      return 'OpenAI Whisper connected'
    }
    if (status.reason?.includes('API key')) {
      return 'API key not configured'
    }
    return status.reason || 'Connection failed'
  }

  const getStatusColor = () => {
    if (status.testing) return 'text-blue-600'
    if (status.available) return 'text-green-600'
    if (status.reason?.includes('API key')) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
      {getStatusIcon()}
      <span className={`text-xs font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {!status.available && !status.testing && status.reason?.includes('API key') && (
        <span className="text-xs text-gray-500">
          (Using mock transcription)
        </span>
      )}
    </div>
  )
}