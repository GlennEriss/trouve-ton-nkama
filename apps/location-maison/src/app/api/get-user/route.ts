import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { adminAuth } = await import('@/firebase/admin');

    const { uid } = await req.json();

    // Vérification si le uid est présent dans la requête
    if (!uid) {
      return NextResponse.json(
        { error: "Le UID est requis." },
        { status: 400 }
      );
    }

    // Récupération de l'utilisateur avec adminAuth
    const user = await adminAuth.getUser(uid);
    // Retourne les données de l'utilisateur
    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Erreur lors de la récupération de l'utilisateur :", error);
    return NextResponse.json(
      { error: "Utilisateur non trouvé ou erreur interne." },
      { status: 500 }
    );
  }
}
