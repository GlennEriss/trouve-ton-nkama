import React from 'react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black text-secondary">
      <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-secondary mb-6"></div>
      <p className="text-lg font-semibold dark:text-white">Chargement en cours...</p>
    </div>
  )
}
