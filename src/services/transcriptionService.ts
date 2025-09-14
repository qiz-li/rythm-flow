import { openaiWhisperService } from './openaiWhisperService'
import { whisperCppService } from './whisperCppService'
import { mockTranscriptionService } from './mockTranscriptionService'

export type TranscriptionModel = 'openai-whisper' | 'whisper-cpp' | 'auto'

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
    return ['openai-whisper', 'whisper-cpp', 'auto'].includes(model)
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
        description: 'Automatically choose the best available model',
        isAvailable: true,
        isOpenSource: true,
        requiresApiKey: false,
        provider: 'Mixed'
      },
      {
        id: 'whisper-cpp',
        name: 'Whisper.cpp (Local)',
        description: 'Client-side Whisper model (free, private, works offline)',
        isAvailable: whisperCppService.isAvailable(),
        isOpenSource: true,
        requiresApiKey: false,
        provider: 'Local Browser'
      },
      {
        id: 'openai-whisper',
        name: 'OpenAI Whisper',
        description: 'High-accuracy cloud-based transcription (requires API key)',
        isAvailable: openaiWhisperService.isAvailable(),
        isOpenSource: false,
        requiresApiKey: true,
        provider: 'OpenAI'
      }
    ]
  }

  private selectBestModel(): 'openai-whisper' | 'whisper-cpp' {
    // Prefer local Whisper.cpp when available (free, private, works offline)
    if (whisperCppService.isAvailable()) {
      return 'whisper-cpp'
    }

    // Fall back to OpenAI Whisper if available
    if (openaiWhisperService.isAvailable()) {
      return 'openai-whisper'
    }

    // Default to local Whisper.cpp (will show error if not supported)
    return 'whisper-cpp'
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult | TranscriptionError> {
    let modelToUse: 'openai-whisper' | 'whisper-cpp'

    if (this.currentModel === 'auto') {
      modelToUse = this.selectBestModel()
    } else {
      modelToUse = this.currentModel as 'openai-whisper' | 'whisper-cpp'
    }

    console.log(`Using transcription model: ${modelToUse}`)

    try {
      switch (modelToUse) {
        case 'whisper-cpp':
          return await whisperCppService.transcribeAudio(audioBlob)

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

      // Enhanced fallback logic for auto mode
      if (this.currentModel === 'auto') {
        if (modelToUse === 'whisper-cpp') {
          // Try OpenAI Whisper first if available
          if (openaiWhisperService.isAvailable()) {
            console.log('Whisper.cpp failed, falling back to OpenAI Whisper')
            try {
              return await openaiWhisperService.transcribeAudio(audioBlob)
            } catch (fallbackError: any) {
              console.error('OpenAI Whisper also failed:', fallbackError)
            }
          }

          // If all else fails, use mock service for demo purposes
          console.log('All production models failed, falling back to mock transcription for demo')
          try {
            const result = await mockTranscriptionService.transcribeAudio(audioBlob)
            // Add a note to indicate this is a mock result
            if ('text' in result) {
              result.text = result.text + ' [Demo Mode - Real transcription unavailable]'
            }
            return result
          } catch (mockError: any) {
            console.error('Even mock service failed:', mockError)
          }

        } else if (modelToUse === 'openai-whisper') {
          // Try Whisper.cpp fallback if available
          if (whisperCppService.isAvailable()) {
            console.log('OpenAI Whisper failed, falling back to Whisper.cpp')
            try {
              return await whisperCppService.transcribeAudio(audioBlob)
            } catch (fallbackError: any) {
              console.error('Whisper.cpp also failed:', fallbackError)
            }
          }

          // Mock service fallback
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

    // Test Whisper.cpp
    try {
      const whisperCppResult = await whisperCppService.testConnection()
      results.push({
        model: 'whisper-cpp',
        success: whisperCppResult
      })
    } catch (error: any) {
      results.push({
        model: 'whisper-cpp',
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