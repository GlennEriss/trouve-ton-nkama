'use client'

import React from 'react';
import { Bot, User, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
  creditsUsed?: number;
  creditsRemaining?: number;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { type, content, timestamp, creditsUsed, creditsRemaining } = message;

  const getMessageStyle = () => {
    switch (type) {
      case 'user':
        return {
          containerClass: 'flex justify-end',
          bubbleClass: 'text-white max-w-[80%] ml-4',
          showAvatar: false,
          customStyle: { backgroundColor: '#156B66' }
        };
      case 'assistant':
        return {
          containerClass: 'flex justify-start',
          bubbleClass: 'bg-gray-100 text-gray-900 max-w-[80%] mr-4',
          showAvatar: true,
          icon: <Bot className="w-4 h-4" style={{ color: '#156B66' }} />
        };
      case 'system':
        return {
          containerClass: 'flex justify-center',
          bubbleClass: 'bg-yellow-50 text-yellow-800 max-w-[90%] border border-yellow-200',
          showAvatar: true,
          icon: <AlertCircle className="w-4 h-4 text-yellow-600" />
        };
      case 'error':
        return {
          containerClass: 'flex justify-center',
          bubbleClass: 'bg-red-50 text-red-800 max-w-[90%] border border-red-200',
          showAvatar: true,
          icon: <AlertCircle className="w-4 h-4 text-red-600" />
        };
      default:
        return {
          containerClass: 'flex justify-start',
          bubbleClass: 'bg-gray-100 text-gray-900 max-w-[80%]',
          showAvatar: true
        };
    }
  };

  const { containerClass, bubbleClass, showAvatar, icon, customStyle } = getMessageStyle();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`${containerClass} mb-4`}>
      {/* Avatar pour les messages système et assistant */}
      {showAvatar && type !== 'user' && (
        <div className="flex-shrink-0 mr-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-blue-100">
              {icon}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Bulle de message */}
      <div 
        className={`${bubbleClass} rounded-2xl px-4 py-2 shadow-sm`}
        style={customStyle}
      >
        {/* Contenu du message */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </div>

        {/* Métadonnées */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-opacity-20 border-current">
          {/* Timestamp */}
          <span className="text-xs opacity-70">
            {formatTime(timestamp)}
          </span>

          {/* Informations sur les crédits pour les réponses de l'assistant */}
          {type === 'assistant' && creditsUsed && (
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="text-xs px-1 py-0">
                -{creditsUsed} crédit
              </Badge>
              {creditsRemaining !== undefined && (
                <span className="text-xs opacity-70">
                  • {creditsRemaining} restant{creditsRemaining > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Avatar pour les messages utilisateur */}
      {showAvatar && type === 'user' && (
        <div className="flex-shrink-0 ml-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-white" style={{ backgroundColor: '#156B66' }}>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 