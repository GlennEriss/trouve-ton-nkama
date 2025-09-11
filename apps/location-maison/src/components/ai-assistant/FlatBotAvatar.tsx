'use client'

import React, { useEffect, useState } from 'react'

interface FlatBotAvatarProps {
  isLoading?: boolean
  creditsAvailable?: number
  expression?: 'smile' | 'happy' | 'thinking' | 'talking'
  onClick?: () => void
  disabled?: boolean
}

export default function FlatBotAvatar({
  isLoading = false,
  creditsAvailable = 0,
  expression = 'smile',
  onClick,
  disabled = false
}: FlatBotAvatarProps) {
  const [eyesOpen, setEyesOpen] = useState(true)

  // Clignement naturel
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyesOpen(false)
      setTimeout(() => setEyesOpen(true), 120)
    }, 2500 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [])

  const Bot = () => (
    <div className="relative">
      {/* Ombre portée */}
      <div
        className="absolute top-1 left-0 w-16 h-20 rounded-full opacity-20"
        style={{ backgroundColor: '#1e293b' }}
      />

      {/* Corps principal - coque blanche ovale */}
      <div
        className={`relative w-16 h-20 transition-all duration-300 ${
          isLoading ? 'animate-pulse' : 'hover:scale-105'
        }`}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        {/* Visage vert sarcelle à l'intérieur */}
        <div
          className="absolute inset-2 transition-all duration-200"
          style={{
            backgroundColor: '#156B68',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
          }}
        >
          {/* Yeux vert clair */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            <div
              className={`transition-all duration-150 ${
                eyesOpen ? 'w-2 h-2' : 'w-2 h-0.5'
              }`}
              style={{
                backgroundColor: '#1de9b6',
                borderRadius: eyesOpen ? '50%' : '50% 50% 0 0'
              }}
            />
            <div
              className={`transition-all duration-150 ${
                eyesOpen ? 'w-2 h-2' : 'w-2 h-0.5'
              }`}
              style={{
                backgroundColor: '#1de9b6',
                borderRadius: eyesOpen ? '50%' : '50% 50% 0 0'
              }}
            />
          </div>

          {/* Bouche selon expression */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            {expression === 'smile' && (
              <div
                className="w-6 h-3"
                style={{
                  borderBottom: '2px solid #1de9b6',
                  borderRadius: '0 0 50px 50px'
                }}
              />
            )}
            {expression === 'happy' && (
              <div
                className="w-8 h-4"
                style={{
                  borderBottom: '3px solid #1de9b6',
                  borderRadius: '0 0 50px 50px'
                }}
              />
            )}
            {expression === 'thinking' && (
              <div
                className="w-3 h-1.5 animate-pulse"
                style={{ backgroundColor: '#1de9b6', borderRadius: '50%' }}
              />
            )}
            {expression === 'talking' && (
              <div
                className="w-4 h-1"
                style={{ backgroundColor: '#1de9b6', borderRadius: '2px' }}
              />
            )}
          </div>

          {/* Icône spéciale quand en cours de réflexion */}
          {isLoading && (
            <div className="absolute top-2 right-2">
              <div
                className="w-3 h-3 animate-spin"
                style={{
                  border: '2px solid #1de9b6',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Indicateur online - petit point vert */}
      {creditsAvailable > 0 && !isLoading && (
        <div
          className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: '#1de9b6' }}
        />
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="focus:outline-none transition-all duration-200 disabled:opacity-50"
      >
        <Bot />
      </button>
    )
  }

  return <Bot />
}
