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

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyesOpen(false)
      setTimeout(() => setEyesOpen(true), 120)
    }, 2500 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [])

  const Bot = () => (
    <div className="group relative h-[82px] w-[66px]">
      <div className="absolute bottom-[1px] left-1/2 h-3 w-11 -translate-x-1/2 rounded-full bg-slate-950/28 blur-[2px]" />

      <div className="absolute bottom-3 left-1/2 h-[13px] w-[16px] -translate-x-1/2 rounded-[6px] bg-gradient-to-b from-slate-100 to-slate-300 shadow-[0_2px_6px_rgba(15,23,42,0.18)]" />

      <div
        className={`absolute bottom-[7px] left-1/2 h-[35px] w-[47px] -translate-x-1/2 rounded-[20px] border border-slate-200/95 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 transition-all duration-300 ${
          isLoading ? 'animate-pulse' : 'group-hover:translate-y-[-1px]'
        }`}
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 9px 16px rgba(15,23,42,0.2)' }}
      >
        <div className="absolute left-1/2 top-[8px] h-[3px] w-6 -translate-x-1/2 rounded-full bg-[#106865]/35" />
        <div className="absolute inset-x-[10px] bottom-[7px] h-[9px] rounded-full bg-gradient-to-b from-[#d9fff5]/70 to-[#9ff0de]/30" />
      </div>

      <div className="absolute bottom-[19px] left-[2px] h-[16px] w-[11px] rotate-[-14deg] rounded-full bg-gradient-to-b from-slate-100 to-slate-300 shadow-[0_3px_7px_rgba(15,23,42,0.18)]" />
      <div className="absolute bottom-[19px] right-[2px] h-[16px] w-[11px] rotate-[14deg] rounded-full bg-gradient-to-b from-slate-100 to-slate-300 shadow-[0_3px_7px_rgba(15,23,42,0.18)]" />

      <div
        className={`absolute left-1/2 top-[2px] h-[48px] w-[48px] -translate-x-1/2 rounded-[22px] border border-slate-200/95 bg-gradient-to-b from-white via-slate-50 to-slate-100 transition-all duration-300 ${
          isLoading ? 'scale-[1.01]' : 'group-hover:translate-y-[-2px] group-hover:scale-[1.02]'
        }`}
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 12px 22px rgba(15,23,42,0.24)' }}
      >
        <div className="absolute left-[6px] top-[6px] h-[14px] w-[18px] rounded-full bg-white/75 blur-[0.4px]" />
        <div className="absolute right-[7px] top-[8px] h-[8px] w-[8px] rounded-full bg-white/45 blur-[0.4px]" />

        <div className="absolute left-1/2 top-[9px] h-[22px] w-[36px] -translate-x-1/2 rounded-[13px] border border-[#8adacb]/55 bg-gradient-to-r from-[#0f5856] via-[#156B68] to-[#197a74] shadow-[inset_0_1px_4px_rgba(255,255,255,0.25),inset_0_-3px_8px_rgba(0,0,0,0.2)]">
          <div className="absolute inset-0 rounded-[13px] bg-[linear-gradient(120deg,rgba(255,255,255,0.22),transparent_45%,rgba(255,255,255,0.08))]" />

          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-2">
            <div
              className={`transition-all duration-150 ${eyesOpen ? 'h-[7px] w-[7px]' : 'h-[3px] w-[7px]'}`}
              style={{
                backgroundColor: '#a5ffe9',
                borderRadius: eyesOpen ? '999px' : '4px',
                boxShadow: eyesOpen ? '0 0 10px rgba(165,255,233,0.9)' : 'none'
              }}
            />
            <div
              className={`transition-all duration-150 ${eyesOpen ? 'h-[7px] w-[7px]' : 'h-[3px] w-[7px]'}`}
              style={{
                backgroundColor: '#a5ffe9',
                borderRadius: eyesOpen ? '999px' : '4px',
                boxShadow: eyesOpen ? '0 0 10px rgba(165,255,233,0.9)' : 'none'
              }}
            />
          </div>
        </div>

        <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2">
          {expression === 'smile' && (
            <div
              className="h-[7px] w-[15px]"
              style={{ borderBottom: '2px solid #1a7e78', borderRadius: '0 0 999px 999px' }}
            />
          )}
          {expression === 'happy' && (
            <div
              className="h-[8px] w-[19px]"
              style={{ borderBottom: '2.5px solid #1a7e78', borderRadius: '0 0 999px 999px' }}
            />
          )}
          {expression === 'thinking' && <div className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#1a7e78]" />}
          {expression === 'talking' && <div className="h-[4px] w-[10px] animate-pulse rounded-full bg-[#1a7e78]" />}
        </div>

        {isLoading && (
          <div className="absolute right-1.5 top-1.5">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-[2px] border-[#8de7d0] border-t-transparent" />
          </div>
        )}
      </div>

      {creditsAvailable > 0 && !isLoading && (
        <div className="absolute bottom-[10px] right-[4px] h-3 w-3 rounded-full border-2 border-white bg-[#1de9b6] shadow-[0_0_8px_rgba(29,233,182,0.75)]" />
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#146B67] focus-visible:ring-offset-2 rounded-2xl transition-all duration-200 disabled:opacity-50"
        aria-label="Ouvrir l'assistant de création d'annonce"
      >
        <Bot />
      </button>
    )
  }

  return <Bot />
}
