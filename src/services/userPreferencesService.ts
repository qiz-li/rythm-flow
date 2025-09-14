interface UserPreferences {
  name: string
  color: string
}

class UserPreferencesService {
  private readonly STORAGE_KEY = 'rhythm-flow-user-preferences'

  saveUserPreferences(userId: string, preferences: UserPreferences) {
    try {
      const allPrefs = this.getAllPreferences()
      allPrefs[userId] = {
        ...preferences,
        lastUpdated: Date.now()
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allPrefs))
      console.log('✅ User preferences saved:', userId, preferences)
    } catch (error) {
      console.error('❌ Failed to save user preferences:', error)
    }
  }

  getUserPreferences(userId: string): UserPreferences | null {
    try {
      const allPrefs = this.getAllPreferences()
      const userPrefs = allPrefs[userId]

      if (userPrefs) {
        return {
          name: userPrefs.name,
          color: userPrefs.color
        }
      }
      return null
    } catch (error) {
      console.error('❌ Failed to load user preferences:', error)
      return null
    }
  }

  private getAllPreferences(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('❌ Failed to parse user preferences:', error)
      return {}
    }
  }

  clearUserPreferences(userId?: string) {
    try {
      if (userId) {
        const allPrefs = this.getAllPreferences()
        delete allPrefs[userId]
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allPrefs))
      } else {
        localStorage.removeItem(this.STORAGE_KEY)
      }
      console.log('✅ User preferences cleared:', userId || 'all')
    } catch (error) {
      console.error('❌ Failed to clear user preferences:', error)
    }
  }

  // Get the most recently used preferences (for auto-fill)
  getLastUsedPreferences(): UserPreferences | null {
    try {
      const allPrefs = this.getAllPreferences()
      const entries = Object.entries(allPrefs)

      if (entries.length === 0) return null

      // Find most recent entry
      const mostRecent = entries.reduce((latest, [userId, prefs]) => {
        if (!latest || prefs.lastUpdated > latest[1].lastUpdated) {
          return [userId, prefs]
        }
        return latest
      }, null as [string, any] | null)

      if (mostRecent) {
        return {
          name: mostRecent[1].name,
          color: mostRecent[1].color
        }
      }

      return null
    } catch (error) {
      console.error('❌ Failed to get last used preferences:', error)
      return null
    }
  }
}

export const userPreferencesService = new UserPreferencesService()
export type { UserPreferences }