import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Hash, Palette, Volume2, Keyboard, Globe, Shield, Download, Trash2, Copy } from 'lucide-react'
import { useSessionStore } from '../stores/sessionStore'
import { transcriptionService } from '../services/transcriptionService'
import TranscriptionModelSelector from './TranscriptionModelSelector'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: {
    id: string
    name: string
    color: string
  }
  onUserUpdate: (updates: { name?: string; color?: string }) => void
  onSessionUpdate: (updates: { name?: string }) => void
}

const USER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
]

export default function SettingsModal({ isOpen, onClose, currentUser, onUserUpdate, onSessionUpdate }: SettingsModalProps) {
  const { currentSession } = useSessionStore()
  const [activeTab, setActiveTab] = useState<'user' | 'session' | 'transcription' | 'privacy'>('user')
  const [userSettings, setUserSettings] = useState({
    name: currentUser.name,
    color: currentUser.color
  })
  const [sessionSettings, setSessionSettings] = useState({
    name: currentSession?.name || ''
  })

  useEffect(() => {
    setUserSettings({
      name: currentUser.name,
      color: currentUser.color
    })
  }, [currentUser])

  useEffect(() => {
    setSessionSettings({
      name: currentSession?.name || ''
    })
  }, [currentSession])

  const handleUserSave = () => {
    if (userSettings.name !== currentUser.name || userSettings.color !== currentUser.color) {
      onUserUpdate(userSettings)
    }
  }

  const handleSessionSave = () => {
    if (sessionSettings.name !== currentSession?.name) {
      onSessionUpdate(sessionSettings)
    }
  }

  const generateRandomColor = () => {
    const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
    setUserSettings(prev => ({ ...prev, color: randomColor }))
  }

  const exportSessionData = () => {
    if (!currentSession) return

    const sessionData = {
      session: {
        id: currentSession.id,
        name: currentSession.name,
        createdAt: currentSession.createdAt,
        participants: currentSession.participants
      },
      voiceContributions: currentSession.voiceContributions,
      typingActivities: currentSession.typingActivities,
      exportedAt: Date.now()
    }

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rhythm-flow-session-${currentSession.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copySessionLink = async () => {
    if (!currentSession) return

    const sessionUrl = `${window.location.origin}${window.location.pathname}?session=${currentSession.id}`

    try {
      await navigator.clipboard.writeText(sessionUrl)
      // You could add a toast notification here
      console.log('Session link copied to clipboard')
    } catch (err) {
      console.error('Failed to copy session link:', err)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'user', label: 'User', icon: User },
            { id: 'session', label: 'Session', icon: Hash },
            { id: 'transcription', label: 'Speech-to-Text', icon: Volume2 },
            { id: 'privacy', label: 'Privacy & Data', icon: Shield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* User Settings Tab */}
          {activeTab === 'user' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={userSettings.name}
                  onChange={(e) => setUserSettings(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Color
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: userSettings.color }}
                  />
                  <input
                    type="color"
                    value={userSettings.color}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <button
                    onClick={generateRandomColor}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Random
                  </button>
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {USER_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setUserSettings(prev => ({ ...prev, color }))}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                        userSettings.color === color ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleUserSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Session Settings Tab */}
          {activeTab === 'session' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  value={sessionSettings.name}
                  onChange={(e) => setSessionSettings(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter session name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Info
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Session ID:</span>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">{currentSession?.id}</code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">
                      {currentSession ? new Date(currentSession.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Participants:</span>
                    <span className="text-gray-900">{currentSession?.participants.length || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actions
                </label>
                <div className="space-y-2">
                  <button
                    onClick={copySessionLink}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors w-full"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Session Link
                  </button>
                  <button
                    onClick={exportSessionData}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors w-full"
                  >
                    <Download className="w-4 h-4" />
                    Export Session Data
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSessionSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Transcription Settings Tab */}
          {activeTab === 'transcription' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speech-to-Text Model
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Choose between open source and commercial transcription services
                </p>
                <TranscriptionModelSelector />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Globe className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Local Whisper.cpp Model</h4>
                    <p className="text-sm text-green-700 mt-1">
                      The Whisper.cpp model runs entirely in your browser using WebAssembly.
                      It's completely free, private (no data sent to servers), and works offline.
                      The first use will download the model (~40MB), which may take a moment.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Status
                </label>
                <div className="bg-gray-50 rounded-lg p-4">
                  {(() => {
                    const status = transcriptionService.getModelStatus()
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Model:</span>
                          <span className="font-medium text-gray-900">{status.selectedModelInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Provider:</span>
                          <span className="text-gray-900">{status.selectedModelInfo.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`font-medium ${
                            status.selectedModelInfo.isAvailable ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {status.selectedModelInfo.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            status.selectedModelInfo.isOpenSource
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {status.selectedModelInfo.isOpenSource ? 'Open Source' : 'Commercial'}
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Data Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Data Storage</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your session data is stored locally in your browser and synchronized in real-time with other participants.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Privacy Notice</h4>
                      <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                        <li>• Session data is temporary and not permanently stored on servers</li>
                        <li>• Voice recordings are processed for transcription only</li>
                        <li>• OpenAI Whisper sends audio to OpenAI servers when used</li>
                        <li>• Web Speech API uses browser-native processing</li>
                        <li>• No personal data is collected beyond session participation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Local Data</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Clear local settings and preferences stored in your browser.
                </p>

                <button
                  onClick={() => {
                    localStorage.clear()
                    sessionStorage.clear()
                    window.location.reload()
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Local Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}