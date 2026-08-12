'use client'

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@trouve-ton-nkama/ui/dialog';
import { Download } from 'lucide-react';
import { usePWAInstall } from '@/providers/PWAInstallProvider';

const LOCALSTORAGE_KEY = 'pwa-modal-dismissed-at';
const HOUR_MS = 60 * 60 * 1000;

export default function ModalPWAInstall() {
  const { canInstall, isIOS, promptInstall } = usePWAInstall();
  const [open, setOpen] = useState(false);

  // Ouvre le modal uniquement quand l'installation est pertinente.
  useEffect(() => {
    if (!isIOS && !canInstall) {
      setOpen(false);
      return;
    }

    const lastDismiss = localStorage.getItem(LOCALSTORAGE_KEY);
    if (lastDismiss) {
      const last = parseInt(lastDismiss, 10);
      if (!isNaN(last) && Date.now() - last < HOUR_MS) {
        setOpen(false);
        return;
      }
    }
    setOpen(true);
  }, [canInstall, isIOS]);

  const handleInstallClick = useCallback(async () => {
    if (isIOS) return;
    await promptInstall();
    setOpen(false);
    localStorage.setItem(LOCALSTORAGE_KEY, Date.now().toString());
  }, [isIOS, promptInstall]);

  const handleLater = useCallback(() => {
    setOpen(false);
    localStorage.setItem(LOCALSTORAGE_KEY, Date.now().toString());
  }, []);

  // Si ni Android/Chrome installable ni iOS, ne rien afficher.
  if (!isIOS && !canInstall) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent isDefaultIconClose={false}>
        <DialogHeader>
          <DialogTitle>Installer l'application</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {isIOS ? (
            <>Pour installer l'application sur votre iPhone, ouvrez le menu de partage de Safari puis sélectionnez « Sur l'écran d'accueil ».</>
          ) : (
            <>Vous pouvez installer l'application sur votre appareil pour une expérience optimale.</>
          )}
        </DialogDescription>
        <DialogFooter>
          <button
            onClick={handleLater}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-full transition-all duration-200 hover:scale-[0.98]"
          >
            Plus tard
          </button>
          {!isIOS && (
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-gradient-to-r from-secondary to-primary hover:from-secondary hover:to-primary-800 text-white font-bold py-3 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Installer maintenant</span>
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
