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
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, CheckCircle, Key } from 'lucide-react'

const passwordResetSchema = z.object({
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type PasswordResetForm = z.infer<typeof passwordResetSchema>

const PasswordReset: React.FC = () => {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = React.useTransition()
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)

  const token = searchParams.get('token')

  const form = useForm<PasswordResetForm>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  })

  // Vérifier si le token est présent au chargement
  React.useEffect(() => {
    if (!token) {
      router.push(routes.public.passwordResetFailure)
    }
  }, [token, router])

  const onSubmit = async (values: PasswordResetForm) => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/password-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newPassword: values.password,
            oobCode: token,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setIsSuccess(true)
          toast({
            duration: 5000,
            title: 'Mot de passe modifié !',
            description: 'Votre nouveau mot de passe a été enregistré avec succès.',
            variant: 'success',
          })
        } else {
          throw new Error(data.error || 'Erreur lors de la réinitialisation du mot de passe')
        }
      } catch (error: any) {
        toast({
          duration: 5000,
          title: 'Erreur',
          description: error.message || 'Une erreur est survenue. Veuillez réessayer.',
          variant: 'destructive',
        })
        
        // Si le token est invalide ou expiré, rediriger vers la page d'échec
        if (error.message.includes('expiré') || error.message.includes('invalide')) {
          router.push(routes.public.passwordResetFailure)
        }
      }
    })
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const getStrengthColor = (strength: number) => {
    if (strength <= 2) return 'bg-red-500'
    if (strength <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthText = (strength: number) => {
    if (strength <= 2) return 'Faible'
    if (strength <= 3) return 'Moyen'
    return 'Fort'
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center items-center py-5">
        <div className="w-full max-w-lg mx-4 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg overflow-hidden">
          
          {/* Header avec gradient */}
          <div className="bg-gradient-to-br from-green-600 via-green-500 to-green-600 text-white p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Link href={routes.public.homePage}>
                <Logo color='white' />
              </Link>
              <h1 className="text-2xl font-bold ml-3">
                Trouve Ton Nkama
              </h1>
            </div>
            <div className="text-6xl mb-4">
            <CheckCircle className="w-16 h-16 mx-auto text-white" />
          </div>
            <h2 className="text-2xl font-bold mb-2">
              Succès !
            </h2>
            <p className="text-lg opacity-90">
              Votre mot de passe a été modifié
            </p>
          </div>

          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Votre nouveau mot de passe a été enregistré avec succès. 
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <p className="text-green-700 dark:text-green-300 text-sm">
                Pour votre sécurité, vous devrez vous reconnecter sur tous vos appareils.
              </p>
            </div>

            <Link href={routes.public.signin}>
              <Button className="w-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#0f5853] hover:to-[#1a9688] text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg">
                Se connecter
              </Button>
            </Link>
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
            <Key className="w-16 h-16 mx-auto text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            Nouveau mot de passe
          </h2>
          <p className="opacity-90">
            Choisissez un mot de passe sécurisé
          </p>
        </div>

        {/* Formulaire */}
        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">
                      Nouveau mot de passe
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Entrez votre nouveau mot de passe"
                          type={showPassword ? "text" : "password"}
                          className="h-12 border-gray-300 dark:border-gray-600 focus:border-[#146B67] focus:ring-[#146B67] pr-12"
                          {...field}
                          disabled={isPending}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    
                    {/* Indicateur de force du mot de passe */}
                    {field.value && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${getStrengthColor(getPasswordStrength(field.value))}`}
                              style={{ width: `${(getPasswordStrength(field.value) / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {getStrengthText(getPasswordStrength(field.value))}
                          </span>
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">
                      Confirmer le mot de passe
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Confirmez votre nouveau mot de passe"
                          type={showConfirmPassword ? "text" : "password"}
                          className="h-12 border-gray-300 dark:border-gray-600 focus:border-[#146B67] focus:ring-[#146B67] pr-12"
                          {...field}
                          disabled={isPending}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Critères de sécurité */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Critères de sécurité
                </h3>
                <ul className="text-blue-600 dark:text-blue-400 space-y-1 text-sm">
                  <li className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${form.watch('password')?.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Au moins 8 caractères
                  </li>
                  <li className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(form.watch('password') || '') ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Une majuscule
                  </li>
                  <li className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(form.watch('password') || '') ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Une minuscule
                  </li>
                  <li className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${/[0-9]/.test(form.watch('password') || '') ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Un chiffre
                  </li>
                </ul>
              </div>

              <ButtonLoading
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#0f5853] hover:to-[#1a9688] text-white font-semibold rounded-lg transition-all duration-200 shadow-lg"
                disabled={isPending}
              >
                Modifier mon mot de passe
              </ButtonLoading>
            </form>
          </Form>

          {/* Conseils de sécurité */}
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">
              Conseils de sécurité
            </h3>
            <ul className="text-yellow-600 dark:text-yellow-400 space-y-1 text-sm">
              <li>• N'utilisez pas d'informations personnelles</li>
              <li>• Choisissez un mot de passe unique</li>
              <li>• Conservez-le en lieu sûr</li>
              <li>• Ne le partagez jamais</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PasswordReset 