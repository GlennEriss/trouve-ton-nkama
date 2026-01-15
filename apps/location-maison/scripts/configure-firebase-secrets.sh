#!/bin/bash

# Script pour configurer les secrets Firebase pour la Cloud Function d'envoi d'email
# Usage: ./scripts/configure-firebase-secrets.sh

echo "🔐 Configuration des secrets Firebase pour la Cloud Function d'envoi d'email"
echo ""

# Vérifier que firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI n'est pas installé. Installe-le avec: npm install -g firebase-tools"
    exit 1
fi

# Vérifier que l'utilisateur est connecté
if ! firebase projects:list &> /dev/null; then
    echo "❌ Tu n'es pas connecté à Firebase. Connecte-toi avec: firebase login"
    exit 1
fi

echo "📋 Les secrets suivants seront configurés :"
echo "   1. HOSTINGER_EMAIL_USER"
echo "   2. HOSTINGER_EMAIL_PASS"
echo "   3. EMAIL_DISPLAY_NAME"
echo "   4. NEXT_PUBLIC_APP_URL"
echo ""
echo "⚠️  Tu devras entrer chaque valeur manuellement."
echo ""

# Lire les valeurs depuis .env.local.dev si disponible
if [ -f .env.local.dev ]; then
    echo "📖 Lecture des valeurs depuis .env.local.dev..."
    
    HOSTINGER_EMAIL_USER=$(grep "^HOSTINGER_EMAIL_USER=" .env.local.dev | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    HOSTINGER_EMAIL_PASS=$(grep "^HOSTINGER_EMAIL_PASS=" .env.local.dev | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    EMAIL_DISPLAY_NAME=$(grep "^EMAIL_DISPLAY_NAME=" .env.local.dev | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    NEXT_PUBLIC_APP_URL=$(grep "^NEXT_PUBLIC_APP_URL=" .env.local.dev | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
        NEXT_PUBLIC_APP_URL="http://localhost:3000"
    fi
    
    echo ""
    echo "💡 Valeurs trouvées dans .env.local.dev :"
    [ -n "$HOSTINGER_EMAIL_USER" ] && echo "   ✅ HOSTINGER_EMAIL_USER: $HOSTINGER_EMAIL_USER" || echo "   ⚠️  HOSTINGER_EMAIL_USER: non trouvé"
    [ -n "$HOSTINGER_EMAIL_PASS" ] && echo "   ✅ HOSTINGER_EMAIL_PASS: ***" || echo "   ⚠️  HOSTINGER_EMAIL_PASS: non trouvé"
    [ -n "$EMAIL_DISPLAY_NAME" ] && echo "   ✅ EMAIL_DISPLAY_NAME: $EMAIL_DISPLAY_NAME" || echo "   ⚠️  EMAIL_DISPLAY_NAME: non trouvé"
    [ -n "$NEXT_PUBLIC_APP_URL" ] && echo "   ✅ NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL" || echo "   ⚠️  NEXT_PUBLIC_APP_URL: non trouvé"
    echo ""
    echo "Tu peux utiliser ces valeurs ou les modifier."
    echo ""
fi

# Configurer HOSTINGER_EMAIL_USER
echo "1️⃣ Configuration de HOSTINGER_EMAIL_USER..."
if [ -n "$HOSTINGER_EMAIL_USER" ]; then
    echo "   Valeur suggérée: $HOSTINGER_EMAIL_USER"
    read -p "   Utiliser cette valeur? (o/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
        HOSTINGER_EMAIL_USER=""
    fi
fi
if [ -z "$HOSTINGER_EMAIL_USER" ]; then
    read -p "   Entrer HOSTINGER_EMAIL_USER: " HOSTINGER_EMAIL_USER
fi
echo "$HOSTINGER_EMAIL_USER" | firebase functions:secrets:set HOSTINGER_EMAIL_USER
echo ""

# Configurer HOSTINGER_EMAIL_PASS
echo "2️⃣ Configuration de HOSTINGER_EMAIL_PASS..."
if [ -n "$HOSTINGER_EMAIL_PASS" ]; then
    echo "   Valeur trouvée dans .env.local.dev (masquée)"
    read -p "   Utiliser cette valeur? (o/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
        HOSTINGER_EMAIL_PASS=""
    fi
fi
if [ -z "$HOSTINGER_EMAIL_PASS" ]; then
    read -sp "   Entrer HOSTINGER_EMAIL_PASS (masqué): " HOSTINGER_EMAIL_PASS
    echo
fi
echo "$HOSTINGER_EMAIL_PASS" | firebase functions:secrets:set HOSTINGER_EMAIL_PASS
echo ""

# Configurer EMAIL_DISPLAY_NAME
echo "3️⃣ Configuration de EMAIL_DISPLAY_NAME..."
if [ -z "$EMAIL_DISPLAY_NAME" ]; then
    EMAIL_DISPLAY_NAME="Trouve Ton Nkama"
fi
echo "   Valeur suggérée: $EMAIL_DISPLAY_NAME"
read -p "   Utiliser cette valeur? (o/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
    read -p "   Entrer EMAIL_DISPLAY_NAME: " EMAIL_DISPLAY_NAME
fi
echo "$EMAIL_DISPLAY_NAME" | firebase functions:secrets:set EMAIL_DISPLAY_NAME
echo ""

# Configurer NEXT_PUBLIC_APP_URL
echo "4️⃣ Configuration de NEXT_PUBLIC_APP_URL..."
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
fi
echo "   Valeur suggérée: $NEXT_PUBLIC_APP_URL"
read -p "   Utiliser cette valeur? (o/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
    read -p "   Entrer NEXT_PUBLIC_APP_URL: " NEXT_PUBLIC_APP_URL
fi
echo "$NEXT_PUBLIC_APP_URL" | firebase functions:secrets:set NEXT_PUBLIC_APP_URL
echo ""

echo "✅ Tous les secrets ont été configurés!"
echo ""
echo "📝 Pour vérifier les secrets configurés :"
echo "   firebase functions:secrets:access HOSTINGER_EMAIL_USER"
echo ""
echo "🔄 Pour redéployer la Cloud Function avec les nouveaux secrets :"
echo "   firebase deploy --only functions:sendVerificationEmail"
