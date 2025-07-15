'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { routes } from '@/constantes/routes'
import Logo from '@/components/logo/Logo'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { ButtonLoading } from '@/components/buttons/ButtonLoading'
import { Mail, Lock } from 'lucide-react'

const passwordResetSchema = z.object({
  email: z.string().email('Veuillez entrer une adresse email valide')
})

type PasswordResetForm = z.infer<typeof passwordResetSchema>

const PasswordResetRequest: React.FC = () => {
  const { toast } = useToast()
  const [isPending, startTransition] = React.useTransition()
  const [isEmailSent, setIsEmailSent] = React.useState(false)
  const [isRateLimited, setIsRateLimited] = React.useState(false)
  const [countdown, setCountdown] = React.useState(0)

  const form = useForm<PasswordResetForm>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: ''
    }
  })

  // Effet pour gérer le countdown
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsRateLimited(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [countdown])

  const onSubmit = async (values: PasswordResetForm) => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/send-password-reset-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: values.email,
            subject: 'Réinitialisez votre mot de passe - Trouve Ton Nkama',
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setIsEmailSent(true)
          toast({
            duration: 5000,
            title: 'Email envoyé !',
            description: `Un lien de réinitialisation a été envoyé à ${values.email}`,
            variant: 'success',
          })
        } else {
          // Gestion spécifique de l'erreur de limite de débit
          if (response.status === 429 && data.code === 'RATE_LIMIT_EXCEEDED') {
            const retryAfter = data.retryAfter || 300 // 5 minutes par défaut
            setIsRateLimited(true)
            setCountdown(retryAfter)
            toast({
              duration: 8000,
              title: 'Trop de tentatives',
              description: `Vous avez fait trop de demandes. Veuillez attendre ${Math.ceil(retryAfter / 60)} minutes avant de réessayer.`,
              variant: 'destructive',
            })
            return
          }

          // Gestion des autres erreurs spécifiques
          let errorMessage = data.error || 'Erreur lors de l\'envoi de l\'email'
          let errorTitle = 'Erreur'

          if (response.status === 404) {
            errorTitle = 'Compte non trouvé'
            errorMessage = 'Aucun compte n\'est associé à cette adresse email.'
          } else if (response.status === 403) {
            errorTitle = 'Compte désactivé'
            errorMessage = 'Ce compte a été désactivé. Veuillez contacter le support.'
          } else if (response.status === 503) {
            errorTitle = 'Service indisponible'
            errorMessage = 'Le service est temporairement indisponible. Veuillez réessayer dans quelques minutes.'
          }

          toast({
            duration: 7000,
            title: errorTitle,
            description: errorMessage,
            variant: 'destructive',
          })
        }
      } catch (error: any) {
        toast({
          duration: 5000,
          title: 'Erreur de connexion',
          description: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
          variant: 'destructive',
        })
      }
    })
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center py-5">
        <div className="w-full max-w-lg mx-4 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg overflow-hidden">
          
          {/* Header avec gradient */}
          <div className="bg-gradient-to-br from-[#146B67] via-[#1FA89B] to-[#146B67] text-white p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Link href={routes.public.homePage}>
                <Logo color='white' />
              </Link>
              <h1 className="text-2xl font-bold ml-3">
                Trouve Ton Nkama
              </h1>
            </div>
            <div className="text-5xl mb-4">
              <Mail className="w-16 h-16 mx-auto text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              Email envoyé !
            </h2>
          </div>

          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Nous avons envoyé un lien de réinitialisation à votre adresse email. 
              Consultez votre boîte de réception et suivez les instructions.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                N'oubliez pas de vérifier votre dossier spam si vous ne voyez pas l'email.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href={routes.public.signin}>
                <Button className="w-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#0f5853] hover:to-[#1a9688] text-white">
                  Retour à la connexion
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                onClick={() => setIsEmailSent(false)}
                className="w-full border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white"
              >
                Renvoyer l'email
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center py-5">
      {/* Container */}
      <div className="w-full max-w-lg mx-4 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg overflow-hidden">
        
        {/* Header avec gradient */}
        <div className="bg-gradient-to-br from-[#146B67] via-[#1FA89B] to-[#146B67] text-white p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Link href={routes.public.homePage}>
              <Logo color='white' />
            </Link>
            <h1 className="text-2xl font-bold ml-3">
              Trouve Ton Nkama
            </h1>
          </div>
          <div className="text-5xl mb-4">
            <Lock className="w-16 h-16 mx-auto text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            Réinitialiser votre mot de passe
          </h2>
          <p className="opacity-90">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {/* Formulaire */}
        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">
                      Adresse email
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="votre@email.com"
                        type="email"
                        className="h-12 border-gray-300 dark:border-gray-600 focus:border-[#146B67] focus:ring-[#146B67]"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  Assurez-vous que cette adresse email est associée à votre compte Trouve Ton Nkama.
                </p>
              </div>

              {/* Message de limitation de débit */}
              {isRateLimited && countdown > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                        <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                        Trop de tentatives détectées
                      </p>
                      <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                        Veuillez attendre encore {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')} avant de réessayer
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ButtonLoading
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#0f5853] hover:to-[#1a9688] text-white font-semibold rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPending || isRateLimited}
              >
                {isRateLimited 
                  ? `Attendre ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
                  : 'Envoyer le lien de réinitialisation'
                }
              </ButtonLoading>
            </form>
          </Form>

          {/* Liens utiles */}
          <div className="mt-6 text-center space-y-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Vous vous souvenez de votre mot de passe ?
            </div>
            
            <Link href={routes.public.signin}>
              <Button variant="outline" className="w-full border-[#146B67] text-[#146B67] hover:bg-[#146B67] hover:text-white">
                Retour à la connexion
              </Button>
            </Link>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Besoin d'aide ? Contactez notre support à{' '}
                <a href="mailto:support@tonnkama.com" className="text-[#146B67] hover:text-[#1FA89B] font-medium">
                  support@tonnkama.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PasswordResetRequest 