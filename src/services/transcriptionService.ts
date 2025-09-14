import { openaiWhisperService } from './openaiWhisperService'
import { mockTranscriptionService } from './mockTranscriptionService'
import { webSpeechService } from './webSpeechService'

export type TranscriptionModel = 'web-speech' | 'openai-whisper' | 'auto'

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

interface ModelInfo {
  id: TranscriptionModel
  name: string
  description: string
  isAvailable: boolean
  isOpenSource: boolean
  requiresApiKey: boolean
  provider: string
}

class TranscriptionService {
  private currentModel: TranscriptionModel = 'auto'

  constructor() {
    // Load saved preference
    const saved = localStorage.getItem('transcription-model')
    if (saved && this.isValidModel(saved)) {
      this.currentModel = saved as TranscriptionModel
    }
  }

  private isValidModel(model: string): boolean {
    return ['web-speech', 'openai-whisper', 'auto'].includes(model)
  }

  setModel(model: TranscriptionModel) {
    this.currentModel = model
    localStorage.setItem('transcription-model', model)
    console.log(`Transcription model set to: ${model}`)
  }

  getCurrentModel(): TranscriptionModel {
    return this.currentModel
  }

  getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'auto',
        name: 'Auto Select',
        description: 'Automatically choose the best available model (Web Speech API preferred)',
        isAvailable: true,
        isOpenSource: false,
        requiresApiKey: false,
        provider: 'Mixed'
      },
      {
        id: 'web-speech',
        name: 'Web Speech API (Live)',
        description: 'Browser-based real-time transcription (Chrome/Edge recommended)',
        isAvailable: webSpeechService.isSupported(),
        isOpenSource: false,
        requiresApiKey: false,
        provider: 'Browser/Google'
      },
      {
        id: 'openai-whisper',
        name: 'OpenAI Whisper (Fallback)',
        description: 'High-accuracy cloud-based transcription (requires API key)',
        isAvailable: openaiWhisperService.isAvailable(),
        isOpenSource: false,
        requiresApiKey: true,
        provider: 'OpenAI'
      }
    ]
  }

  private selectBestModel(): 'web-speech' | 'openai-whisper' {
    // Note: Web Speech API is primarily used for live transcription in VoiceControls
    // This fallback is for any remaining batch transcription needs

    // Prefer OpenAI Whisper for batch transcription (higher accuracy)
    if (openaiWhisperService.isAvailable()) {
      return 'openai-whisper'
    }

    // Fallback to Web Speech for batch if available
    if (webSpeechService.isSupported()) {
      return 'web-speech'
    }

    // Default to OpenAI Whisper (will show error if not configured)
    return 'openai-whisper'
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult | TranscriptionError> {
    // Note: This method is primarily for fallback batch transcription
    // Live transcription is handled directly by VoiceControls using webSpeechService

    let modelToUse: 'web-speech' | 'openai-whisper'

    if (this.currentModel === 'auto') {
      modelToUse = this.selectBestModel()
    } else if (this.currentModel === 'web-speech') {
      // Web Speech API doesn't support batch transcription from audio blobs
      // Fall back to OpenAI Whisper for this use case
      console.log('Web Speech API selected but not suitable for batch transcription, using OpenAI Whisper')
      modelToUse = 'openai-whisper'
    } else {
      modelToUse = this.currentModel as 'web-speech' | 'openai-whisper'
    }

    console.log(`Using transcription model for batch processing: ${modelToUse}`)

    try {
      switch (modelToUse) {
        case 'web-speech':
          // Web Speech API doesn't support blob transcription
          // This should not happen due to the check above, but handle it gracefully
          return {
            error: 'Web Speech API does not support batch audio transcription. Use live transcription instead.',
            code: 'UNSUPPORTED_OPERATION'
          }

        case 'openai-whisper':
          return await openaiWhisperService.transcribeAudio(audioBlob)

        default:
          return {
            error: `Unknown transcription model: ${modelToUse}`,
            code: 'INVALID_MODEL'
          }
      }
    } catch (error: any) {
      console.error(`Transcription failed with model ${modelToUse}:`, error)

      // Fallback logic for auto mode
      if (this.currentModel === 'auto' || this.currentModel === 'web-speech') {
        if (modelToUse === 'openai-whisper') {
          // Use mock service fallback for demo purposes
          console.log('OpenAI Whisper failed, falling back to mock transcription for demo')
          try {
            const result = await mockTranscriptionService.transcribeAudio(audioBlob)
            if ('text' in result) {
              result.text = result.text + ' [Demo Mode - Real transcription unavailable]'
            }
            return result
          } catch (mockError: any) {
            console.error('Even mock service failed:', mockError)
          }
        }
      }

      return {
        error: `Transcription failed: ${error.message}`,
        code: 'TRANSCRIPTION_ERROR'
      }
    }
  }

  getModelStatus(): {
    currentModel: TranscriptionModel
    selectedModelInfo: ModelInfo
    allModels: ModelInfo[]
  } {
    const models = this.getAvailableModels()
    const current = models.find(m => m.id === this.currentModel) || models[0]

    return {
      currentModel: this.currentModel,
      selectedModelInfo: current,
      allModels: models
    }
  }

  async testConnection(): Promise<{ model: string; success: boolean; error?: string }[]> {
    const results = []

    // Test Web Speech API
    try {
      const webSpeechResult = await webSpeechService.testConnection()
      results.push({
        model: 'web-speech',
        success: webSpeechResult
      })
    } catch (error: any) {
      results.push({
        model: 'web-speech',
        success: false,
        error: error.message
      })
    }

    // Test OpenAI Whisper
    try {
      const openaiResult = await openaiWhisperService.testConnection()
      results.push({
        model: 'openai-whisper',
        success: openaiResult
      })
    } catch (error: any) {
      results.push({
        model: 'openai-whisper',
        success: false,
        error: error.message
      })
    }

    return results
  }
}

export const transcriptionService = new TranscriptionService()
export type { TranscriptionResult, TranscriptionError, ModelInfo }