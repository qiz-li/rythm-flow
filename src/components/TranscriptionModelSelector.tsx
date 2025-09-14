import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Settings, Check, AlertCircle, Globe, Key, Zap } from 'lucide-react'
import { transcriptionService, TranscriptionModel, ModelInfo } from '../services/transcriptionService'

export default function TranscriptionModelSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentModel, setCurrentModel] = useState<TranscriptionModel>('auto')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const status = transcriptionService.getModelStatus()
    setCurrentModel(status.currentModel)
    setModels(status.allModels)
  }, [])

  const handleModelChange = (modelId: TranscriptionModel) => {
    transcriptionService.setModel(modelId)
    setCurrentModel(modelId)
    setIsOpen(false)
  }

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      })
    }
    setIsOpen(!isOpen)
  }

  const getModelIcon = (model: ModelInfo) => {
    if (!model.isAvailable) return <AlertCircle className="w-4 h-4 text-red-500" />
    if (model.isOpenSource) return <Globe className="w-4 h-4 text-green-500" />
    if (model.requiresApiKey) return <Key className="w-4 h-4 text-blue-500" />
    return <Zap className="w-4 h-4 text-purple-500" />
  }

  const currentModelInfo = models.find(m => m.id === currentModel)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
        title="Choose transcription model"
      >
        <Settings className="w-4 h-4 text-gray-600" />
        <span className="text-gray-700">
          {currentModelInfo?.name || 'Select Model'}
        </span>
        <div className="flex items-center gap-1">
          {currentModelInfo && getModelIcon(currentModelInfo)}
        </div>
      </button>

      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="fixed w-80 bg-white rounded-lg border border-gray-200 shadow-xl z-[70]"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left
            }}
          >
            <div className="p-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Speech-to-Text Model</h3>
              <p className="text-xs text-gray-500 mt-1">
                Choose between open source and commercial transcription services
              </p>
            </div>

            <div className="py-2">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  disabled={!model.isAvailable}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    !model.isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getModelIcon(model)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${
                        model.id === currentModel ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {model.name}
                      </span>

                      {model.id === currentModel && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}

                      <div className="flex gap-1">
                        {model.isOpenSource && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Open Source
                          </span>
                        )}
                        {model.requiresApiKey && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            API Key
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 mt-1">
                      {model.description}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        Provider: {model.provider}
                      </span>
                      {!model.isAvailable && (
                        <span className="text-xs text-red-600">
                          Not Available
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <div className="flex items-center gap-1 mb-1">
                  <Globe className="w-3 h-3 text-green-500" />
                  <span>Open source models don't require API keys</span>
                </div>
                <div className="flex items-center gap-1">
                  <Key className="w-3 h-3 text-blue-500" />
                  <span>Commercial models may offer higher accuracy</span>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}