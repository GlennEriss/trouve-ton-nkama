"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { routes } from '@/constantes/routes';

type RegisterSuccessProps = {
  uid: string;
};

export const RegisterSuccess: React.FC<RegisterSuccessProps> = ({ uid }) => {
  const { toast } = useToast()
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [resendStatus, setResendStatus] = useState(false);
  const [countdown, setCountdown] = useState(0); // État pour le compte à rebours

  // Fetch verification status
  const fetchUserVerificationStatus = async () => {
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsEmailVerified(data.emailVerified);
      } else {
        console.error("Error fetching email status:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch email verification status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    startTransition(async () => {
      const getAuth = () => import("@/firebase/auth");
      const { sendEmailVerification, auth, signOut, signInWithCustomToken } = await getAuth();
      try {
        setResendStatus(true);
        setCountdown(60);

        const response = await fetch("/api/generate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la récupération du token");
        }

        const { token } = await response.json();
        const userCredential = await signInWithCustomToken(auth, token);

        if (userCredential.user) {
          await sendEmailVerification(userCredential.user);
          toast({
            title: "Renvoie de confirmation de l'email",
            description: "Email de confirmation renvoyé avec succès!",
            variant: 'success',
          });
        } else {
          console.error("Utilisateur introuvable.");
        }
      } catch (error) {
        console.error("Erreur lors du renvoi de l'email :", error);
      } finally {
        signOut(auth);
      }
    });
  };

  // Gérer le compte à rebours
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setResendStatus(false);
      if (timer) clearInterval(timer);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  useEffect(() => {
    fetchUserVerificationStatus();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        {loading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4 text-center">
              Inscription réussie !
            </h1>
            <p className="text-gray-600 text-center mb-6">
              {isEmailVerified
                ? "Votre email a été vérifié. Vous pouvez maintenant vous connecter."
                : "Un email de confirmation a été envoyé à votre adresse email. Veuillez vérifier votre boîte de réception."}
            </p>
            <div className="flex flex-col justify-center">

              {!isEmailVerified &&
                <Button
                  onClick={handleResendEmail}
                  disabled={resendStatus || isPending}
                  className={cn(
                    "w-full flex items-center justify-center",
                    (resendStatus || isPending) && "opacity-75"
                  )}
                >
                  {resendStatus ? (
                    `Veuillez patienter... (${countdown}s)`
                  ) : isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 w-5 h-5" />
                      Renvoi en cours...
                    </>
                  ) : (
                    "Renvoyer l'email de confirmation"
                  )}
                </Button>
              }
              <Link
                href={routes.public.signin}
                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline text-center"
              >
                Aller à la page de connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};