import { useEffect, useState } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { useSessionRecovery } from '../hooks/useSessionRecovery'
import { Wifi, WifiOff, Loader, AlertCircle, RefreshCw } from 'lucide-react'

export default function ConnectionStatus() {
  const { connectionStatus, initializeSocket } = useSessionStore()
  const { hasRecoveryData, attemptRecovery } = useSessionRecovery()
  const [retryCount, setRetryCount] = useState(0)
  const [isManuallyReconnecting, setIsManuallyReconnecting] = useState(false)

  const handleManualReconnect = async () => {
    setIsManuallyReconnecting(true)
    setRetryCount(prev => prev + 1)

    try {
      await initializeSocket()
      if (hasRecoveryData) {
        await attemptRecovery()
      }
    } catch (error) {
      console.error('Manual reconnection failed:', error)
    } finally {
      setIsManuallyReconnecting(false)
    }
  }

  // Reset retry count on successful connection
  useEffect(() => {
    if (connectionStatus === 'connected') {
      setRetryCount(0)
    }
  }, [connectionStatus])

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4 text-green-500" />,
          text: 'Connected',
          className: 'text-green-700 bg-green-50 border-green-200',
          showRetry: false
        }
      case 'connecting':
        return {
          icon: <Loader className="w-4 h-4 text-yellow-500 animate-spin" />,
          text: isManuallyReconnecting ? 'Reconnecting...' : 'Connecting...',
          className: 'text-yellow-700 bg-yellow-50 border-yellow-200',
          showRetry: false
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: `Connection failed${retryCount > 0 ? ` (${retryCount} attempts)` : ''}`,
          className: 'text-red-700 bg-red-50 border-red-200',
          showRetry: true
        }
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-4 h-4 text-gray-500" />,
          text: 'Disconnected',
          className: 'text-gray-700 bg-gray-50 border-gray-200',
          showRetry: true
        }
    }
  }

  const config = getStatusConfig()

  // Don't show if connected and working normally
  if (connectionStatus === 'connected' && retryCount === 0) {
    return null
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg border flex items-center gap-2 shadow-lg ${config.className}`}>
      {config.icon}
      <span className="text-sm font-medium">{config.text}</span>

      {config.showRetry && (
        <button
          onClick={handleManualReconnect}
          disabled={isManuallyReconnecting}
          className="ml-2 p-1 hover:bg-white/20 rounded transition-colors disabled:opacity-50"
          title="Retry connection"
        >
          <RefreshCw className={`w-3 h-3 ${isManuallyReconnecting ? 'animate-spin' : ''}`} />
        </button>
      )}

      {hasRecoveryData && connectionStatus === 'error' && (
        <div className="ml-2 text-xs opacity-75">
          Session recovery available
        </div>
      )}
    </div>
  )
}