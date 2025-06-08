// /app/api/auth/generate-token/route.ts
import { adminAuth } from "@/firebase/admin";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { uid } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: "UID requis" }, { status: 400 });
        }

        // Créer un custom token pour l'utilisateur
        const customToken = await adminAuth.createCustomToken(uid);
        return NextResponse.json({ token: customToken });
    } catch (error) {
        console.error("Erreur lors de la génération du token :", error);
        return NextResponse.json({ error: "Impossible de générer le token" }, { status: 500 });
    }
}