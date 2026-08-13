'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@trouve-ton-nkama/ui/card';
import { Button } from '@trouve-ton-nkama/ui/button';
import { Input } from '@trouve-ton-nkama/ui/input';
import { Label } from '@trouve-ton-nkama/ui/label';
import { Alert, AlertDescription } from '@trouve-ton-nkama/ui/alert';
import { Clock, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function EmailVerificationExpiredPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResendEmail = () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Veuillez entrer votre adresse email' });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            subject: 'Nouveau lien de vérification - Trouve Ton Nkama',
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setMessage({ 
            type: 'success', 
            text: 'Un nouveau lien de vérification a été envoyé à votre adresse email !' 
          });
          setEmail('');
        } else {
          setMessage({ 
            type: 'error', 
            text: data.error || 'Erreur lors de l\'envoi du nouveau lien' 
          });
        }
      } catch (error) {
        setMessage({ 
          type: 'error', 
          text: 'Erreur de connexion. Veuillez réessayer.' 
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-red-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-800">
            Lien expiré
          </CardTitle>
          <CardDescription className="text-red-600">
            Votre lien de vérification d'email a expiré
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Lien expiré :</strong> Pour votre sécurité, les liens de vérification 
              expirent après 24 heures. Demandez un nouveau lien ci-dessous.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Votre adresse email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              disabled={isPending}
            />
          </div>

          {message && (
            <Alert className={`border-2 ${
              message.type === 'success' 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              <AlertDescription className={`${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button
            onClick={handleResendEmail}
            disabled={isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Envoyer un nouveau lien
              </>
            )}
          </Button>

          <div className="text-center text-sm text-gray-600">
            <Link 
              href="/signin" 
              className="text-red-600 hover:text-red-700 font-medium hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 