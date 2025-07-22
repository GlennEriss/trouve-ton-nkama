import React, { useEffect, useState } from 'react';

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Vérifie si l'app est déjà installée
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    if (isStandalone) {
      setCanInstall(false);
      return;
    }
    // Écoute l'événement beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  if (!canInstall) return null;

  return (
    <div className="flex justify-center my-6">
      <button
        onClick={handleInstall}
        className="bg-gradient-to-r from-[#1FA89B] to-[#146B67] text-white font-bold px-6 py-3 rounded-full shadow-xl hover:scale-105 transition-all duration-300 mx-auto"
      >
        Installer l'application
      </button>
    </div>
  );
} 