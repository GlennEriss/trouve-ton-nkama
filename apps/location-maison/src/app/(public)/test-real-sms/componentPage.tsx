"use client"
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Phone, MessageSquare, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Clock } from "lucide-react";
import { auth } from "@/firebase/auth";
import { createLogger } from '@/lib/logger';

const logger = createLogger('app.test-real-sms');

const TestRealSmsPage: React.FC = () => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "success">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes en secondes
  const [testResults, setTestResults] = useState<any[]>([]);
  const confirmationResult = useRef<any>(null);

  // Numéros de test Firebase
  const testNumbers = [
    { number: "+1 650-555-1234", code: "123456", description: "Test principal" },
    { number: "+1 650-555-0000", code: "000000", description: "Test zéro" },
    { number: "+1 650-555-9999", code: "999999", description: "Test neuf" },
    { number: "+24101234567", code: "123456", description: "Test Gabon" },
    { number: "+24101234568", code: "654321", description: "Test Gabon 2" },
  ];

  // Timer pour le code OTP
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setError("Code OTP expiré. Veuillez demander un nouveau code.");
            setStep("phone");
            addTestResult({
              type: "TIMEOUT",
              success: false,
              message: "Code OTP expiré",
              timestamp: new Date()
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const addTestResult = (result: any) => {
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Garder les 10 derniers
  };

  // Envoi du code OTP
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTimeLeft(600); // Reset timer

    addTestResult({
      type: "SEND_OTP",
      success: true,
      message: `Envoi du code OTP au ${phone}`,
      timestamp: new Date()
    });

    try {
      const { signInWithPhoneNumber, RecaptchaVerifier } = await import("firebase/auth");
      
      // Vérifier que Firebase est initialisé
      if (!auth) {
        throw new Error("Firebase Auth non initialisé");
      }
      
      // Créer un vrai RecaptchaVerifier
      const recaptchaVerifier = new (RecaptchaVerifier as any)(
        auth,
        "recaptcha-container",
        {
          size: "normal", // Changé de "invisible" à "normal"
          callback: () => {
            logger.info('reCAPTCHA résolu');
            addTestResult({
              type: "RECAPTCHA",
              success: true,
              message: "reCAPTCHA résolu avec succès",
              timestamp: new Date()
            });
          },
          "expired-callback": () => {
            logger.warn('reCAPTCHA expiré');
            addTestResult({
              type: "RECAPTCHA",
              success: false,
              message: "reCAPTCHA expiré",
              timestamp: new Date()
            });
          },
        }
      );
      
      // Rendre le reCAPTCHA
      await recaptchaVerifier.render();
      
      // Attendre un peu pour s'assurer que le reCAPTCHA est prêt
      await new Promise(resolve => setTimeout(resolve, 2000));

      confirmationResult.current = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaVerifier
      );

      setStep("otp");
      
      addTestResult({
        type: "SEND_OTP",
        success: true,
        message: `Code OTP envoyé avec succès au ${phone}`,
        details: { verificationId: confirmationResult.current.verificationId },
        timestamp: new Date()
      });

      toast({
        title: 'Code envoyé',
        description: `Un code de vérification a été envoyé au ${phone}`,
        variant: 'success',
      });

    } catch (err: any) {
      logger.error('Erreur OTP', { err });
      let errorMessage = "Erreur lors de l'envoi du code";
      
      // Gestion spécifique des erreurs Firebase
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = "Numéro de téléphone invalide";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Trop de tentatives. Réessayez plus tard.";
      } else if (err.code === 'auth/quota-exceeded') {
        errorMessage = "Quota SMS dépassé. Contactez l'administrateur.";
      } else if (err.code === 'auth/invalid-verification-code') {
        errorMessage = "Code incorrect ou expiré";
      } else if (err.code === 'auth/invalid-app-credential') {
        errorMessage = "Configuration incorrecte. Veuillez réessayer dans quelques instants.";
      } else if (err.message && err.message.includes('Timeout')) {
        errorMessage = "Délai d'attente dépassé. Veuillez réessayer.";
      } else if (err.message && err.message.includes('recaptcha')) {
        errorMessage = "Erreur de sécurité. Veuillez réessayer.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      addTestResult({
        type: "SEND_OTP",
        success: false,
        message: `Erreur envoi: ${errorMessage}`,
        details: { code: err.code, message: err.message },
        timestamp: new Date()
      });

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Vérification du code OTP
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    addTestResult({
      type: "VERIFY_OTP",
      success: true,
      message: `Vérification du code OTP pour ${phone}`,
      timestamp: new Date()
    });

    try {
      if (!confirmationResult.current) throw new Error("Aucune demande d'OTP en cours");
      
      const result = await confirmationResult.current.confirm(otp);
      
      setStep("success");
      
      addTestResult({
        type: "VERIFY_OTP",
        success: true,
        message: `Code vérifié avec succès pour ${result.user.phoneNumber}`,
        details: { 
          uid: result.user.uid,
          phoneNumber: result.user.phoneNumber 
        },
        timestamp: new Date()
      });

      toast({
        title: 'Code vérifié',
        description: 'Le code OTP a été vérifié avec succès',
        variant: 'success',
      });

    } catch (err: any) {
      logger.error('Erreur vérification OTP', { err });
      
      let errorMessage = "Code incorrect ou expiré";
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = "Code de vérification invalide";
      } else if (err.code === 'auth/code-expired') {
        errorMessage = "Code de vérification expiré";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      addTestResult({
        type: "VERIFY_OTP",
        success: false,
        message: `Erreur vérification: ${errorMessage}`,
        details: { code: err.code, message: err.message },
        timestamp: new Date()
      });

      toast({
        title: 'Erreur vérification',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Réinitialiser le test
  const resetTest = () => {
    setStep("phone");
    setPhone("");
    setOtp("");
    setError(null);
    setTimeLeft(600);
    confirmationResult.current = null;
    setTestResults([]);
  };

  // Utiliser un numéro de test
  const useTestNumber = (testNumber: any) => {
    setPhone(testNumber.number);
    setOtp(testNumber.code);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test SMS Réel - Vérification de téléphone</h1>
        <p className="text-gray-600 mb-6">
            Test de vérification des numéros de téléphone avec authentification par SMS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Vérification SMS
            </CardTitle>
            <CardDescription>
              Testez l'envoi et la vérification de codes OTP
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium">Numéro de téléphone (format international)</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="ex: +241XXXXXXXX"
                    required
                    className="font-mono"
                  />
                </div>
                
                <div id="recaptcha-container" className="flex justify-center" />
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  </div>
                )}
                
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Envoyer le code
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Code valide pendant :</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-blue-600">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Code reçu par SMS</label>
                  <Input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Code OTP"
                    required
                    className="font-mono text-center text-lg"
                  />
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  </div>
                )}
                
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Vérifier le code
                    </>
                  )}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setTimeLeft(600);
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Demander un nouveau code
                  </button>
                </div>
              </form>
            )}

            {step === "success" && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <div className="text-green-700 font-semibold text-lg">
                  ✅ Connexion réussie avec le numéro {phone}
                </div>
                <Button onClick={resetTest} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nouveau test
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Numéros de test et résultats */}
        <div className="space-y-6">
          {/* Numéros de test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Numéros de Test Firebase
              </CardTitle>
              <CardDescription>
                Utilisez ces numéros pour tester sans facturation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testNumbers.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{test.number}</div>
                      <div className="text-sm text-gray-500">Code: {test.code}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => useTestNumber(test)}
                    >
                      Utiliser
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Résultats des tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Résultats des Tests
              </CardTitle>
              <CardDescription>
                Historique des opérations récentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Aucun test effectué
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 border rounded">
                      <div className="flex-shrink-0 mt-1">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {result.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{result.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Informations de configuration */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Configuration Requise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Configuration requise</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Variables d'environnement configurées</li>
                  <li>• Service SMS activé</li>
                  <li>• Protection de sécurité configurée</li>
                  <li>• Autres paramètres système</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Variables d'Environnement</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• NEXT_PUBLIC_FIREBASE_API_KEY</li>
                <li>• NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
                <li>• NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                <li>• Autres variables Firebase</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestRealSmsPage; 
