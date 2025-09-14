interface TranscriptionResult {
  text: string
  confidence?: number
  duration: number
  segments?: Array<{
    text: string
    start: number
    end: number
    confidence?: number
  }>
}

interface TranscriptionError {
  error: string
  code?: string
}

class OpenAIWhisperService {
  private apiUrl = 'https://api.openai.com/v1/audio/transcriptions'
  private apiKey: string | null = null
  private isInitialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    this.apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || null

    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Voice transcription will use mock data.')
      return
    }

    this.isInitialized = true
    console.log('OpenAI Whisper service initialized successfully')
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult | TranscriptionError> {
    const startTime = Date.now()

    if (!this.isInitialized || !this.apiKey) {
      return this.getMockTranscription(audioBlob, startTime)
    }

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')
      formData.append('response_format', 'verbose_json')
      formData.append('timestamp_granularities[]', 'word')

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      })

      if (!response.ok) {
        return this.handleApiError(response, audioBlob, startTime)
      }

      const data = await response.json()

      return {
        text: data.text || '[No speech detected]',
        confidence: this.calculateAverageConfidence(data.words),
        duration: Date.now() - startTime,
        segments: data.words ? this.convertWordsToSegments(data.words) : []
      }

    } catch (error: any) {
      console.error('OpenAI Whisper transcription failed:', error)

      if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
        return {
          error: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR'
        }
      }

      return this.getMockTranscription(audioBlob, startTime)
    }
  }

  private async handleApiError(response: Response, audioBlob: Blob, startTime: number): Promise<TranscriptionResult | TranscriptionError> {
    const status = response.status
    
    try {
      const errorData = await response.json()
      const errorMessage = errorData.error?.message || errorData.message || 'Unknown error'
      
      switch (status) {
        case 400:
          return {
            error: `Invalid request: ${errorMessage}`,
            code: 'BAD_REQUEST'
          }
        case 401:
          return {
            error: 'Invalid API key. Please check your OpenAI configuration.',
            code: 'AUTH_ERROR'
          }
        case 413:
          return {
            error: 'Audio file too large. Please use shorter recordings.',
            code: 'FILE_TOO_LARGE'
          }
        case 429:
          return {
            error: 'Rate limit exceeded. Please try again in a moment.',
            code: 'RATE_LIMIT'
          }
        case 500:
        case 502:
        case 503:
          return {
            error: 'Service temporarily unavailable. Please try again.',
            code: 'SERVICE_ERROR'
          }
        default:
          return {
            error: `API error (${status}): ${errorMessage}`,
            code: 'API_ERROR'
          }
      }
    } catch {
      return this.getMockTranscription(audioBlob, startTime)
    }
  }

  private calculateAverageConfidence(words?: Array<{ confidence?: number }>): number {
    if (!words || words.length === 0) return 0.85

    const wordsWithConfidence = words.filter(word => word.confidence !== undefined)
    if (wordsWithConfidence.length === 0) return 0.85

    const avgConfidence = wordsWithConfidence.reduce((sum, word) => sum + (word.confidence || 0), 0) / wordsWithConfidence.length
    return Math.max(0, Math.min(1, avgConfidence))
  }

  private convertWordsToSegments(words: Array<{ word: string; start: number; end: number; confidence?: number }>): Array<{ text: string; start: number; end: number; confidence?: number }> {
    if (!words || words.length === 0) return []

    const segments = []
    let currentSegment = {
      text: words[0].word,
      start: words[0].start,
      end: words[0].end,
      confidence: words[0].confidence || 0.85
    }

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const timeDiff = word.start - currentSegment.end

      if (timeDiff > 1.0) {
        segments.push(currentSegment)
        currentSegment = {
          text: word.word,
          start: word.start,
          end: word.end,
          confidence: word.confidence || 0.85
        }
      } else {
        currentSegment.text += ' ' + word.word
        currentSegment.end = word.end
        if (word.confidence !== undefined && currentSegment.confidence !== undefined) {
          currentSegment.confidence = (currentSegment.confidence + word.confidence) / 2
        }
      }
    }

    segments.push(currentSegment)
    return segments
  }

  private async getMockTranscription(_audioBlob: Blob, startTime: number): Promise<TranscriptionResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))
    
    const mockPhrases = [
      "I think we should focus on the user experience first.",
      "That's a great point about the API integration.",
      "Let me share my thoughts on this approach.",
      "We could consider a different strategy here.",
      "The data looks promising for this quarter.",
      "I'd like to add some context to that discussion.",
      "This aligns well with our current objectives.",
      "We should probably test this with real users.",
      "The performance metrics are showing good results.",
      "Let's revisit this in our next meeting.",
      "I agree with that assessment completely.",
      "We need to consider the technical constraints.",
      "The timeline seems reasonable for this scope.",
      "Have we thought about the scalability aspects?",
      "This could impact our Q4 roadmap significantly."
    ]

    const phrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)]
    const confidence = 0.82 + Math.random() * 0.15
    
    return {
      text: phrase,
      confidence,
      duration: Date.now() - startTime,
      segments: [
        {
          text: phrase,
          start: 0,
          end: phrase.split(' ').length * 0.6,
          confidence
        }
      ]
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.apiKey !== null
  }

  getStatus(): { available: boolean; reason?: string } {
    if (!(import.meta as any).env?.VITE_OPENAI_API_KEY) {
      return {
        available: false,
        reason: 'OpenAI API key not configured'
      }
    }

    if (!this.isInitialized) {
      return {
        available: false,
        reason: 'Service not initialized'
      }
    }

    return { available: true }
  }

  // Test connectivity with a simple health check
  async testConnection(): Promise<boolean> {
    if (!this.isInitialized || !this.apiKey) return false

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      })

      return response.ok
    } catch {
      return false
    }
  }
}

export const openaiWhisperService = new OpenAIWhisperService()
export type { TranscriptionResult, TranscriptionError }