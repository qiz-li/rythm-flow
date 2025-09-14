interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export interface LiveTranscriptionResult {
  transcript: string
  confidence: number
  isFinal: boolean
  timestamp: number
}

export interface LiveTranscriptionCallbacks {
  onResult: (result: LiveTranscriptionResult) => void
  onStart: () => void
  onEnd: () => void
  onError: (error: string) => void
}

class WebSpeechService {
  private recognition: SpeechRecognition | null = null
  private isListening = false
  private callbacks: LiveTranscriptionCallbacks | null = null

  constructor() {
    // Check if Web Speech API is available
    if (!this.isSupported()) {
      console.warn('Web Speech API not supported in this browser')
    }
  }

  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  getBrowserCompatibility(): {
    supported: boolean
    browserName: string
    recommendation?: string
  } {
    const userAgent = navigator.userAgent
    let browserName = 'Unknown'

    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome'
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox'
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari'
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge'
    }

    const supported = this.isSupported()

    let recommendation: string | undefined
    if (!supported) {
      if (browserName === 'Firefox') {
        recommendation = 'Web Speech API is not supported in Firefox. Please use Chrome, Edge, or Safari for live transcription.'
      } else if (browserName === 'Safari') {
        recommendation = 'Please enable "Ask to Use Microphone" in Safari settings and allow microphone access.'
      } else {
        recommendation = 'Please use Chrome or Edge for the best live transcription experience.'
      }
    }

    return {
      supported,
      browserName,
      recommendation
    }
  }

  private setupRecognition(): SpeechRecognition {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionClass()

    // Configure for live transcription
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    // Set up event handlers
    recognition.onstart = () => {
      console.log('🎤 Web Speech recognition started')
      this.isListening = true
      this.callbacks?.onStart()
    }

    recognition.onend = () => {
      console.log('🎤 Web Speech recognition ended')
      this.isListening = false
      this.callbacks?.onEnd()
    }

    recognition.onerror = (event: any) => {
      console.error('🎤 Web Speech recognition error:', event.error)
      this.isListening = false

      let errorMessage = 'Speech recognition failed'
      switch (event.error) {
        case 'network':
          errorMessage = 'Network error - please check your internet connection'
          break
        case 'not-allowed':
          errorMessage = 'Microphone access denied - please allow microphone permissions'
          break
        case 'no-speech':
          errorMessage = 'No speech detected - please speak into your microphone'
          break
        case 'audio-capture':
          errorMessage = 'Microphone not found - please check your audio settings'
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not available'
          break
      }

      this.callbacks?.onError(errorMessage)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        const confidence = result[0].confidence

        if (result.isFinal) {
          finalTranscript += transcript + ' '

          this.callbacks?.onResult({
            transcript: transcript.trim(),
            confidence: confidence || 0.8, // Default confidence if not provided
            isFinal: true,
            timestamp: Date.now()
          })

          console.log('🎤 Final transcript:', transcript.trim())
        } else {
          interimTranscript += transcript

          this.callbacks?.onResult({
            transcript: transcript.trim(),
            confidence: confidence || 0.5, // Lower confidence for interim results
            isFinal: false,
            timestamp: Date.now()
          })
        }
      }
    }

    return recognition
  }

  startListening(callbacks: LiveTranscriptionCallbacks): boolean {
    if (!this.isSupported()) {
      callbacks.onError('Web Speech API not supported in this browser')
      return false
    }

    if (this.isListening) {
      console.log('🎤 Already listening')
      return false
    }

    try {
      this.callbacks = callbacks
      this.recognition = this.setupRecognition()
      this.recognition.start()
      return true
    } catch (error: any) {
      console.error('🎤 Failed to start speech recognition:', error)
      callbacks.onError(`Failed to start speech recognition: ${error.message}`)
      return false
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      console.log('🎤 Stopping speech recognition')
      this.recognition.stop()
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening
  }

  // Test if the service can be initialized
  async testConnection(): Promise<boolean> {
    if (!this.isSupported()) {
      return false
    }

    try {
      // Test microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (error) {
      console.warn('🎤 Microphone permission test failed:', error)
      return false
    }
  }

  // Get service info for the transcription service
  getServiceInfo() {
    return {
      name: 'Web Speech API',
      description: 'Browser-based live speech recognition',
      isAvailable: this.isSupported(),
      isOpenSource: false, // Uses cloud services like Google
      requiresApiKey: false,
      provider: 'Browser/Google',
      supportsLive: true
    }
  }
}

export const webSpeechService = new WebSpeechService()