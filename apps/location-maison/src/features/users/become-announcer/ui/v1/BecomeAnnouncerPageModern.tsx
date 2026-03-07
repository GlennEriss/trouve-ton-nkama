'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { routes } from '@/constantes/routes';
import { useBecomeAnnouncer } from '@/features/users/become-announcer/hooks';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, ChevronLeft, FileBadge, ShieldCheck } from 'lucide-react';

const logger = createLogger('users.become-announcer.ui');

function mergeRoles(currentRoles: unknown, nextRoles: unknown): string[] {
  const merged = new Set<string>();
  if (Array.isArray(currentRoles)) {
    for (const role of currentRoles) {
      if (typeof role === 'string') {
        merged.add(role);
      }
    }
  }
  if (Array.isArray(nextRoles)) {
    for (const role of nextRoles) {
      if (typeof role === 'string') {
        merged.add(role);
      }
    }
  }
  return Array.from(merged);
}

export function BecomeAnnouncerPageModern() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, setUser } = useCurrentUser();
  const { becomeAnnouncer, isLoading, lastError, clearError } = useBecomeAnnouncer();
  const [acceptAnnouncerTerms, setAcceptAnnouncerTerms] = useState(false);

  const isAlreadyAnnouncer = useMemo(
    () => Array.isArray(user?.roles) && user.roles.includes('Announcer'),
    [user?.roles]
  );

  useEffect(() => {
    if (!lastError) {
      return;
    }

    toast({
      title: lastError.title,
      description: lastError.message,
      duration: lastError.duration,
      variant: 'destructive',
    });
    clearError();
  }, [clearError, lastError, toast]);

  const handleSubmit = async () => {
    logger.info('Become announcer action requested from UI', {
      uid: user?.uid,
      alreadyAnnouncer: isAlreadyAnnouncer,
    });

    const result = await becomeAnnouncer({
      acceptAnnouncerTerms,
      source: 'profile',
    });

    if (!result.success) {
      return;
    }

    if (setUser && user) {
      setUser({
        ...user,
        roles: mergeRoles(user.roles, result.roles),
        metadata: {
          ...(user.metadata ?? {}),
          ...(result.metadata ?? {}),
        },
      });
    }

    if (result.code === 'ALREADY_ANNOUNCER') {
      toast({
        title: 'Compte déjà annonceur',
        description: 'Votre compte possède déjà le rôle annonceur.',
        duration: 5000,
        variant: 'success',
      });
      router.push(routes.protected.add_property);
      return;
    }

    toast({
      title: 'Rôle annonceur activé',
      description: 'Votre compte peut maintenant publier des annonces.',
      duration: 5000,
      variant: 'success',
    });
    router.push(routes.protected.add_property);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-3 md:pb-10 md:pt-6">
      <Link
        href={routes.protected.profil}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        <ChevronLeft size={18} />
        Retour au profil
      </Link>

      <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devenir annonceur</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Activez le rôle annonceur pour publier vos biens tout en conservant vos droits utilisateur.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <Briefcase className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Publier des annonces
            </p>
            <p className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-200/80">
              Accédez aux écrans de création de biens.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <ShieldCheck className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            <p className="mt-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
              RBAC cohérent
            </p>
            <p className="mt-1 text-xs text-blue-700/90 dark:text-blue-200/80">
              Vous gardez toutes vos fonctionnalités actuelles et débloquez la publication d'annonces.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <FileBadge className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              Conditions annonceur
            </p>
            <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-200/80">
              Validation obligatoire avant activation.
            </p>
          </div>
        </div>

        {isAlreadyAnnouncer && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Compte déjà annonceur
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
              Vous pouvez déjà publier des annonces.
            </p>
          </div>
        )}

        {!isAlreadyAnnouncer && (
          <div className="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <Checkbox
                id="accept-announcer-terms"
                checked={acceptAnnouncerTerms}
                onCheckedChange={(checked) => setAcceptAnnouncerTerms(Boolean(checked))}
                className="mt-0.5 data-[state=checked]:bg-[#1FA89B] data-[state=checked]:border-[#1FA89B]"
                disabled={isLoading}
              />
              <Label htmlFor="accept-announcer-terms" className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                J&apos;accepte les{' '}
                <Link href={routes.public.announcer_terms} className="font-medium text-[#146B67] hover:underline">
                  conditions annonceur
                </Link>{' '}
                et je confirme vouloir activer mon compte annonceur.
              </Label>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (!isAlreadyAnnouncer && !acceptAnnouncerTerms)}
            className="h-12 bg-gradient-to-r from-[#146B67] to-[#1FA89B] px-6 hover:from-[#115b57] hover:to-[#1b9488]"
          >
            {isLoading ? 'Activation en cours...' : isAlreadyAnnouncer ? 'Continuer' : 'Activer le mode annonceur'}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push(routes.protected.profil)}
            className="h-12"
            disabled={isLoading}
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
