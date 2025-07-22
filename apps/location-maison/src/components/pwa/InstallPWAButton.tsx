"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Download, X, Sparkles, Zap, Heart } from "lucide-react";
import Image from "next/image";

const MODAL_CACHE_KEY = "pwa-modal-dismissed-at";
const MODAL_DELAY = 4 * 60 * 60 * 1000; // 4h en ms

export default function InstallPWAButton({ forceOpen = false }: { forceOpen?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [open, setOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Délai pour une meilleure UX
      setTimeout(() => setOpen(true), 2000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Gestion du cache pour l'affichage automatique
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setShouldShow(true);
      return;
    }
    const lastDismissed = localStorage.getItem(MODAL_CACHE_KEY);
    const now = Date.now();
    if (!lastDismissed || now - parseInt(lastDismissed, 10) > MODAL_DELAY) {
      setOpen(true);
      setShouldShow(true);
    }
  }, [forceOpen]);

  const handleInstall = async () => {
    setIsAnimating(true);
    if (!deferredPrompt) return;
    
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    
    if (outcome === 'accepted') {
      // Animation de succès
      setTimeout(() => {
        setDeferredPrompt(null);
        setOpen(false);
      }, 1000);
    } else {
      setIsAnimating(false);
    }
  };

  // Quand l'utilisateur ferme le modal ("Plus tard")
  const handleClose = useCallback(() => {
    setOpen(false);
    setShouldShow(false);
    localStorage.setItem(MODAL_CACHE_KEY, Date.now().toString());
  }, []);

  if (!deferredPrompt && !forceOpen) return null;
  if (!shouldShow && !forceOpen) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md w-[95vw] max-w-lg mx-auto bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-blue-400/10 to-purple-400/10" />
        
        {/* Close Button */}
        <DialogClose asChild>
          <button className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-all duration-300">
            <X size={20} />
          </button>
        </DialogClose>

        {/* Header avec animation */}
        <DialogHeader className="relative text-center pt-8 pb-4">
          <div className="mx-auto mb-6 relative">
            {/* Icon container avec effet glow */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 shadow-lg">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 animate-ping opacity-20" />
              <Image
                src="/logo.svg"
                alt="Logo Trouve Ton Nkama"
                width={80}
                height={80}
                className="relative z-10 animate-bounce"
                style={{ animationDuration: '2s' }}
              />
              {/* Particules flottantes */}
              <Sparkles 
                size={16} 
                className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" 
              />
              <Zap 
                size={14} 
                className="absolute -bottom-1 -left-2 text-purple-400 animate-pulse delay-300" 
              />
            </div>
          </div>
          
          <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Installer Trouve ton Nkama
          </DialogTitle>
          
          <DialogDescription className="text-gray-600 leading-relaxed px-2 text-base sm:text-lg">
            <span className="inline-flex items-center gap-2 mb-3">
              <Heart size={18} className="text-red-500 animate-pulse" />
              Profitez d'une expérience optimale
            </span>
            <br />
            Accédez rapidement à toutes vos recherches immobilières avec une application native ultra-rapide !
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-3 p-6 pt-2">
          <button
            onClick={handleInstall}
            disabled={isAnimating}
            className={`
              relative w-full sm:flex-1 group overflow-hidden rounded-full px-6 py-4 
              bg-gradient-to-r from-emerald-500 to-blue-500 
              text-white font-bold text-lg shadow-xl
              hover:shadow-2xl hover:scale-105 
              transition-all duration-300 ease-out
              disabled:opacity-70 disabled:cursor-not-allowed
              ${isAnimating ? 'animate-pulse' : ''}
            `}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <span className="relative flex items-center justify-center gap-2">
              {isAnimating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Installation...
                </>
              ) : (
                <>
                  <Download size={20} className="group-hover:animate-bounce" />
                  Installer maintenant
                </>
              )}
            </span>
          </button>
          
          <DialogClose asChild>
            <button onClick={handleClose} className="w-full sm:w-auto px-6 py-4 border-2 border-gray-200 bg-white/80 backdrop-blur text-gray-700 font-semibold text-lg rounded-full hover:bg-gray-50 hover:border-gray-300 hover:scale-105 transition-all duration-300">
              Plus tard
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>

      {/* Styles CSS intégrés */}
      <style jsx global>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Animation pour les gradients */
        @keyframes gradientShift {
          0%, 100% { 
            background-position: 0% 50%; 
          }
          50% { 
            background-position: 100% 50%; 
          }
        }
        
        /* Responsive adjustments */
        @media (max-width: 640px) {
          .dialog-content {
            margin: 1rem;
            width: calc(100vw - 2rem);
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .dialog-content {
            background: rgba(15, 23, 42, 0.95);
            color: white;
          }
        }
      `}</style>
    </Dialog>
  );
}

// Bouton permanent pour la homepage
export function InstallPWAButtonTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold px-6 py-3 rounded-full shadow-xl hover:scale-105 transition-all duration-300"
    >
      Installer l'application
    </button>
  );
}