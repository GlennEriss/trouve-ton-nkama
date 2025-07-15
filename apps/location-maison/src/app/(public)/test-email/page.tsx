'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, CheckCircle, AlertCircle, Clock, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TestResult {
  success: boolean
  message: string
  details?: {
    from: string
    to: string
    subject: string
    templateType: string
    timestamp: string
  }
  testLink?: string
  htmlPreview?: string
  error?: string
}

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [templateType, setTemplateType] = useState('generic')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une adresse email',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          templateType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        toast({
          title: 'Email envoyé !',
          description: `Email de test envoyé à ${email}`,
          variant: 'default',
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Erreur inconnue',
          error: data.details
        })
        toast({
          title: 'Erreur',
          description: data.error || 'Erreur lors de l\'envoi',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Erreur de connexion',
        error: error.message
      })
      toast({
        title: 'Erreur de connexion',
        description: 'Impossible de se connecter au serveur',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copié !',
      description: 'Texte copié dans le presse-papiers',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Test d'Envoi d'Emails
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Testez vos templates d'emails et vérifiez l'affichage du logo
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulaire de test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Envoyer un Email de Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Adresse Email
                  </label>
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type de Template
                  </label>
                  <Select 
                    value={templateType} 
                    onValueChange={setTemplateType}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generic">
                        📧 Email générique (test du layout)
                      </SelectItem>
                      <SelectItem value="reset">
                        🔐 Réinitialisation de mot de passe
                      </SelectItem>
                      <SelectItem value="verification">
                        ✉️ Vérification d'email
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer l'Email de Test
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Résultats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result?.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : result && !result.success ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400" />
                )}
                Résultats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun test effectué pour le moment</p>
                </div>
              ) : result.success ? (
                <div className="space-y-4">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Succès
                  </Badge>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {result.message}
                  </p>

                  {result.details && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                      <h4 className="font-medium mb-2">Détails de l'envoi:</h4>
                      <div className="text-sm space-y-1">
                        <div><strong>De:</strong> {result.details.from}</div>
                        <div><strong>À:</strong> {result.details.to}</div>
                        <div><strong>Sujet:</strong> {result.details.subject}</div>
                        <div><strong>Template:</strong> {result.details.templateType}</div>
                        <div><strong>Horodatage:</strong> {new Date(result.details.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {result.testLink && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Lien de test:</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(result.testLink!)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copier
                        </Button>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 break-all">
                        {result.testLink}
                      </p>
                    </div>
                  )}

                  {result.htmlPreview && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-2">Aperçu HTML:</h4>
                      <code className="text-xs bg-white dark:bg-gray-800 p-2 rounded block overflow-x-auto">
                        {result.htmlPreview}
                      </code>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Badge variant="destructive">
                    Erreur
                  </Badge>
                  
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {result.message}
                  </p>

                  {result.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-2">Détails de l'erreur:</h4>
                      <code className="text-xs text-red-700 dark:text-red-300">
                        {result.error}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">🎯 Objectif</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Cette page permet de tester l'envoi d'emails et de vérifier que :
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
                  <li>• Les emails sont bien envoyés</li>
                  <li>• Le logo s'affiche correctement</li>
                  <li>• Les templates sont bien formatés</li>
                  <li>• Les liens fonctionnent</li>
                  <li>• Le layout général est correct</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">💡 Conseils</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Utilisez votre vraie adresse email</li>
                  <li>• Vérifiez les spams si besoin</li>
                  <li>• Testez les 3 types de templates</li>
                  <li>• Commencez par "générique" pour tester le layout</li>
                  <li>• Vérifiez l'affichage sur mobile</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 