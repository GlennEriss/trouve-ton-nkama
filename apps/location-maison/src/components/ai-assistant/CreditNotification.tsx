'use client'

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CreditNotificationProps {
  creditsAvailable: number;
  showWarning?: boolean;
  className?: string;
}

const CreditNotification: React.FC<CreditNotificationProps> = ({
  creditsAvailable,
  showWarning = true,
  className = ''
}) => {
  const [showAnimation, setShowAnimation] = useState(false);

  // Animation quand les crédits changent
  useEffect(() => {
    if (creditsAvailable > 0) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [creditsAvailable]);

  const getCreditStatus = () => {
    if (creditsAvailable <= 0) {
      return {
        variant: 'destructive' as const,
        icon: <AlertTriangle className="w-3 h-3" />,
        text: 'Aucun crédit',
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        animationClass: ''
      };
    } else if (creditsAvailable <= 3 && showWarning) {
      return {
        variant: 'secondary' as const,
        icon: <AlertTriangle className="w-3 h-3" />,
        text: `${creditsAvailable} crédit${creditsAvailable > 1 ? 's' : ''}`,
        bgColor: 'bg-orange-500',
        textColor: 'text-white',
        animationClass: 'animate-pulse'
      };
    } else {
      return {
        variant: 'default' as const,
        icon: <Zap className="w-3 h-3" />,
        text: `${creditsAvailable} crédit${creditsAvailable > 1 ? 's' : ''}`,
        bgColor: 'bg-blue-600',
        textColor: 'text-white',
        animationClass: showAnimation ? 'animate-bounce' : ''
      };
    }
  };

  const status = getCreditStatus();

  return (
    <Badge 
      variant={status.variant}
      className={`
        ${status.bgColor} ${status.textColor} ${status.animationClass}
        px-2 py-1 text-xs font-medium shadow-lg border-0
        flex items-center space-x-1 transition-all duration-300
        ${className}
      `}
    >
      {status.icon}
      <span>{status.text}</span>
    </Badge>
  );
};

export default CreditNotification; 