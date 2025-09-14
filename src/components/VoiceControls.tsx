import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, AlertTriangle, Volume2 } from 'lucide-react'
import { User, VoiceContribution } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import { webSpeechService, LiveTranscriptionResult } from '../services/webSpeechService'
import { transcriptionService } from '../services/transcriptionService'
import TranscriptionModelSelector from './TranscriptionModelSelector'

interface VoiceControlsProps {
  currentUser: User
}

export default function VoiceControls({ currentUser }: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [browserCompatibility, setBrowserCompatibility] = useState<any>(null)
  const [listeningTime, setListeningTime] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const currentContributionRef = useRef<string>('')

  const { addVoiceContribution } = useSessionStore()

  useEffect(() => {
    initializeService()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (isListening) {
        webSpeechService.stopListening()
      }
    }
  }, [])

  const initializeService = async () => {
    // Check browser compatibility
    const compatibility = webSpeechService.getBrowserCompatibility()
    setBrowserCompatibility(compatibility)

    if (!compatibility.supported) {
      setError(compatibility.recommendation || 'Web Speech API not supported')
      setHasPermission(false)
      return
    }

    // Test microphone permission and Web Speech API
    try {
      const hasWebSpeechPermission = await webSpeechService.testConnection()
      setHasPermission(hasWebSpeechPermission)
      if (!hasWebSpeechPermission) {
        setError('Microphone access denied - please allow microphone permissions')
      }
    } catch (error) {
      console.error('Service initialization failed:', error)
      setHasPermission(false)
      setError('Failed to initialize speech recognition')
    }
  }

  const startListening = () => {
    if (!webSpeechService.isSupported()) {
      setError('Web Speech API not supported in this browser')
      return
    }

    setError(null)
    setCurrentTranscript('')
    currentContributionRef.current = ''
    startTimeRef.current = Date.now()

    const success = webSpeechService.startListening({
      onResult: (result: LiveTranscriptionResult) => {
        handleTranscriptionResult(result)
      },
      onStart: () => {
        console.log('🎤 Live transcription started')
        setIsListening(true)
        setListeningTime(0)

        // Start timer for listening duration
        timerRef.current = setInterval(() => {
          setListeningTime(Date.now() - startTimeRef.current)
        }, 100)
      },
      onEnd: () => {
        console.log('🎤 Live transcription ended')
        setIsListening(false)

        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        // Create final contribution if we have transcript
        if (currentContributionRef.current.trim()) {
          createVoiceContribution(currentContributionRef.current.trim(), true)
        }

        setCurrentTranscript('')
      },
      onError: (errorMessage: string) => {
        console.error('🎤 Live transcription error:', errorMessage)
        setError(errorMessage)
        setIsListening(false)

        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    })

    if (!success) {
      setError('Failed to start live transcription')
    }
  }

  const stopListening = () => {
    webSpeechService.stopListening()
  }

  const handleTranscriptionResult = (result: LiveTranscriptionResult) => {
    if (result.isFinal) {
      // Final result - add to contributions and clear interim
      const finalText = result.transcript.trim()
      if (finalText) {
        console.log('🎤 Final transcript:', finalText)
        createVoiceContribution(finalText, true)
        currentContributionRef.current = ''
      }
      setCurrentTranscript('')
    } else {
      // Interim result - show live preview
      setCurrentTranscript(result.transcript)
      currentContributionRef.current = result.transcript
    }
  }

  const createVoiceContribution = (text: string, isFinal: boolean) => {
    if (!text.trim()) return

    const contribution: VoiceContribution = {
      id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: currentUser.id,
      timestamp: Date.now(),
      duration: Date.now() - startTimeRef.current,
      transcription: text.trim(),
      volume: 0.7 // Default volume for live transcription
    }

    console.log('🎤 Adding voice contribution:', contribution)
    addVoiceContribution(contribution)
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  if (hasPermission === null) {
    return (
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="animate-spin w-5 h-5 border-2 border-rhythm-primary border-t-transparent rounded-full" />
        <span className="text-gray-600">Initializing speech recognition...</span>
      </div>
    )
  }

  if (hasPermission === false) {
    return (
      <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <div className="flex-1">
          <p className="text-red-700 font-medium">
            {browserCompatibility?.browserName === 'Firefox'
              ? 'Browser Not Supported'
              : 'Microphone Access Required'
            }
          </p>
          <p className="text-red-600 text-sm">
            {error || 'Please enable microphone access to use voice features'}
          </p>
          {browserCompatibility?.recommendation && (
            <p className="text-red-500 text-xs mt-1">
              {browserCompatibility.recommendation}
            </p>
          )}
        </div>
        {browserCompatibility?.supported && (
          <button
            onClick={initializeService}
            className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-full transition-all duration-200 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse'
                : 'bg-rhythm-primary hover:bg-rhythm-primary/90 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {isListening && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-gray-700">
                {formatTime(listeningTime)}
              </span>
              <Volume2 className="w-4 h-4 text-green-600" />
            </div>
          )}
        </div>

        <div className="flex-1">
          {isListening ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-700">Live Transcription</span>
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 h-3 bg-green-500 rounded-full animate-bounce"
                      style={{
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              </div>
              {currentTranscript && (
                <div className="text-sm text-gray-800 font-mono bg-white/50 px-2 py-1 rounded">
                  "{currentTranscript}"
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">
                Click to start live voice transcription
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Powered by Web Speech API - Real-time transcription
              </span>
              {error && (
                <span className="text-xs text-red-500 mt-1">
                  {error}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-xs text-gray-500">
            User: <span style={{ color: currentUser.color }}>{currentUser.name}</span>
          </div>
          <TranscriptionModelSelector />
        </div>
      </div>

      {browserCompatibility && !browserCompatibility.supported && (
        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
          ⚠️ Using fallback transcription - For best experience, use Chrome or Edge
        </div>
      )}
    </div>
  )
}