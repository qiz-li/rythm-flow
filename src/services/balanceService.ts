import { RhythmSession, UserBalance, BalanceToast, User } from '../types'

export class BalanceService {
  private static readonly BALANCE_WINDOW = 60000 // Calculate balance over last 60 seconds
  private static readonly TOAST_COOLDOWN = 30000 // Wait 30 seconds between toasts for same user
  private static lastToastTimes = new Map<string, number>()

  static calculateUserBalances(session: RhythmSession): UserBalance[] {
    const now = Date.now()
    const windowStart = now - this.BALANCE_WINDOW

    // Calculate total activity in the time window
    const recentVoiceContributions = session.voiceContributions
      .filter(vc => vc.timestamp >= windowStart)

    const recentTypingActivities = session.typingActivities
      .filter(ta => ta.timestamp >= windowStart)

    const totalVoiceTime = recentVoiceContributions
      .reduce((sum, vc) => sum + vc.duration, 0)

    const totalTypingChars = recentTypingActivities
      .reduce((sum, ta) => sum + ta.charsAdded + ta.charsDeleted, 0)

    // Calculate balance for each user
    const balances: UserBalance[] = session.participants.map(user => {
      // User's voice contribution
      const userVoiceTime = recentVoiceContributions
        .filter(vc => vc.userId === user.id)
        .reduce((sum, vc) => sum + vc.duration, 0)

      // User's typing contribution
      const userTypingChars = recentTypingActivities
        .filter(ta => ta.userId === user.id)
        .reduce((sum, ta) => sum + ta.charsAdded + ta.charsDeleted, 0)

      // Calculate percentages
      const voiceContribution = totalVoiceTime > 0 ? userVoiceTime / totalVoiceTime : 0
      const typingContribution = totalTypingChars > 0 ? userTypingChars / totalTypingChars : 0

      // Combined balance score (weighted average)
      const overallBalance = (voiceContribution * 0.6 + typingContribution * 0.4)

      // Find last activity
      const lastVoiceActivity = recentVoiceContributions
        .filter(vc => vc.userId === user.id)
        .reduce((latest, vc) => Math.max(latest, vc.timestamp), 0)

      const lastTypingActivity = recentTypingActivities
        .filter(ta => ta.userId === user.id)
        .reduce((latest, ta) => Math.max(latest, ta.timestamp), 0)

      const lastActivity = Math.max(lastVoiceActivity, lastTypingActivity)

      // Determine participation level
      let participationLevel: UserBalance['participationLevel']
      if (overallBalance === 0) {
        participationLevel = 'silent'
      } else if (overallBalance < 0.15) {
        participationLevel = 'low'
      } else if (overallBalance > 0.6) {
        participationLevel = 'dominant'
      } else {
        participationLevel = 'balanced'
      }

      return {
        userId: user.id,
        voiceContribution,
        typingContribution,
        overallBalance,
        participationLevel,
        lastActivity
      }
    })

    return balances
  }

  static generateBalanceToasts(
    balances: UserBalance[],
    participants: User[],
    currentUserId?: string
  ): BalanceToast[] {
    const now = Date.now()
    const toasts: BalanceToast[] = []

    balances.forEach(balance => {
      const user = participants.find(p => p.id === balance.userId)
      if (!user) return

      // Check cooldown
      const lastToastTime = this.lastToastTimes.get(balance.userId) || 0
      if (now - lastToastTime < this.TOAST_COOLDOWN) return

      const toast = this.createPersonalizedToast(balance, user, balances, currentUserId)
      if (toast) {
        toasts.push(toast)
        this.lastToastTimes.set(balance.userId, now)
      }
    })

    return toasts
  }

