'use client'

import { usePWAInstall } from '@/providers/PWAInstallProvider';

export default function PWAInstallButton() {
  const { canInstall, isIOS, promptInstall } = usePWAInstall();

  if (isIOS) {
    return (
      <div className="flex justify-center my-6">
        <div className="bg-yellow-100 text-yellow-800 px-6 py-3 rounded-full shadow-xl mx-auto text-center text-sm font-medium">
          Pour installer l'application sur votre iPhone, ouvrez le menu de partage de Safari puis sélectionnez « Sur l'écran d'accueil ».
        </div>
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <div className="flex justify-center my-6">
      <button
        onClick={() => {
          void promptInstall();
        }}
        className="bg-gradient-to-r from-[#1FA89B] to-[#146B67] text-white font-bold px-6 py-3 rounded-full shadow-xl hover:scale-105 transition-all duration-300 mx-auto"
      >
        Installer l'application
      </button>
    </div>
  );
} 
