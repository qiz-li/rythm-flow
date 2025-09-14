import { useEffect, useState } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { BalanceService } from '../services/balanceService'
import { UserBalance } from '../types'
import { Users, MessageCircle, Mic, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function SessionBalanceDashboard() {
  const { currentSession, currentUser, switchCurrentUser } = useSessionStore()
  const [userBalances, setUserBalances] = useState<UserBalance[]>([])

  // Check if this is a demo session to enable user switching
  const isDemoSession = currentSession?.id?.startsWith('demo') || false

  useEffect(() => {
    if (!currentSession) {
      setUserBalances([])
      return
    }

    const updateBalances = () => {
      const balances = BalanceService.calculateUserBalances(currentSession)
      setUserBalances(balances)
    }

    updateBalances()
    const interval = setInterval(updateBalances, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [currentSession])

  if (!currentSession || userBalances.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Session Balance
        </h3>
        <div className="text-xs text-gray-500">
          Balance tracking will appear when users start participating
        </div>
      </div>
    )
  }

  const getParticipationIcon = (level: UserBalance['participationLevel']) => {
    switch (level) {
      case 'silent':
        return <Minus className="w-3 h-3 text-gray-400" />
      case 'low':
        return <TrendingDown className="w-3 h-3 text-yellow-500" />
      case 'balanced':
        return <MessageCircle className="w-3 h-3 text-green-500" />
      case 'dominant':
        return <TrendingUp className="w-3 h-3 text-blue-500" />
    }
  }

  const getParticipationColor = (level: UserBalance['participationLevel']) => {
    switch (level) {
      case 'silent':
        return 'text-gray-500'
      case 'low':
        return 'text-yellow-600'
      case 'balanced':
        return 'text-green-600'
      case 'dominant':
        return 'text-blue-600'
    }
  }

  const getParticipationBg = (level: UserBalance['participationLevel']) => {
    switch (level) {
      case 'silent':
        return 'bg-gray-100'
      case 'low':
        return 'bg-yellow-50'
      case 'balanced':
        return 'bg-green-50'
      case 'dominant':
        return 'bg-blue-50'
    }
  }

  const formatPercentage = (value: number) => {
    return Math.round(value * 100)
  }

  const handleUserClick = (userId: string) => {
    if (isDemoSession) {
      switchCurrentUser(userId)
    }
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Participation Balance
        </h3>
        <div className="text-xs text-gray-500">
          Last 60s
        </div>
      </div>

      <div className="space-y-2">
        {userBalances.map(balance => {
          const user = currentSession.participants.find(p => p.id === balance.userId)
          if (!user) return null

          const isCurrentUser = currentUser?.id === user.id
          const isClickable = isDemoSession

          return (
            <div
              key={balance.userId}
              className={`p-2 rounded-md ${getParticipationBg(balance.participationLevel)} border ${
                isCurrentUser ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100'
              } ${
                isClickable ? 'cursor-pointer hover:bg-opacity-80 transition-all duration-200' : ''
              }`}
              onClick={() => handleUserClick(user.id)}
              title={isClickable ? `Switch to ${user.name}` : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: user.color }}
                  />
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {user.name}
                  </span>
                  <div className="flex items-center gap-1">
                    {getParticipationIcon(balance.participationLevel)}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {/* Voice contribution */}
                  <div className="flex items-center gap-1 text-gray-600">
                    <Mic className="w-3 h-3" />
                    <span>{formatPercentage(balance.voiceContribution)}%</span>
                  </div>

                  {/* Typing contribution */}
                  <div className="flex items-center gap-1 text-gray-600">
                    <MessageCircle className="w-3 h-3" />
                    <span>{formatPercentage(balance.typingContribution)}%</span>
                  </div>

                  {/* Overall balance */}
                  <div className={`font-medium ${getParticipationColor(balance.participationLevel)}`}>
                    {formatPercentage(balance.overallBalance)}%
                  </div>
                </div>
              </div>

              {/* Participation level indicator */}
              <div className="mt-1">
                <span className={`text-xs font-medium ${getParticipationColor(balance.participationLevel)}`}>
                  {balance.participationLevel.charAt(0).toUpperCase() + balance.participationLevel.slice(1)}
                </span>
                {balance.lastActivity > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    • {Math.round((Date.now() - balance.lastActivity) / 1000)}s ago
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Overall Balance Score & Summary */}
      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
        {/* Overall participation percentage */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall Balance</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  userBalances.length > 0 && Math.min(...userBalances.map(b => b.overallBalance)) < 0.3
                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                    : userBalances.length > 0 && Math.max(...userBalances.map(b => b.overallBalance)) > 0.6
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                    : 'bg-gradient-to-r from-green-400 to-green-500'
                }`}
                style={{
                  width: `${userBalances.length > 0
                    ? Math.round((1 - (Math.max(...userBalances.map(b => b.overallBalance)) - Math.min(...userBalances.map(b => b.overallBalance)))) * 100)
                    : 100}%`
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {userBalances.length > 0
                ? Math.round((1 - (Math.max(...userBalances.map(b => b.overallBalance)) - Math.min(...userBalances.map(b => b.overallBalance)))) * 100)
                : 100}%
            </span>
          </div>
        </div>

        {/* Summary message */}
        <div className="text-xs text-gray-600">
          {BalanceService.getBalanceSummary(userBalances)}
        </div>
      </div>
    </div>
  )
}