"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type PasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
};

export default function PasswordModal({ isOpen, onClose, onConfirm }: Readonly<PasswordModalProps>) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError("Veuillez entrer votre mot de passe.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      onConfirm(password);
      setPassword(""); // Réinitialisation après succès
      onClose();
    } catch (err) {
      console.error("Erreur lors de la confirmation du mot de passe:", err);
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
          <Input
            type="password"
            placeholder="Entrez votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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