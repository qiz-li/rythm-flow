# Speech-to-Text Models

This application supports multiple speech-to-text models with both open source and commercial options.

## Available Models

### 1. Whisper.cpp (Open Source, Local)
- **Provider**: Local browser (WebAssembly via Transformers.js)
- **Cost**: Completely free
- **API Key**: Not required
- **Availability**: Works in all modern browsers with WebAssembly support
- **Accuracy**: High accuracy (same as OpenAI Whisper)
- **Privacy**: Completely private - runs locally, no data sent to servers
- **Offline**: Works without internet connection after initial model download
- **Model Size**: ~40MB download on first use
- **Fallback**: Automatically tries multiple model configurations if CDN issues occur

### 2. OpenAI Whisper (Commercial)
- **Provider**: OpenAI
- **Cost**: Pay per usage
- **API Key**: Required (VITE_OPENAI_API_KEY)
- **Availability**: Requires internet connection
- **Accuracy**: High accuracy for various accents and noise conditions
- **Privacy**: Audio sent to OpenAI servers

### 3. Auto Select (Recommended)
- **Provider**: Mixed
- **Behavior**: Automatically chooses the best available model
- **Priority**: Whisper.cpp (local, free) → OpenAI Whisper (fallback)
- **Benefits**: Uses local processing when possible, cloud as backup

## How to Switch Models

1. **In the Voice Controls section**, look for the settings button with model name
2. **Click the dropdown** to see all available models
3. **Select your preferred model**:
   - **"Auto Select"**: Recommended for most users
   - **"Web Speech API"**: For privacy-focused users
   - **"OpenAI Whisper"**: For highest accuracy (requires API key)

## Model Indicators

- 🌍 **Green Globe**: Open source model
- 🔑 **Blue Key**: Requires API key
- ⚠️ **Red Alert**: Model not available
- ✅ **Blue Check**: Currently selected model

## Setup Instructions

### For Web Speech API (No setup required)
- Works automatically in supported browsers
- No configuration needed

### For OpenAI Whisper
1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your `.env` file:
   ```
   VITE_OPENAI_API_KEY=your_api_key_here
   ```
3. Restart the development server

## Technical Details

- **Model selection is persistent** - your choice is saved in browser storage
- **Automatic fallback** - if a model fails, Auto mode tries alternatives
- **Error handling** - graceful degradation when models are unavailable
- **Real-time switching** - change models without restarting the application

## Privacy Considerations

- **Web Speech API**: Audio processing depends on browser implementation (Chrome uses Google's servers, Safari uses Apple's)
- **OpenAI Whisper**: Audio is sent to OpenAI servers for processing
- **Local processing**: Consider Whisper.cpp or similar for fully local transcription (future enhancement)

## Development

The transcription system is modular and extensible:

- `src/services/transcriptionService.ts` - Main service coordinator
- `src/services/webSpeechService.ts` - Web Speech API implementation
- `src/services/openaiWhisperService.ts` - OpenAI Whisper implementation
- `src/components/TranscriptionModelSelector.tsx` - UI component for model selection

To add new models, implement the same interface and register in the transcription service.