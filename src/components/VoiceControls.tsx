import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Square, Loader2 } from 'lucide-react'
import { User, VoiceContribution } from '../types'
import { useSessionStore } from '../stores/sessionStore'
import { transcriptionService } from '../services/transcriptionService'
import TranscriptionModelSelector from './TranscriptionModelSelector'

interface VoiceControlsProps {
  currentUser: User
}

export default function VoiceControls({ currentUser }: VoiceControlsProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  
  const { addVoiceContribution } = useSessionStore()

  useEffect(() => {
    checkMicrophonePermission()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
    } catch (error) {
      setHasPermission(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const duration = Date.now() - startTimeRef.current
        
        setIsTranscribing(true)
        setTranscriptionError(null)
        
        try {
          const result = await transcriptionService.transcribeAudio(audioBlob)
          
          let transcriptionText: string
          let confidence: number | undefined
          
          if ('error' in result) {
            transcriptionText = `[Transcription failed: ${result.error}]`
            setTranscriptionError(result.error)
          } else {
            transcriptionText = result.text || `[Voice recording ${Math.round(duration / 1000)}s]`
            confidence = result.confidence
          }

          const contribution: VoiceContribution = {
            id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId: currentUser.id,
            timestamp: startTimeRef.current,
            duration,
            transcription: transcriptionText,
            volume: confidence || Math.random() * 0.5 + 0.5
          }

          addVoiceContribution(contribution)
        } catch (error) {
          console.error('Transcription error:', error)
          const fallbackContribution: VoiceContribution = {
            id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId: currentUser.id,
            timestamp: startTimeRef.current,
            duration,
            transcription: `[Voice recording ${Math.round(duration / 1000)}s - transcription failed]`,
            volume: Math.random() * 0.5 + 0.5
          }
          addVoiceContribution(fallbackContribution)
          setTranscriptionError('Transcription service unavailable')
        } finally {
          setIsTranscribing(false)
        }
        
        stream.getTracks().forEach(track => track.stop())
      }

      startTimeRef.current = Date.now()
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(Date.now() - startTimeRef.current)
      }, 100)

    } catch (error) {
      console.error('Error starting recording:', error)
      setHasPermission(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
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
        <span className="text-gray-600">Checking microphone permissions...</span>
      </div>
    )
  }

  if (hasPermission === false) {
    return (
      <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
        <MicOff className="w-5 h-5 text-red-500" />
        <div>
          <p className="text-red-700 font-medium">Microphone access denied</p>
          <p className="text-red-600 text-sm">Please enable microphone access to use voice features</p>
        </div>
        <button
          onClick={checkMicrophonePermission}
          className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className={`p-3 rounded-full transition-all duration-200 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
              : isTranscribing
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-rhythm-primary hover:bg-rhythm-primary/90 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <Square className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono text-gray-700">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1">
        {isTranscribing ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-700">Transcribing...</span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-3 bg-blue-400 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Recording...</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-rhythm-primary rounded-full animate-pulse"
                  style={{
                    height: `${12 + Math.random() * 16}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-sm text-gray-600">
              Click to start voice recording
            </span>
            {transcriptionError && (
              <span className="text-xs text-red-500 mt-1">
                {transcriptionError}
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
  )
}