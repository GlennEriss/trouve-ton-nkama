'use client'

import React, { useState, useEffect } from 'react';
import { Wand2, X, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useAIAssistant from '@/hooks/useAIAssistant';
import usePropertyType from '@/hooks/usePropertyType';
import AIPromptsService from '@/services/ai-prompts.service';
import { TypePropertyEnum } from '@/constantes/property-type';

interface FlatBotAssistantProps {
    formContext?: any;
}

// Mapping des types de propriété pour le localStorage en utilisant TypePropertyEnum
const PROPERTY_TYPE_MAPPING: Record<string, string> = Object.entries(TypePropertyEnum).reduce(
    (acc, [key, value]) => ({
        ...acc,
        [value]: key.toUpperCase()
    }),
    {}
);

// Fonction pour sauvegarder dans le localStorage avec la structure correcte
const saveFormToLocalStorage = (data: any) => {
    if (typeof window !== 'undefined') {
        try {
            // On crée une copie des données sans les images
            const { images, ...dataWithoutImages } = data;

            // Vérification que les données sont valides
            if (!dataWithoutImages || typeof dataWithoutImages !== 'object') {
                console.error('Données invalides pour le localStorage');
                return;
            }

            // Suppression explicite de l'ancienne donnée avant de sauvegarder
            localStorage.removeItem('property_form_draft');

            // Sauvegarde des nouvelles données
            localStorage.setItem('property_form_draft', JSON.stringify(dataWithoutImages));

            // Vérification que les données ont bien été sauvegardées
            const savedData = localStorage.getItem('property_form_draft');
            if (!savedData) {
                throw new Error('Échec de la sauvegarde dans le localStorage');
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde dans le localStorage:', error);
            throw error;
        }
    }
};

const FlatBotAssistant: React.FC<FlatBotAssistantProps> = ({ formContext }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
    const [isWelcomeMessageFading, setIsWelcomeMessageFading] = useState(false);
    const [typedText, setTypedText] = useState('');
    const [eyesOpen, setEyesOpen] = useState(true);
    const [expression, setExpression] = useState('smile'); // smile, happy, thinking, talking
    const [description, setDescription] = useState('');

    const { sendMessage, creditsAvailable, isLoading } = useAIAssistant();
    const { propertyType, propertyLabel, requiredFields, isPropertyForm } = usePropertyType();
    const { toast } = useToast();

    const welcomeText = "👋 Salut ! Je vais créer votre annonce en quelques secondes.";

    // Animation typewriter
    useEffect(() => {
        if (!showWelcomeMessage) return;

        let currentIndex = 0;
        const typeInterval = setInterval(() => {
            if (currentIndex <= welcomeText.length) {
                setTypedText(welcomeText.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(typeInterval);
            }
        }, 45);

        return () => clearInterval(typeInterval);
    }, [showWelcomeMessage]);

    // Clignement naturel
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setEyesOpen(false);
            setTimeout(() => setEyesOpen(true), 120);
        }, 2500 + Math.random() * 2000);

        return () => clearInterval(blinkInterval);
    }, []);

    // Disparition message
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsWelcomeMessageFading(true);
            setTimeout(() => setShowWelcomeMessage(false), 400);
        }, welcomeText.length * 45 + 2500);

        return () => clearTimeout(timer);
    }, []);

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setShowWelcomeMessage(false);
        setExpression('happy');
        setTimeout(() => setExpression('smile'), 800);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setDescription('');
        setExpression('smile');
    };

    const handleGenerate = async () => {
        if (!description.trim() || !propertyType || !propertyLabel) return;

        setExpression('thinking');

        try {
            // Créer le prompt spécialisé
            const prompt = AIPromptsService.getAutoFillPrompt(
                propertyType,
                propertyLabel,
                requiredFields,
                description.trim()
            );

            const result = await sendMessage(prompt, formContext);

            if (result.success && result.response) {
                try {
                    // Parser la réponse JSON de l'IA
                    const cleanedResponse = result.response?.replace(/```json\n?|\n?```/g, '').trim() ?? '';
                    const generatedData = JSON.parse(cleanedResponse);

                    // Post-traitement : prix en FCFA, superficie à 0 si absente ou invalide
                    let price = generatedData.price;
                    if (typeof price === 'string') {
                        price = parseInt(price.replace(/[^0-9]/g, ''), 10);
                    }
                    if (!price || isNaN(price) || price < 0) price = 0;
                    let area = generatedData.area;
                    if (!area || isNaN(area) || area < 0) area = 0;

                    // Créer la structure de données conforme au localStorage attendu
                    const formData = {
                        typeProperty: PROPERTY_TYPE_MAPPING[propertyType] ?? 'Home',
                        title: generatedData.title ?? '',
                        description: generatedData.description ?? '',
                        price,
                        area,
                        tags: generatedData.tags ?? [],
                        street: '',
                        city: '',
                        province: '',
                        additionnalInformation: '',
                        longitude: 0,
                        latitude: 0,
                        countryCode: 'ga',
                        country: 'Gabon',
                        state: 'IN_PROGRESS',
                        status: 'FOR_RENT',
                        // Détails spécifiques selon le type de propriété
                        ...generatedData.propertyDetails
                    };

                    // Sauvegarder avec la fonction du provider
                    saveFormToLocalStorage(formData);

                    setExpression('happy');
                    setIsModalOpen(false);
                    setDescription('');

                    // Afficher un toast de succès
                    toast({
                        title: "✅ Formulaire généré avec succès !",
                        description: (
                            <div className="space-y-1">
                                <p><strong>Titre:</strong> {generatedData.title}</p>
                                <p><strong>Superficie:</strong> {area} m²</p>
                                <p><strong>Prix:</strong> {price?.toLocaleString()} FCFA</p>
                                <p className="text-sm text-gray-600 mt-2">La page va se recharger pour afficher les nouvelles données.</p>
                            </div>
                        ),
                        variant: "success",
                    });

                    setTimeout(() => setExpression('smile'), 1500);

                } catch (parseError) {
                    console.error('Erreur parsing JSON:', parseError);
                    setExpression('smile');
                    toast({
                        title: "❌ Erreur de traitement",
                        description: "Erreur lors de l'analyse de la réponse de l'IA. Veuillez réessayer.",
                        variant: "destructive",
                    });
                }
            } else {
                setExpression('smile');
                toast({
                    title: "❌ Erreur de génération",
                    description: result.error ?? "Une erreur s'est produite lors de la génération automatique.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Erreur génération automatique:', error);
            setExpression('smile');
            toast({
                title: "❌ Erreur inattendue",
                description: "Une erreur inattendue s'est produite lors de la génération automatique.",
                variant: "destructive",
            });
        }
    };

    // N'afficher le bouton que si on est sur un formulaire de propriété
    if (!isPropertyForm || !propertyType || !propertyLabel) {
        return null;
    }

    // Bot exact comme dans l'image
    const FlatBot = () => (
        <div className="relative">
            {/* Ombre portée */}
            <div
                className="absolute top-1 left-0 w-16 h-20 rounded-full opacity-20"
                style={{ backgroundColor: '#1e293b' }}
            />

            {/* Corps principal - coque blanche ovale */}
            <div
                className={`relative w-16 h-20 transition-all duration-300 ${isLoading ? 'animate-pulse' : 'hover:scale-105'
                    }`}
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
            >
                {/* Visage vert sarcelle à l'intérieur */}
                <div
                    className="absolute inset-2 transition-all duration-200"
                    style={{
                        backgroundColor: '#156B68', // Votre vert principal
                        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
                    }}
                >
                    {/* Yeux vert clair */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        <div
                            className={`transition-all duration-150 ${eyesOpen ? 'w-2 h-2' : 'w-2 h-0.5'
                                }`}
                            style={{
                                backgroundColor: '#1de9b6', // Vert clair/cyan
                                borderRadius: eyesOpen ? '50%' : '50% 50% 0 0'
                            }}
                        />
                        <div
                            className={`transition-all duration-150 ${eyesOpen ? 'w-2 h-2' : 'w-2 h-0.5'
                                }`}
                            style={{
                                backgroundColor: '#1de9b6',
                                borderRadius: eyesOpen ? '50%' : '50% 50% 0 0'
                            }}
                        />
                    </div>

                    {/* Bouche selon expression */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        {expression === 'smile' && (
                            <div
                                className="w-6 h-3"
                                style={{
                                    borderBottom: '2px solid #1de9b6',
                                    borderRadius: '0 0 50px 50px'
                                }}
                            />
                        )}
                        {expression === 'happy' && (
                            <div
                                className="w-8 h-4"
                                style={{
                                    borderBottom: '3px solid #1de9b6',
                                    borderRadius: '0 0 50px 50px'
                                }}
                            />
                        )}
                        {expression === 'thinking' && (
                            <div
                                className="w-3 h-1.5 animate-pulse"
                                style={{ backgroundColor: '#1de9b6', borderRadius: '50%' }}
                            />
                        )}
                        {expression === 'talking' && (
                            <div
                                className="w-4 h-1"
                                style={{ backgroundColor: '#1de9b6', borderRadius: '2px' }}
                            />
                        )}
                    </div>

                    {/* Icône spéciale quand en cours de réflexion */}
                    {isLoading && (
                        <div className="absolute top-2 right-2">
                            <div
                                className="w-3 h-3 animate-spin"
                                style={{
                                    border: '2px solid #1de9b6',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%'
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Indicateur online - petit point vert */}
            {creditsAvailable > 0 && !isLoading && (
                <div
                    className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: '#1de9b6' }}
                />
            )}
        </div>
    );

    return (
        <>
            <div className="fixed lg:bottom-6 bottom-72 right-6">
                {/* Message de bienvenue - positionné indépendamment */}
                {showWelcomeMessage && (
                    <div
                        className={`absolute bottom-full right-0 mb-4 transition-all duration-400 ${isWelcomeMessageFading ? 'opacity-0 translate-y-1' : 'opacity-100'
                            }`}
                    >
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 w-64 relative">
                            <p className="text-sm text-gray-700">
                                {typedText}
                                {typedText.length < welcomeText.length && (
                                    <span className="animate-pulse" style={{ color: '#1de9b6' }}>|</span>
                                )}
                            </p>
                            {/* Petite flèche pointant vers le bot */}
                            <div
                                className="absolute -bottom-1 right-4 w-2 h-2 bg-white border-r border-b border-gray-100 transform rotate-45"
                            />
                        </div>
                    </div>
                )}

                {/* Bouton bot - position fixe */}
                <button
                    onClick={handleOpenModal}
                    disabled={creditsAvailable <= 0 || isLoading}
                    className="focus:outline-none transition-all duration-200 disabled:opacity-50"
                >
                    <FlatBot />
                </button>
            </div>

            {/* Modal simple et clean */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: '#156B68' }}
                                >
                                    <Wand2 className="w-4 h-4" style={{ color: '#1de9b6' }} />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900">Assistant IA</h2>
                                    <p className="text-xs text-gray-500">Génération automatique</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Contenu */}
                        <div className="p-5">
                            {/* Info */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-gray-700 mb-2 font-medium">
                                    Champs générés automatiquement :
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {requiredFields.map((field) => (
                                        <span
                                            key={field}
                                            className="text-xs px-2 py-1 rounded-full text-gray-600"
                                            style={{ backgroundColor: '#e6fffa' }}
                                        >
                                            {field}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Textarea */}
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Décrivez votre bien
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ex: Appartement 3 pièces de 75m² avec balcon, cuisine équipée, proche métro..."
                                    className="w-full h-28 p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 focus:ring-[#156B68]"
                                    autoFocus
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Boutons */}
                            <div className="flex space-x-3">
                                <button
                                    type='button'
                                    onClick={handleCloseModal}
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type='button'
                                    onClick={handleGenerate}
                                    disabled={!description.trim() || creditsAvailable <= 0 || isLoading}
                                    className="flex-1 py-2.5 px-4 text-white rounded-xl transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                                    style={{ backgroundColor: '#156B68' }}
                                >
                                    <Send className="w-4 h-4" />
                                    <span>{isLoading ? 'Génération...' : 'Générer'}</span>
                                </button>
                            </div>

                            {/* Crédits */}
                            <div className="text-center mt-3">
                                <span className="text-xs text-gray-500">
                                    {creditsAvailable} crédit{creditsAvailable > 1 ? 's' : ''} disponible{creditsAvailable > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FlatBotAssistant; 