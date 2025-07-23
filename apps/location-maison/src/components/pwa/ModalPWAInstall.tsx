import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const LOCALSTORAGE_KEY = 'pwa-modal-dismissed-at';
const HOUR_MS = 60 * 60 * 1000;

function isIOS() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function ModalPWAInstall() {
  const [open, setOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  // Vérifie si on doit afficher le modal
  useEffect(() => {
    setIsIOSDevice(isIOS());
    const lastDismiss = localStorage.getItem(LOCALSTORAGE_KEY);
    if (lastDismiss) {
      const last = parseInt(lastDismiss, 10);
      if (!isNaN(last) && Date.now() - last < HOUR_MS) {
        setOpen(false);
        return;
      }
    }
    setOpen(true);
  }, []);

  // Gestion Android/Chrome (beforeinstallprompt)
  useEffect(() => {
    if (isIOSDevice) return;
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    if (isStandalone) {
      setCanInstall(false);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isIOSDevice]);

  const handleInstall = useCallback(async () => {
    if (isIOSDevice) return;
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    setDeferredPrompt(null);
    setCanInstall(false);
    setOpen(false);
    localStorage.setItem(LOCALSTORAGE_KEY, Date.now().toString());
  }, [deferredPrompt, isIOSDevice]);

  const handleLater = useCallback(() => {
    setOpen(false);
    localStorage.setItem(LOCALSTORAGE_KEY, Date.now().toString());
  }, []);

  // Si ni Android/Chrome ni iOS, ne rien afficher
  if (!isIOSDevice && !canInstall) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent isDefaultIconClose={false}>
        <DialogHeader>
          <DialogTitle>Installer l'application</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {isIOSDevice ? (
            <>Pour installer l'application sur votre iPhone, ouvrez le menu de partage de Safari puis sélectionnez « Sur l'écran d'accueil ».</>
          ) : (
            <>Vous pouvez installer l'application sur votre appareil pour une expérience optimale.</>
          )}
        </DialogDescription>
        <DialogFooter>
          <button
            onClick={handleLater}
            className="bg-gray-200 text-gray-800 font-medium px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            Plus tard
          </button>
          {!isIOSDevice && (
            <button
              onClick={handleInstall}
              className="bg-gradient-to-r from-[#1FA89B] to-[#146B67] text-white font-bold px-4 py-2 rounded shadow hover:scale-105 transition-all"
            >
              Installer maintenant
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 