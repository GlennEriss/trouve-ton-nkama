import React from 'react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-[#1FA89B]">
      <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-[#1FA89B] mb-6"></div>
      <p className="text-lg font-semibold">Chargement en cours...</p>
    </div>
  )
}
