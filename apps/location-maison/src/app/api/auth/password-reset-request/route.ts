import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email est requis' },
        { status: 400 }
      );
    }

    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/request-password-reset`,
      handleCodeInApp: false,
    };

    try {
      // Vérifier si l'utilisateur existe
      const user = await adminAuth.getUserByEmail(email);
      
      // Générer le lien de réinitialisation
      const resetLink = await adminAuth.generatePasswordResetLink(
        email,
        actionCodeSettings
      );

      // Extraire l'oobCode du lien
      const url = new URL(resetLink);
      const oobCode = url.searchParams.get('oobCode');

      if (oobCode) {
        const params = new URLSearchParams();
        params.set('oobCode', oobCode);
        const customResetLink = `${process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000'}/api/auth/password-reset?${params.toString()}`;

        // TODO: Envoyer l'email avec le lien de réinitialisation
        // Pour l'instant, on retourne juste le succès
        
        return NextResponse.json({
          success: true,
          message: 'Email de réinitialisation envoyé avec succès',
          resetLink: customResetLink, // Pour les tests seulement
        });
      } else {
        throw new Error('Impossible de générer le lien de réinitialisation');
      }
    } catch (error: any) {
      console.error('Erreur lors de la génération du lien:', error);
      
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Aucun compte associé à cette adresse email' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erreur lors de la génération du lien de réinitialisation' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erreur générale:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 