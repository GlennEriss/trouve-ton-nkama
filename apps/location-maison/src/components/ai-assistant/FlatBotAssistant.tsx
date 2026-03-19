'use client'

import React, { useState } from 'react';
import usePropertyType from '@/hooks/usePropertyType';
import { useFormAIHandler } from '@/hooks/useFormAIHandler';
import FlatBotAvatar from './FlatBotAvatar';
import WelcomeMessage from './WelcomeMessage';
import AssistantModal from './AssistantModal';
import { useWindowSize } from '@/hooks/useSize';
import { useCurrentUser } from '@/hooks/use-current-user';

interface FlatBotAssistantProps {
    isUpdate?: boolean;
}

const FlatBotAssistant: React.FC<FlatBotAssistantProps> = ({ 
    isUpdate = false 
}) => {
    const MOBILE_LAUNCHER_OFFSET_PX = 16;
    const MOBILE_LAUNCHER_OFFSET_WITH_BOTTOM_NAV_PX = 88;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
    const [expression, setExpression] = useState<'smile' | 'happy' | 'thinking' | 'talking'>('smile');
    const { width } = useWindowSize();
    const { user } = useCurrentUser();

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

    const isMobileViewport = width > 0 && width < 768;
    const hasBottomNavigation = Boolean(user && isMobileViewport);
    const mobileBottomOffset = hasBottomNavigation
        ? MOBILE_LAUNCHER_OFFSET_WITH_BOTTOM_NAV_PX
        : MOBILE_LAUNCHER_OFFSET_PX;

    return (
        <>
            <div
                className="fixed right-4 bottom-4 z-40 md:right-6 md:bottom-6"
                style={
                    isMobileViewport
                        ? { bottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileBottomOffset}px)` }
                        : undefined
                }
            >
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
