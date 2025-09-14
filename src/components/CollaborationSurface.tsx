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
  const [content, setContent] = useState('')
  const [lastKeystroke, setLastKeystroke] = useState<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addTypingActivity } = useSessionStore()

  const handleContentChange = (newContent: string) => {
    const now = Date.now()
    const charsDiff = newContent.length - content.length

    console.log('✏️ [CollaborationSurface] Content changed', {
      oldLength: content.length,
      newLength: newContent.length,
      charsDiff,
      userId: currentUser.id
    })

    if (charsDiff !== 0) {
      const activity = {
        userId: currentUser.id,
        timestamp: now,
        charsAdded: Math.max(0, charsDiff),
        charsDeleted: Math.max(0, -charsDiff),
        burstDuration: now - lastKeystroke < 2000 ? now - lastKeystroke : 0
      }

      console.log('⌨️ [CollaborationSurface] Calling addTypingActivity', activity)
      addTypingActivity(activity)

      setLastKeystroke(now)
    }

    setContent(newContent)
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
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <VoiceControls currentUser={currentUser} />
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
                User: <span style={{ color: currentUser.color }}>{currentUser.name}</span>
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