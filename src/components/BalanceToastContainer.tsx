import { useEffect, useState } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { BalanceService } from '../services/balanceService'
import { BalanceToast as BalanceToastType, UserBalance } from '../types'
import BalanceToast from './BalanceToast'

export default function BalanceToastContainer() {
  const { currentSession, currentUser } = useSessionStore()
  const [toasts, setToasts] = useState<BalanceToastType[]>([])
  const [userBalances, setUserBalances] = useState<UserBalance[]>([])

  // Calculate balances and generate toasts
  useEffect(() => {
    if (!currentSession) {
      setToasts([])
      setUserBalances([])
      return
    }

    const calculateAndNotify = () => {
      // Calculate current user balances
      const balances = BalanceService.calculateUserBalances(currentSession)
      setUserBalances(balances)

      // Generate new toasts based on balance
      const newToasts = BalanceService.generateBalanceToasts(
        balances,
        currentSession.participants,
        currentUser?.id
      )

      if (newToasts.length > 0) {
        setToasts(currentToasts => {
          // Remove any duplicate toasts for the same user
          const filteredToasts = currentToasts.filter(existing =>
            !newToasts.some(newToast => newToast.userId === existing.userId)
          )
          return [...filteredToasts, ...newToasts]
        })
      }
    }

    // Initial calculation
    calculateAndNotify()

    // Set up interval to check balance every 15 seconds
    const interval = setInterval(calculateAndNotify, 15000)

    return () => clearInterval(interval)
  }, [
    currentSession?.voiceContributions,
    currentSession?.typingActivities,
    currentSession?.participants,
    currentUser?.id
  ])

  const dismissToast = (toastId: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== toastId))
  }

  // Clean up expired toasts
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      setToasts(currentToasts =>
        currentToasts.filter(toast =>
          now - toast.timestamp < toast.duration + 1000 // Extra second for animation
        )
      )
    }, 5000)

    return () => clearInterval(cleanupInterval)
  }, [])

  if (!currentSession || toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Balance summary (optional, can be toggled) */}
      {userBalances.length > 0 && (
        <div className="text-xs text-gray-600 bg-white/90 px-3 py-2 rounded-md shadow-sm border mb-2">
          <div className="font-medium">Session Balance</div>
          <div>{BalanceService.getBalanceSummary(userBalances)}</div>
        </div>
      )}

      {/* Toast notifications */}
      {toasts.map(toast => (
        <BalanceToast
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  )
}