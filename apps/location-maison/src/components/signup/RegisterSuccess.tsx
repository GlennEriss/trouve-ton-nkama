"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@trouve-ton-nkama/ui/button";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { routes } from '@/constantes/routes';
import { createLogger } from '@/lib/logger';

const logger = createLogger('components.signup.register-success');

type RegisterSuccessProps = {
  uid: string;
};

export const RegisterSuccess: React.FC<RegisterSuccessProps> = ({ uid }) => {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition();
  const [resendStatus, setResendStatus] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  // Fonction pour vérifier manuellement le statut
  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      const data = await response.json();
      if (response.ok) {
        setEmailVerified(data.emailVerified);
        if (data.emailVerified) {
          toast({
            duration: 5000,
            title: "Email vérifié !",
            description: "Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter.",
            variant: 'success',
          });
        }
      } else {
        logger.warn('Error checking email status', { error: data?.error });
      }
    } catch (error) {
      logger.error('Failed to check email verification status', { error });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResendEmail = () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: uid,
          }),
        });
        
        if (response.ok) {
          toast({
            duration: 5000,
            title: "Email renvoyé",
            description: "Un nouvel email de vérification a été envoyé !",
            variant: 'success',
          });
          setResendStatus(true);
          setCountdown(60);
          
          // Countdown timer
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                setResendStatus(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          throw new Error('Erreur lors du renvoi');
        }
      } catch (error) {
        toast({
          duration: 5000,
          title: "Erreur",
          description: "Impossible de renvoyer l'email. Réessayez plus tard.",
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Inscription réussie !
          </h1>
          <p className="text-gray-600">
            Un email de confirmation a été envoyé à votre adresse email. 
            Cliquez sur le lien dans l'email pour activer votre compte.
          </p>
        </div>

        {/* Statut de vérification */}
        {emailVerified !== null && (
          <div className={cn(
            "p-4 rounded-lg mb-4",
            emailVerified ? "bg-green-50 border border-green-200" : "bg-orange-50 border border-orange-200"
          )}>
            <p className={cn(
              "text-sm font-medium",
              emailVerified ? "text-green-800" : "text-orange-800"
            )}>
              {emailVerified 
                ? "✅ Votre email a été vérifié ! Vous pouvez maintenant vous connecter."
                : "⏳ Votre email n'est pas encore vérifié. Vérifiez votre boîte de réception."
              }
            </p>
          </div>
        )}

        <div className="space-y-3">
          {/* Bouton vérifier le statut */}
          <Button
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
            variant="outline"
            className="w-full"
          >
            {isCheckingStatus ? (
              <>
                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                Vérification...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 w-4 h-4" />
                Vérifier le statut
              </>
            )}
          </Button>

          {/* Bouton renvoyer email */}
          <Button
            onClick={handleResendEmail}
            disabled={resendStatus || isPending}
            variant="outline"
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                Renvoi en cours...
              </>
            ) : resendStatus ? (
              `Renvoyer dans ${countdown}s`
            ) : (
              <>
                <Mail className="mr-2 w-4 h-4" />
                Renvoyer l'email
              </>
            )}
          </Button>

          {/* Lien vers connexion */}
          <div className="text-center pt-4">
            <Link
              href={routes.public.signin}
              className="text-blue-600 hover:underline text-sm"
            >
              Aller à la page de connexion
            </Link>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Instructions :</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Vérifiez votre boîte de réception (et spam)</li>
            <li>• Cliquez sur le lien dans l'email</li>
            <li>• Revenez ici pour vous connecter</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
