'use client'

import React, { useState } from 'react';
import usePropertyType from '@/hooks/usePropertyType';
import { useFormAIHandler } from '@/hooks/useFormAIHandler';
import FlatBotAvatar from './FlatBotAvatar';
import WelcomeMessage from './WelcomeMessage';
import AssistantModal from './AssistantModal';

interface FlatBotAssistantProps {
    isUpdate?: boolean;
}

const FlatBotAssistant: React.FC<FlatBotAssistantProps> = ({ 
    isUpdate = false 
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
    const [expression, setExpression] = useState<'smile' | 'happy' | 'thinking' | 'talking'>('smile');

    const { propertyType, propertyLabel, requiredFields, isPropertyForm } = usePropertyType();
    
    const { 
        handleGenerate, 
        isGenerating, 
        creditsAvailable, 
        canGenerate 
    } = useFormAIHandler({
        propertyType: propertyType || '',
        propertyLabel: propertyLabel || '',
        requiredFields: requiredFields || [],
        isUpdate
    });

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setShowWelcomeMessage(false);
        setExpression('happy');
        setTimeout(() => setExpression('smile'), 800);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setExpression('smile');
    };

    const handleGenerateWithExpression = async (description: string, images?: File[]) => {
        setExpression('thinking');
        try {
            await handleGenerate(description, images);
            setExpression('happy');
            setTimeout(() => setExpression('smile'), 1500);
        } catch (error) {
            setExpression('smile');
            throw error; // Re-throw pour que le modal gère l'erreur
        }
    };

    // N'afficher le bouton que si on est sur un formulaire de propriété
    if (!isPropertyForm || !propertyType || !propertyLabel) {
        return null;
    }

    return (
        <>
            <div className="fixed lg:bottom-6 bottom-72 right-6">
                {/* Message de bienvenue */}
                <WelcomeMessage
                    show={showWelcomeMessage}
                    onComplete={() => setShowWelcomeMessage(false)}
                />

                {/* Bouton bot */}
                <FlatBotAvatar
                    isLoading={isGenerating}
                    creditsAvailable={creditsAvailable}
                    expression={expression}
                    onClick={handleOpenModal}
                    disabled={!canGenerate}
                />
            </div>

            {/* Modal */}
            <AssistantModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onGenerate={handleGenerateWithExpression}
                requiredFields={requiredFields || []}
                isLoading={isGenerating}
                creditsAvailable={creditsAvailable}
                canGenerate={canGenerate}
            />
        </>
    );
};

export default FlatBotAssistant; 
