'use client'
import React, { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, CheckCircle, AlertTriangle, Phone, Clock, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/constantes/routes'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { createNotification } from '@/db/notification.db'
import { updateUser } from '@/db/user.db'
import { getUserByUID } from '@/db/user.db'
import { PhoneNumberForm } from '@/components/forms/PhoneNumberForm'
import { useForm } from 'react-hook-form'
import { Form } from '@/components/ui/form'

export default function VerifyPhonePage() {
    const { user, setUser } = useCurrentUser()
    const { toast } = useToast()
    const [step, setStep] = useState<'phone' | 'otp' | 'success' | 'already-verified'>('phone')
    const [phone, setPhone] = useState(user?.phoneNumbers?.[0] || '')
    const [otp, setOtp] = useState('')
    const [timeLeft, setTimeLeft] = useState(600)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [confirmationResult, setConfirmationResult] = useState<any>(null)
    const [isCheckingVerification, setIsCheckingVerification] = useState(true)

    // Formulaire pour le numéro de téléphone
    const form = useForm({
        defaultValues: {
            phone: user?.phoneNumbers?.[0] || ''
        }
    })

    // Mettre à jour le numéro de téléphone quand l'utilisateur change
    useEffect(() => {
        if (user?.phoneNumbers?.[0]) {
            setPhone(user.phoneNumbers[0]);
            form.setValue('phone', user.phoneNumbers[0]);
        }
    }, [user?.phoneNumbers, form]);

    // Vérifier si le numéro est déjà vérifié
    useEffect(() => {
        const checkPhoneVerificationStatus = async () => {
            if (user?.uid) {
                try {
                    // Récupérer les données les plus récentes depuis Firestore
                    const latestUserData = await getUserByUID(user.uid);
                    if (latestUserData?.phoneNumberVerified && latestUserData?.phoneNumbers?.[0]) {
                        setStep('already-verified');
                        // Mettre à jour l'état local avec les données les plus récentes
                        if (setUser) {
                            setUser(latestUserData);
                        }
                    }
                } catch (error) {
                    console.warn("Erreur lors de la récupération des données utilisateur:", error);
                } finally {
                    setIsCheckingVerification(false);
                }
            } else {
                setIsCheckingVerification(false);
            }
        };

        checkPhoneVerificationStatus();
    }, [user?.uid, setUser]);

    // Timer pour le code OTP
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === "otp" && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        toast({
                            duration: 5000,
                            title: 'Code expiré',
                            description: "Le code OTP a expiré. Veuillez demander un nouveau code.",
                            variant: 'destructive',
                        });
                        setStep("phone");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [step, timeLeft, toast]);



    // Envoi du code OTP
    const handleSendOTP = async () => {
        const phoneValue = form.getValues('phone');
        if (!phoneValue) {
            toast({
                duration: 5000,
                title: 'Numéro manquant',
                description: "Veuillez saisir votre numéro de téléphone.",
                variant: 'destructive',
            });
            return;
        }

        // Vérifier si le numéro a été modifié
        const originalPhone = user?.phoneNumbers?.[0] || '';
        const isPhoneChanged = phoneValue !== originalPhone;

        setLoading(true);
        setError(null);
        
        try {
            const { signInWithPhoneNumber, RecaptchaVerifier } = await import("firebase/auth");
            const { auth } = await import("@/firebase/auth");
            
            // Créer un RecaptchaVerifier
            const recaptchaVerifier = new (RecaptchaVerifier as any)(
                auth,
                "recaptcha-container",
                {
                    size: "normal",
                    callback: () => console.log("reCAPTCHA résolu"),
                    "expired-callback": () => console.log("reCAPTCHA expiré"),
                }
            );
            
            // Rendre le reCAPTCHA
            await recaptchaVerifier.render();
            
            // Attendre un peu pour s'assurer que le reCAPTCHA est prêt
            await new Promise(resolve => setTimeout(resolve, 2000));

            const result = await signInWithPhoneNumber(
                auth,
                phoneValue,
                recaptchaVerifier
            );
            
            setConfirmationResult(result);
            setTimeLeft(600);
            setStep("otp");
            setPhone(phoneValue); // Mettre à jour l'état local
            
            // Message différent selon si le numéro a été modifié
            const message = isPhoneChanged 
                ? "Un code de vérification a été envoyé par SMS pour le nouveau numéro."
                : "Un code de vérification a été envoyé par SMS.";
            
            toast({
                duration: 5000,
                title: 'Code envoyé',
                description: message,
                variant: 'success',
            });
        } catch (err: any) {
            console.error("Erreur OTP:", err);
            let errorMessage = "Erreur lors de l'envoi du code";
            
            if (err.code === 'auth/invalid-phone-number') {
                errorMessage = "Numéro de téléphone invalide";
            } else if (err.code === 'auth/too-many-requests') {
                errorMessage = "Trop de tentatives. Réessayez plus tard.";
            } else if (err.code === 'auth/quota-exceeded') {
                errorMessage = "Quota SMS dépassé. Contactez l'administrateur.";
            } else if (err.message && err.message.includes('Timeout')) {
                errorMessage = "Délai d'attente dépassé. Veuillez réessayer.";
            } else if (err.message && err.message.includes('recaptcha')) {
                errorMessage = "Erreur reCAPTCHA. Veuillez réessayer.";
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };



    // Vérification du code OTP
    const handleVerifyOTP = async () => {
        if (!confirmationResult || !user?.uid) return;
        
        setLoading(true);
        setError(null);
        
        try {
            console.log("Début de la vérification OTP...");
            
            // Vérifier le code OTP
            await confirmationResult.confirm(otp);
            console.log("Code OTP vérifié avec succès");
            
            // Sign out from the temporary Firebase Auth user created by phone auth
            const { signOut } = await import("@/firebase/auth");
            const { auth } = await import("@/firebase/auth");
            await signOut(auth);
            console.log("Déconnexion du compte temporaire Firebase Auth");
            
            // Reconnect with the existing user's custom token to update Firestore
            console.log("Reconnexion avec le token personnalisé...");
            const response = await fetch('/api/generate-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uid: user.uid })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la reconnexion');
            }

            const { token } = await response.json();
            const { signInWithCustomToken } = await import("@/firebase/auth");
            await signInWithCustomToken(auth, token);
            console.log("Reconnexion réussie avec le token personnalisé");
            
            // Vérifier si le numéro a été modifié
            const originalPhone = user?.phoneNumbers?.[0] || '';
            const isPhoneChanged = phone !== originalPhone;
            
            if (isPhoneChanged) {
                // Utiliser updateUser pour la modification de numéro
                console.log("Mise à jour du numéro de téléphone avec updateUser...");
                const updateSuccess = await updateUser(user.uid, {
                    phoneNumbers: [phone],
                    phoneNumberVerified: true
                });
                
                if (!updateSuccess) {
                    throw new Error("Erreur lors de la mise à jour du numéro de téléphone");
                }
                console.log("Numéro de téléphone mis à jour avec updateUser");
            } else {
                // Utiliser la mise à jour directe Firestore pour la première vérification
                console.log("Mise à jour du numéro de téléphone dans Firestore...");
                const userRef = doc(db, 'users', user.uid);
                
                // Vérifier que l'utilisateur existe dans Firestore
                const userDoc = await getDoc(userRef);
                
                if (!userDoc.exists()) {
                    throw new Error("Utilisateur non trouvé dans la base de données");
                }
                
                await updateDoc(userRef, {
                    phoneNumbers: [phone],
                    phoneNumberVerified: true,
                    updatedAt: new Date()
                });
                console.log("Numéro de téléphone mis à jour dans Firestore");
            }
            
            // Mettre à jour l'état local de l'utilisateur
            if (setUser && user) {
                setUser({
                    ...user,
                    phoneNumbers: [phone],
                    phoneNumberVerified: true
                });
            }
            
            // Envoyer une notification pour informer l'utilisateur
            try {
                const notificationMessage = isPhoneChanged 
                    ? `Votre numéro de téléphone a été modifié vers ${phone} et vérifié avec succès.`
                    : `Votre numéro de téléphone ${phone} a été vérifié avec succès et est maintenant actif sur votre compte.`;
                
                await createNotification({
                    title: isPhoneChanged ? 'Numéro de téléphone modifié ✅' : 'Numéro de téléphone vérifié ✅',
                    message: notificationMessage,
                    type: 'SECURITY',
                    createdFor: user.uid,
                    isRead: false,
                    actionUrl: '/profil'
                });
                console.log("Notification envoyée pour la vérification du numéro de téléphone");
            } catch (notificationError) {
                console.warn("Erreur lors de l'envoi de la notification:", notificationError);
                // Ne pas faire échouer le processus si la notification ne peut pas être envoyée
            }
            
            setStep("success");
            
            toast({
                duration: 5000,
                title: isPhoneChanged ? 'Numéro modifié avec succès' : 'Vérification réussie',
                description: isPhoneChanged 
                    ? "Votre numéro de téléphone a été modifié et vérifié avec succès!"
                    : "Votre numéro de téléphone a été vérifié avec succès!",
                variant: 'success',
            });
        } catch (err: any) {
            console.error("Erreur lors de la vérification:", err);
            let errorMessage = "Code incorrect ou expiré";
            
            if (err.code === 'auth/invalid-verification-code') {
                errorMessage = "Code de vérification invalide";
            } else if (err.code === 'auth/code-expired') {
                errorMessage = "Code de vérification expiré";
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6">
            <div className="mb-6">
                <Link href={routes.protected.profil} className="flex items-center text-gray-600 hover:text-gray-800">
                    <ChevronLeft size={20} />
                    <span className="ml-2">Retour au profil</span>
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-6">Vérifier mon numéro de téléphone</h1>

            {/* Container pour reCAPTCHA */}
            <div id="recaptcha-container" />

            {isCheckingVerification && (
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                    <p className="text-gray-600">Vérification du statut du numéro de téléphone...</p>
                </div>
            )}

            {!isCheckingVerification && step === 'phone' && (
                <div className="space-y-4">
                    {user?.phoneNumberVerified && (
                        <div className="mb-4 p-3 bg-yellow-50 rounded text-sm">
                            <p className="font-semibold text-yellow-800 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Information importante :
                            </p>
                            <p className="text-yellow-700">
                                Votre numéro de téléphone est déjà vérifié. Si vous le modifiez, 
                                vous devrez le vérifier à nouveau. Une fois vérifié, le numéro ne pourra plus être modifié.
                            </p>
                        </div>
                    )}
                    <Form {...form}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Numéro de téléphone
                            </label>
                            <PhoneNumberForm
                                form={form}
                                label=''
                                name='phone'
                            />
                            <div className="text-sm text-gray-500 mt-1">
                                <p>Numéro actuel : {user?.phoneNumbers?.[0] || 'Non renseigné'}</p>
                                {user?.phoneNumberVerified && (
                                    <p className="text-green-600 font-medium flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Ce numéro est déjà vérifié
                                    </p>
                                )}
                                {user?.phoneNumbers?.[0] && !user?.phoneNumberVerified && (
                                    <p className="text-orange-600 font-medium flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Ce numéro n'est pas encore vérifié
                                    </p>
                                )}
                            </div>
                        </div>
                    </Form>
                    
                    {error && (
                        <div className="text-red-600 text-sm p-3 bg-red-50 rounded">
                            {error}
                        </div>
                    )}
                    
                    <Button
                        onClick={handleSendOTP}
                        disabled={loading || !form.getValues('phone')}
                        className="w-full bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]"
                    >
                        {loading ? "Envoi en cours..." : "Envoyer le code de vérification"}
                    </Button>
                </div>
            )}

            {!isCheckingVerification && step === 'otp' && (
                <div className="space-y-4">
                    <div className="text-center mb-4">
                        <p className="text-sm text-gray-600">
                            Code envoyé au numéro {phone}
                        </p>
                        <div className="mt-2">
                            <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4" />
                                Code valide pendant :
                            </div>
                            <div className="text-lg font-mono font-bold text-blue-600">
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                    

                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Code de vérification
                        </label>
                        <Input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="Saisissez le code reçu par SMS"
                            className="p-3"
                            maxLength={6}
                        />
                    </div>
                    
                    {error && (
                        <div className="text-red-600 text-sm p-3 bg-red-50 rounded">
                            {error}
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <Button
                            onClick={handleVerifyOTP}
                            disabled={loading || !otp || otp.length < 6}
                            className="flex-1 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]"
                        >
                            {loading ? "Vérification..." : "Vérifier le code"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStep("phone");
                                setOtp("");
                                setTimeLeft(600);
                            }}
                            className="flex-1"
                        >
                            Retour
                        </Button>
                    </div>
                    
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleSendOTP}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Renvoyer le code
                        </button>
                    </div>
                    

                </div>
            )}

            {!isCheckingVerification && step === 'success' && (
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <CheckCircle className="text-green-600 w-16 h-16" />
                    </div>
                    <h2 className="text-xl font-semibold text-green-700">
                        Numéro vérifié avec succès !
                    </h2>
                    <p className="text-gray-600">
                        Votre numéro de téléphone <strong>{phone}</strong> a été vérifié et est maintenant actif sur votre compte.
                    </p>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-700">
                            <strong>Statut mis à jour :</strong> phoneNumberVerified = true
                        </p>
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Une notification a été envoyée pour confirmer cette modification.
                        </p>
                    </div>
                    <Link href={routes.protected.profil}>
                        <Button className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]">
                            Retour au profil
                        </Button>
                    </Link>
                </div>
            )}

            {!isCheckingVerification && step === 'already-verified' && (
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <CheckCircle className="text-green-600 w-16 h-16" />
                    </div>
                    <h2 className="text-xl font-semibold text-green-700">
                        Numéro déjà vérifié !
                    </h2>
                    <p className="text-gray-600">
                        Votre numéro de téléphone <strong>{phone}</strong> est déjà vérifié.
                    </p>
                    <Link href={routes.protected.profil}>
                        <Button className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67]">
                            Retour au profil
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    )
} 