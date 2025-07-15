import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const oobCode = params.get('oobCode');

  console.log('🔍 Lien de réinitialisation cliqué, oobCode:', oobCode?.substring(0, 10) + '...');

  if (!oobCode) {
    console.log('❌ Aucun oobCode trouvé dans les paramètres');
    const redirectUrl = new URL('/password-reset-failure', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirection directe vers la page de réinitialisation
  // La validation du code OOB se fera lors de la soumission du nouveau mot de passe
  console.log('✅ Redirection vers /password-reset');
  const newParams = new URLSearchParams();
  newParams.set('oobCode', oobCode);
  const redirectUrl = new URL(`/password-reset?${newParams.toString()}`, request.url);
  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: NextRequest) {
  try {
    const { newPassword, oobCode } = await request.json();

    if (!newPassword || !oobCode) {
      return NextResponse.json(
        { error: 'Mot de passe et code OOB sont requis' },
        { status: 400 }
      );
    }

    try {
      // Réinitialiser directement le mot de passe
      // Firebase validera automatiquement le code OOB
      const confirmResponse = await confirmPasswordReset(oobCode, newPassword);
      const confirmResult = await confirmResponse.json();

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      });
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      
      if (error.message.includes('EXPIRED_OOB_CODE')) {
        return NextResponse.json(
          { error: 'Le lien de réinitialisation a expiré' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('INVALID_OOB_CODE')) {
        return NextResponse.json(
          { error: 'Le lien de réinitialisation est invalide' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('WEAK_PASSWORD')) {
        return NextResponse.json(
          { error: 'Le mot de passe est trop faible' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Erreur lors de la réinitialisation du mot de passe' },
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



async function confirmPasswordReset(oobCode: string, newPassword: string) {
  const params = new URLSearchParams();
  params.set('key', process.env.NEXT_PUBLIC_FIREBASE_API_KEY!);
  
  return await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oobCode, newPassword }),
    }
  );
} 