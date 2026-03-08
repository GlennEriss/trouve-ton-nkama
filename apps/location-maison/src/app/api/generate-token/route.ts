// /app/api/auth/generate-token/route.ts
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { adminAuth } = await import('@/firebase/admin');

        // Check if request has a body
        const contentLength = req.headers.get('content-length');
        if (!contentLength || contentLength === '0') {
            return NextResponse.json({ error: "Corps de la requête requis" }, { status: 400 });
        }

        // Check content type
        const contentType = req.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return NextResponse.json({ error: "Content-Type doit être application/json" }, { status: 400 });
        }

        let body;
        try {
            body = await req.json();
        } catch (jsonError) {
            console.error("Erreur de parsing JSON :", jsonError);
            return NextResponse.json({ error: "Format JSON invalide" }, { status: 400 });
        }

        const { uid } = body;

        if (!uid) {
            return NextResponse.json({ error: "UID requis" }, { status: 400 });
        }

        if (typeof uid !== 'string' || uid.trim().length === 0) {
            return NextResponse.json({ error: "UID doit être une chaîne non vide" }, { status: 400 });
        }

        // Créer un custom token pour l'utilisateur
        const customToken = await adminAuth.createCustomToken(uid);
        return NextResponse.json({ token: customToken });
    } catch (error) {
        console.error("Erreur lors de la génération du token :", error);
        return NextResponse.json({ error: "Impossible de générer le token" }, { status: 500 });
    }
}
