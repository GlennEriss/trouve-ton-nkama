import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '@/services/sms.service';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Numéro de téléphone requis' },
        { status: 400 }
      );
    }

    // Validation du format du numéro
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Format de numéro invalide. Utilisez le format international (+24101234567)' },
        { status: 400 }
      );
    }

    // Envoyer le SMS
    const result = await smsService.sendOTP(phoneNumber);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        messageId: result.messageId
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'envoi du SMS' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Erreur API SMS:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 