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

class MockTranscriptionService {
  private isAvailable = true

  constructor() {
    console.log('Mock transcription service initialized (for demo purposes)')
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult | TranscriptionError> {
    const startTime = Date.now()

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200))

    try {
      // Get some info about the audio blob for more realistic results
      const duration = Date.now() - startTime
      const audioSize = audioBlob.size

      // Generate realistic mock transcriptions based on audio characteristics
      const mockPhrases = [
        "I think this approach makes sense for our project.",
        "Let me share my thoughts on this topic.",
        "That's a really interesting perspective to consider.",
        "We should probably discuss this in more detail.",
        "I agree with the points you mentioned earlier.",
        "Here's another way we could look at this.",
        "The data shows some promising trends.",
        "We might want to explore this option further.",
        "This could have significant impact on our goals.",
        "Let me know what you think about this idea.",
        "I've been thinking about this problem lately.",
        "The results are better than I expected.",
        "We should consider the long-term implications.",
        "This aligns well with our current strategy.",
        "I have some concerns about this approach."
      ]

      // Choose phrases based on audio blob size (longer audio = longer transcription)
      const phraseCount = Math.min(Math.max(Math.floor(audioSize / 10000), 1), 3)
      const selectedPhrases = []

      for (let i = 0; i < phraseCount; i++) {
        const phrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)]
        if (!selectedPhrases.includes(phrase)) {
          selectedPhrases.push(phrase)
        }
      }

      const text = selectedPhrases.join(' ')
      const confidence = 0.85 + Math.random() * 0.1 // 85-95% confidence

      return {
        text: `${text} [Mock Transcription]`,
        confidence,
        duration,
        segments: [{
          text,
          start: 0,
          end: duration / 1000,
          confidence
        }]
      }

    } catch (error: any) {
      console.error('Mock transcription failed:', error)
      return {
        error: `Mock transcription failed: ${error.message}`,
        code: 'MOCK_ERROR'
      }
    }
  }

  isServiceAvailable(): boolean {
    return this.isAvailable
  }

  getStatus(): { available: boolean; reason?: string } {
    return {
      available: this.isAvailable,
      ...(this.isAvailable ? {} : { reason: 'Mock service is disabled' })
    }
  }

  async testConnection(): Promise<boolean> {
    return this.isAvailable
  }
}

export const mockTranscriptionService = new MockTranscriptionService()
export type { TranscriptionResult, TranscriptionError }