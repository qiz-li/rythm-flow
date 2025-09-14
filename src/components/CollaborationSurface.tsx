import { useState, useRef, useEffect } from 'react'
import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import VoiceControls from './VoiceControls'
import VoiceContributions from './VoiceContributions'
import { Edit3 } from 'lucide-react'

interface CollaborationSurfaceProps {
  currentUser: User
}

export default function CollaborationSurface({ currentUser }: CollaborationSurfaceProps) {
  const [lastKeystroke, setLastKeystroke] = useState<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { 
    currentSession, 
    addTypingActivity, 
    updateSharedContent, 
    currentActiveUser, 
    isDemoMode 
  } = useSessionStore()

  // Use current active user in demo mode, otherwise use the prop
  const activeUser = isDemoMode && currentActiveUser ? currentActiveUser : currentUser

  // Use shared content from session
  const content = currentSession?.sharedContent || ''

  const handleContentChange = (newContent: string) => {
    const now = Date.now()
    const charsDiff = newContent.length - content.length

    console.log('✏️ [CollaborationSurface] Content changed', {
      oldLength: content.length,
      newLength: newContent.length,
      charsDiff,
      userId: activeUser.id,
      isDemoMode
    })

    // Update shared content immediately
    updateSharedContent(newContent, true)

    if (charsDiff !== 0) {
      const activity = {
        userId: activeUser.id,
        timestamp: now,
        charsAdded: Math.max(0, charsDiff),
        charsDeleted: Math.max(0, -charsDiff),
        burstDuration: now - lastKeystroke < 2000 ? now - lastKeystroke : 0
      }

      addTypingActivity(activity, true)
      setLastKeystroke(now)
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Edit3 className="w-4 h-4 text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Shared Workspace</h2>
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live collaboration</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <VoiceControls currentUser={activeUser} />
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6">
            <div className="mb-4">
              <label htmlFor="collaboration-text" className="block text-sm font-medium text-gray-700 mb-2">
                Collaborative Document
              </label>
              <textarea
                ref={textareaRef}
                id="collaboration-text"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start typing or speaking to contribute to this shared workspace..."
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rhythm-primary focus:border-transparent resize-none min-h-[300px] font-mono"
                style={{ 
                  fontSize: '14px',
                  lineHeight: '1.5',
                  overflow: 'hidden'
                }}
              />
            </div>
            
            <div className="text-xs text-gray-500 flex justify-between">
              <span>{content.length} characters</span>
              <span>
                Active User: <span style={{ color: activeUser.color }}>{activeUser.name}</span>
                {isDemoMode && (
                  <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                    Demo
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
            <VoiceContributions />
          </div>
        </div>
      </div>
    </div>
  )
}