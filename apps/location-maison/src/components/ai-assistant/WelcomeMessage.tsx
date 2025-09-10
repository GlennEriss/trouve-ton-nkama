'use client'

import React, { useEffect, useState } from 'react'

interface WelcomeMessageProps {
  show: boolean
  onComplete?: () => void
  text?: string
}

export default function WelcomeMessage({
  show,
  onComplete,
  text = "👋 Salut ! Je vais créer votre annonce en quelques secondes."
}: WelcomeMessageProps) {
  const [typedText, setTypedText] = useState('')
  const [isFading, setIsFading] = useState(false)

  // Animation typewriter
  useEffect(() => {
    if (!show) {
      setTypedText('')
      setIsFading(false)
      return
    }

    let currentIndex = 0
    const typeInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setTypedText(text.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typeInterval)
      }
    }, 45)

    return () => clearInterval(typeInterval)
  }, [show, text])

  // Disparition message
  useEffect(() => {
    if (!show) return

    const timer = setTimeout(() => {
      setIsFading(true)
      setTimeout(() => {
        onComplete?.()
      }, 400)
    }, text.length * 45 + 2500)

    return () => clearTimeout(timer)
  }, [show, text, onComplete])

  if (!show) return null

  return (
    <div
      className={`absolute bottom-full right-0 mb-4 transition-all duration-400 ${
        isFading ? 'opacity-0 translate-y-1' : 'opacity-100'
      }`}
    >
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 w-64 relative">
        <p className="text-sm text-gray-700">
          {typedText}
          {typedText.length < text.length && (
            <span className="animate-pulse" style={{ color: '#1de9b6' }}>|</span>
          )}
        </p>
        {/* Petite flèche pointant vers le bot */}
        <div
          className="absolute -bottom-1 right-4 w-2 h-2 bg-white border-r border-b border-gray-100 transform rotate-45"
        />
      </div>
    </div>
  )
}
