import { useState, useRef, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { TypingBaseline } from '../types'

interface TypingCalibrationProps {
  onComplete: (baseline: TypingBaseline) => void
  onSkip: () => void
}

const CALIBRATION_TEXT = "Rhythm Flow is the best project at HackMIT"

export default function TypingCalibration({ onComplete, onSkip }: TypingCalibrationProps) {
  const [input, setInput] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [baseline, setBaseline] = useState<TypingBaseline | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Focus the input when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleInputChange = (value: string) => {
    // Start timer on first keystroke
    if (!startTime) {
      setStartTime(Date.now())
    }

    setInput(value)

    // Check if typing is complete
    if (value.length >= CALIBRATION_TEXT.length) {
      completeTest(value)
    }
  }

  const completeTest = (finalInput: string) => {
    if (isComplete || !startTime) return

    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000 // seconds
    const wordsTyped = finalInput.split(' ').length
    const wpm = Math.round((wordsTyped / duration) * 60)

    // Calculate accuracy
    let correctChars = 0
    for (let i = 0; i < Math.min(finalInput.length, CALIBRATION_TEXT.length); i++) {
      if (finalInput[i] === CALIBRATION_TEXT[i]) {
        correctChars++
      }
    }
    const accuracy = Math.round((correctChars / CALIBRATION_TEXT.length) * 100)

    const result: TypingBaseline = {
      wpm: Math.max(wpm, 1), // Minimum 1 WPM to avoid division by zero
      accuracy,
      duration,
      timestamp: Date.now()
    }

    setBaseline(result)
    setIsComplete(true)
    setShowResults(true)
  }

  const handleComplete = () => {
    if (baseline) {
      onComplete(baseline)
    }
  }

  const renderText = () => {
    return CALIBRATION_TEXT.split('').map((char, index) => {
      let className = 'transition-colors duration-100 '

      if (index < input.length) {
        if (input[index] === char) {
          className += 'bg-rhythm-success/20 text-rhythm-success'
        } else {
          className += 'bg-rhythm-danger/20 text-rhythm-danger'
        }
      } else if (index === input.length) {
        className += 'bg-rhythm-primary/30 text-rhythm-primary animate-pulse' // Current position
      } else {
        className += 'text-gray-600'
      }

      return (
        <span key={index} className={className}>
          {char}
        </span>
      )
    })
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-rhythm-primary/10 to-rhythm-secondary/10 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-8">
        {!showResults ? (
          <>
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-rhythm-primary to-rhythm-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                Typing Calibration
              </h2>
              <p className="text-gray-600">
                Let's measure your baseline typing speed to better analyze your rhythm patterns
              </p>
            </div>

            {/* Typing Text Display */}
            <div className="mb-8">
              <div className="text-2xl leading-relaxed p-6 bg-gray-50 rounded-lg border-2 border-gray-200 font-mono text-center">
                {renderText()}
              </div>
            </div>

            {/* Input Area */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type the text above:
              </label>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Start typing..."
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rhythm-primary focus:border-rhythm-primary resize-none font-mono text-xl"
                rows={4}
                disabled={isComplete}
              />

              {/* Progress */}
              <div className="mt-3 flex justify-between text-sm text-gray-500">
                <span>{input.length} / {CALIBRATION_TEXT.length} characters</span>
                {startTime && (
                  <span>
                    Time: {Math.round((Date.now() - startTime) / 100) / 10}s
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={onSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip Calibration
              </button>

              <div className="text-sm text-gray-500">
                Complete the typing test to continue
              </div>
            </div>
          </>
        ) : (
          /* Results Display */
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-rhythm-success to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              Calibration Complete!
            </h3>

            {baseline && (
              <div className="grid grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
                <div className="bg-rhythm-primary/10 rounded-lg p-6 border border-rhythm-primary/20">
                  <div className="text-3xl font-bold text-rhythm-primary mb-1">
                    {baseline.wpm}
                  </div>
                  <div className="text-sm text-gray-600">Words per minute</div>
                </div>

                <div className="bg-rhythm-success/10 rounded-lg p-6 border border-rhythm-success/20">
                  <div className="text-3xl font-bold text-rhythm-success mb-1">
                    {baseline.accuracy}%
                  </div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
              </div>
            )}

            <p className="text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              Great! We'll use this baseline to better analyze your typing rhythm and patterns
              during the collaborative session.
            </p>

            <button
              onClick={handleComplete}
              className="w-full bg-gradient-to-r from-rhythm-primary to-rhythm-secondary text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Continue to Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}