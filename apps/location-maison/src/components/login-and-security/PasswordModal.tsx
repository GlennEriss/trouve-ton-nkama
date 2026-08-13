"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@trouve-ton-nkama/ui/dialog";
import { Button } from "@trouve-ton-nkama/ui/button";
import { Input } from "@trouve-ton-nkama/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { createLogger } from '@/lib/logger';

const logger = createLogger('components.password-modal');

type PasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void | Promise<void>;
};

export default function PasswordModal({ isOpen, onClose, onConfirm }: Readonly<PasswordModalProps>) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError("Veuillez entrer votre mot de passe.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onConfirm(password);
      setPassword(""); // Réinitialisation après succès
      onClose();
    } catch (err) {
      logger.error('Erreur lors de la confirmation du mot de passe', { err });
      setError("Échec de la vérification. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmez votre mot de passe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Pour lier un compte supplémentaire, veuillez entrer votre mot de passe pour vérification.
          </p>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Entrez votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
