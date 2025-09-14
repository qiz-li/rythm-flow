import { useState, useRef, useEffect } from 'react'
import { User } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import { socketService } from '../services/socketService'
import VoiceControls from './VoiceControls'
import VoiceContributions from './VoiceContributions'
import LiveTypingWaveform from './LiveTypingWaveform'
import { Edit3 } from 'lucide-react'

interface CollaborationSurfaceProps {
  currentUser: User
}

export default function CollaborationSurface({ currentUser }: CollaborationSurfaceProps) {
  const [lastKeystroke, setLastKeystroke] = useState<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addTypingActivity, currentSession, updateContent, getContent } = useSessionStore()

  // Get content from session store
  const content = getContent()

  const handleContentChange = (newContent: string) => {
    const now = Date.now()
    const charsDiff = newContent.length - content.length

    console.log('✏️ [CollaborationSurface] Content changed', {
      oldLength: content.length,
      newLength: newContent.length,
      charsDiff,
      userId: currentUser.id
    })

    // Update content in session store (this will broadcast to other users)
    updateContent(newContent)

    if (charsDiff !== 0) {
      const activity = {
        userId: currentUser.id,
        timestamp: now,
        charsAdded: Math.max(0, charsDiff),
        charsDeleted: Math.max(0, -charsDiff),
        burstDuration: now - lastKeystroke < 2000 ? now - lastKeystroke : 1000 // Minimum 1 second for display
      }

      console.log('⌨️ [CollaborationSurface] Calling addTypingActivity', activity)
      console.log('🔍 [CollaborationSurface] Current session exists:', !!currentSession)
      console.log('🔍 [CollaborationSurface] Current session ID:', currentSession?.id)
      addTypingActivity(activity)

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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <VoiceControls currentUser={currentUser} />
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6">
            {/* Live Typing Visualization */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Live Typing Activity
              </label>
              <LiveTypingWaveform />
            </div>

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
            
            <div className="text-xs text-gray-500 flex justify-between items-center">
              <span>{content.length} characters</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const testActivity = {
                      userId: currentUser.id,
                      timestamp: Date.now(),
                      charsAdded: 1,
                      charsDeleted: 0,
                      burstDuration: 1000
                    }
                    console.log('🧪 [CollaborationSurface] Manual test typing activity:', testActivity)
                    addTypingActivity(testActivity)
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Test Typing
                </button>
                <button
                  onClick={() => {
                    console.log('🧪 [CollaborationSurface] Testing socket connection...')
                    socketService.testConnection()
                  }}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Test Socket
                </button>
                <span>
                  User: <span style={{ color: currentUser.color }}>{currentUser.name}</span>
                </span>
              </div>
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