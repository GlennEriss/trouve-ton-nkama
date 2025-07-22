"use client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Installer Trouve ton Nkama</DialogTitle>
          <DialogDescription>
            Profitez d'une expérience optimale en installant Trouve ton Nkama sur votre appareil. Vous pourrez accéder à toutes les fonctionnalités comme si c'était une application native !
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={async () => {
              if (!deferredPrompt) return;
              (deferredPrompt as any).prompt();
              setDeferredPrompt(null);
              setOpen(false);
            }}
            className="rounded px-4 py-2 bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition text-base font-semibold"
          >
            Ajouter à l'écran d'accueil
          </button>
          <DialogClose asChild>
            <button className="rounded px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition text-base">
              Plus tard
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
