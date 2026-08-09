'use client';

import Link from 'next/link';
import { routes } from '@/constantes/routes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SearchWithAIAccessNoticeDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export default function SearchWithAIAccessNoticeDialog({
  open,
  onOpenChange,
}: SearchWithAIAccessNoticeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Recherche IA réservée aux membres</DialogTitle>
          <DialogDescription className="text-gray-600 leading-relaxed">
            Cette fonctionnalité est disponible après création de compte ou connexion.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Plus tard
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10"
          >
            <Link href={routes.public.signin}>Se connecter</Link>
          </Button>
          <Button
            type="button"
            asChild
            className="w-full sm:w-auto bg-primary hover:bg-primary text-white"
          >
            <Link href={routes.public.signup}>Créer un compte</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