  private static createPersonalizedToast(
    userBalance: UserBalance,
    user: User,
    allBalances: UserBalance[],
    currentUserId?: string
  ): BalanceToast | null {
    const now = Date.now()
    const isCurrentUser = user.id === currentUserId
    const timeSinceActivity = userBalance.lastActivity > 0 ? now - userBalance.lastActivity : Infinity

    // Messages for different scenarios
    const messages = {
      // For silent users (no contribution)
      silent: {
        self: [
          "Jump in! Your voice matters in this conversation 🎤",
          "Don't be shy - share your thoughts! ✨",
          "We'd love to hear from you! Try speaking or typing 💭",
          "Your perspective would be valuable here 🌟"
        ],
        others: [
          `Help ${user.name} join the conversation! 🤝`,
          `${user.name} might have great ideas - let's encourage them! 💡`,
          `Give ${user.name} a chance to contribute! 👋`,
          `${user.name} has been quiet - maybe ask for their thoughts? 🤔`
        ]
      },

      // For low participation users
      low: {
        self: [
          "You're doing great! Feel free to share more thoughts 💪",
          "Your contributions are valued - don't hold back! 🚀",
          "Try adding more to the discussion when you can! ✏️",
          "We'd love to hear more of your ideas! 🎯"
        ],
        others: [
          `${user.name} is being thoughtful - encourage them to share more! 🌱`,
          `${user.name} has good insights - help them elaborate! 🔍`,
          `Ask ${user.name} what they think about this topic! 💬`,
          `${user.name} might want to add something - give them space! 🪐`
        ]
      },

      // For dominant users
      dominant: {
        self: [
          "Great energy! Maybe pause to let others contribute too? 🎭",
          "You're doing amazing - consider giving others a turn! 🔄",
          "Your ideas are flowing! How about asking others their thoughts? 🤝",
          "Love the participation! Let's hear from the team too 👥"
        ],
        others: [
          `${user.name} is really engaged! Join the energy! ⚡`,
          `${user.name} is leading well - add your voice to the mix! 🎵`,
          `${user.name} has great momentum - build on their ideas! 🏗️`,
          `Match ${user.name}'s enthusiasm with your own contributions! 🔥`
        ]
      },

      // For recently inactive users
      inactive: {
        self: [
          "Still with us? We'd love your input! 👋",
          "Take your time, but don't forget to share your thoughts! ⏰",
          "Ready to jump back in? Your voice is missed! 🎤",
          "How about adding something to the conversation? ✨"
        ],
        others: [
          `${user.name} has been quiet lately - check in with them! 🤗`,
          `Maybe ${user.name} wants to add something? Ask them! 💭`,
          `${user.name} might be thinking - give them an opening! 🚪`,
          `Help bring ${user.name} back into the discussion! 🔗`
        ]
      },

      // Praise for balanced users
      balanced: {
        self: [
          "Perfect balance! You're contributing just right 🎯",
          "Great participation level - keep it up! ⭐",
          "You're hitting the sweet spot with your contributions! 🍯",
          "Excellent balance between listening and sharing! 🎵"
        ],
        others: [
          `${user.name} is perfectly balanced - great example! 👏`,
          `${user.name} shows great conversation skills! 🎨`,
          `${user.name} is contributing beautifully! ✨`,
          `${user.name} has found the perfect participation rhythm! 🎼`
        ]
      }
    }

    // Determine message category and type
    let category: keyof typeof messages
    let type: BalanceToast['type']

    if (userBalance.participationLevel === 'silent') {
      category = 'silent'
      type = 'engage'
    } else if (userBalance.participationLevel === 'low') {
      category = 'low'
      type = 'encourage'
    } else if (userBalance.participationLevel === 'dominant') {
      category = 'dominant'
      type = 'moderate'
    } else if (timeSinceActivity > 120000) { // 2 minutes inactive
      category = 'inactive'
      type = 'engage'
    } else if (userBalance.participationLevel === 'balanced') {
      // Only occasionally praise balanced users
      if (Math.random() < 0.1) {
        category = 'balanced'
        type = 'praise'
      } else {
        return null // Skip most balanced user toasts
      }
    } else {
      return null
    }

    const messagePool = isCurrentUser ? messages[category].self : messages[category].others
    const message = messagePool[Math.floor(Math.random() * messagePool.length)]

    return {
      id: `toast_${user.id}_${now}`,
      userId: user.id,
      message,
      type,
      timestamp: now,
      duration: type === 'praise' ? 4000 : 6000 // Praise shorter, guidance longer
    }
  }

  static getBalanceSummary(balances: UserBalance[]): string {
    const silent = balances.filter(b => b.participationLevel === 'silent').length
    const low = balances.filter(b => b.participationLevel === 'low').length
    const balanced = balances.filter(b => b.participationLevel === 'balanced').length
    const dominant = balances.filter(b => b.participationLevel === 'dominant').length

    if (balanced === balances.length) {
      return "Perfect balance! Everyone's participating well 🎯"
    } else if (silent > balances.length / 2) {
      return "Conversation could use more voices 🤐"
    } else if (dominant > 1) {
      return "Multiple people leading - great energy! ⚡"
    } else if (low > balanced) {
      return "Encourage more participation 📈"
    } else {
      return "Good conversation flow 💫"
    }
  }
}