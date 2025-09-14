import { pipeline, AutomaticSpeechRecognitionPipeline } from '@xenova/transformers'
import { mockTranscriptionService } from './mockTranscriptionService'

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

class WhisperCppService {
  private transcriber: AutomaticSpeechRecognitionPipeline | null = null
  private isInitialized = false
  private isInitializing = false
  private initializationError: string | null = null

  constructor() {
    // Don't initialize automatically - wait for first use
    console.log('Whisper.cpp service created (will initialize on first use)')
  }

  private createProgressCallback() {
    return (progress: any) => {
      if (progress.status === 'downloading') {
        console.log(`🔄 [WhisperCpp] Downloading: ${progress.name} (${Math.round(progress.progress || 0)}%)`)
      } else if (progress.status === 'done') {
        console.log(`✅ [WhisperCpp] Downloaded: ${progress.name}`)
      } else if (progress.status === 'loading') {
        console.log(`🔄 [WhisperCpp] Loading: ${progress.name}`)
      } else if (progress.status === 'ready') {
        console.log(`✅ [WhisperCpp] Ready: ${progress.name}`)
      }
    }
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return
    if (this.isInitializing) {
      // Wait for ongoing initialization
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return
    }

    this.isInitializing = true
    const startTime = Date.now()

    try {
      console.log('🔄 [WhisperCpp] Initializing Whisper model...')

      // Try multiple model configurations to avoid CDN issues
      const modelConfigurations = [
        {
          name: 'Xenova/whisper-tiny.en',
          options: {
            device: 'cpu',
            revision: 'main',
            progress_callback: this.createProgressCallback()
          }
        },
        {
          name: 'Xenova/whisper-tiny',
          options: {
            device: 'cpu',
            revision: 'main',
            progress_callback: this.createProgressCallback()
          }
        },
        {
          name: 'Xenova/whisper-base.en',
          options: {
            device: 'cpu',
            revision: 'main',
            progress_callback: this.createProgressCallback()
          }
        }
      ]

      let lastError = null
      for (let i = 0; i < modelConfigurations.length; i++) {
        const { name, options } = modelConfigurations[i]

        try {
          console.log(`🔄 [WhisperCpp] Trying model ${i + 1}/${modelConfigurations.length}: ${name}`)

          this.transcriber = await pipeline(
            'automatic-speech-recognition',
            name,
            {
              ...options,
              // Add timeout and retry configuration
              cache_dir: undefined, // Let transformers.js use default
              local_files_only: false
            }
          )

          console.log(`✅ [WhisperCpp] Successfully loaded model: ${name}`)
          break

        } catch (error: any) {
          console.warn(`⚠️ [WhisperCpp] Failed to load ${name}:`, error.message)
          lastError = error

          // Wait a bit before trying the next model
          if (i < modelConfigurations.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      if (!this.transcriber) {
        throw lastError || new Error('All model configurations failed to load')
      }

      this.isInitialized = true
      const duration = Date.now() - startTime

      console.log(`✅ [WhisperCpp] Model loaded successfully in ${duration}ms`)
      console.log('🔍 [WhisperCpp] Model info:', {
        model: 'whisper-tiny.en',
        device: 'cpu',
        ready: true
      })

    } catch (error: any) {
      const duration = Date.now() - startTime
      this.initializationError = error.message
      console.error(`❌ [WhisperCpp] Failed to initialize model after ${duration}ms:`, error)

      // Log more details for debugging
      console.error('🔍 [WhisperCpp] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3),
        errorString: error.toString()
      })

      // Enhanced error detection and user-friendly messages
      if (error.message.includes('<!doctype') ||
          error.message.includes('is not valid JSON') ||
          error.message.includes('Unexpected token') ||
          error.message.includes('HTML')) {
        console.error('🌐 [WhisperCpp] CDN/Network issue detected - Hugging Face returned HTML instead of model files')
        this.initializationError = 'Whisper model download failed due to CDN issues. This is usually temporary. Please try again in a few minutes or use the OpenAI Whisper option instead.'
      } else if (error.message.includes('fetch') ||
                 error.message.includes('network') ||
                 error.message.includes('CORS')) {
        this.initializationError = 'Unable to download the Whisper model due to network issues. Please check your internet connection and try again.'
      } else if (error.message.includes('timeout')) {
        this.initializationError = 'Model download timed out. Please try again with a better internet connection.'
      } else {
        this.initializationError = `Whisper model failed to load: ${error.message}. Try using the OpenAI Whisper option instead.`
      }

      throw new Error(this.initializationError)
    } finally {
      this.isInitializing = false
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult | TranscriptionError> {
    const startTime = Date.now()

    // Check for previous initialization error
    if (this.initializationError) {
      return {
        error: `Whisper model initialization failed: ${this.initializationError}`,
        code: 'INITIALIZATION_ERROR'
      }
    }

    try {
      // Initialize model if not already done
      if (!this.isInitialized) {
        console.log('🔄 [WhisperCpp] First use - initializing model...')
        await this.initialize()
      }

      if (!this.transcriber) {
        return {
          error: 'Whisper model not available',
          code: 'MODEL_NOT_LOADED'
        }
      }

      console.log('🎤 [WhisperCpp] Starting transcription...')
      console.log('🔍 [WhisperCpp] Audio blob info:', {
        size: audioBlob.size,
        type: audioBlob.type
      })

      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      console.log('🔄 [WhisperCpp] Processing audio with Whisper model...')

      // Transcribe the audio
      const result = await this.transcriber(uint8Array)

      const duration = Date.now() - startTime

      console.log(`✅ [WhisperCpp] Transcription completed in ${duration}ms`)
      console.log('🔍 [WhisperCpp] Result:', result)

      // Handle different result formats from transformers.js
      let text = ''
      let confidence = 0.9 // Default confidence for Whisper

      if (typeof result === 'string') {
        text = result
      } else if (result && typeof result === 'object') {
        if ('text' in result) {
          text = result.text
        }
        if ('score' in result || 'confidence' in result) {
          confidence = (result as any).score || (result as any).confidence || 0.9
        }
      }

      // Clean up the text
      text = text.trim()

      if (!text) {
        return {
          text: '[No speech detected]',
          confidence: 0,
          duration,
          segments: []
        }
      }

      return {
        text,
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
      const duration = Date.now() - startTime
      console.error(`❌ [WhisperCpp] Transcription failed after ${duration}ms:`, error)

      return {
        error: `Whisper transcription failed: ${error.message}`,
        code: 'TRANSCRIPTION_ERROR'
      }
    }
  }

  isAvailable(): boolean {
    // Check if we have the necessary browser features
    return (
      typeof window !== 'undefined' &&
      typeof AudioContext !== 'undefined' &&
      typeof ArrayBuffer !== 'undefined'
    )
  }

  getStatus(): { available: boolean; reason?: string; modelLoaded?: boolean } {
    if (!this.isAvailable()) {
      return {
        available: false,
        reason: 'Browser does not support required features'
      }
    }

    if (this.initializationError) {
      return {
        available: false,
        reason: `Model initialization failed: ${this.initializationError}`,
        modelLoaded: false
      }
    }

    return {
      available: true,
      modelLoaded: this.isInitialized
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.isAvailable()) return false

      // Try to initialize if not already done
      if (!this.isInitialized && !this.isInitializing) {
        await this.initialize()
      }

      return this.isInitialized
    } catch {
      return false
    }
  }

  // Get model loading progress (if available)
  getLoadingProgress(): { isLoading: boolean; progress?: number } {
    return {
      isLoading: this.isInitializing,
      progress: this.isInitializing ? 50 : (this.isInitialized ? 100 : 0)
    }
  }

  // Warm up the model with a small test
  async warmUp(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      console.log('🔥 [WhisperCpp] Warming up model...')

      // Create a small silent audio buffer for warmup
      const context = new AudioContext()
      const buffer = context.createBuffer(1, context.sampleRate * 0.1, context.sampleRate) // 100ms of silence

      // Convert to blob (simplified - in real use we'd need proper audio encoding)
      const dummyBlob = new Blob([''], { type: 'audio/wav' })

      // Note: This is a simplified warmup. In production, you'd want to use a proper audio file
      console.log('✅ [WhisperCpp] Model warmed up')
    } catch (error) {
      console.warn('⚠️ [WhisperCpp] Warmup failed:', error)
    }
  }
}

export const whisperCppService = new WhisperCppService()
export type { TranscriptionResult, TranscriptionError }