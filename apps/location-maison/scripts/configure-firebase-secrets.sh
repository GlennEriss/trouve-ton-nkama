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
echo "   5. MYPAYGA_API_KEY"
echo "   6. MYPAYGA_CALLBACK_SECRET"
echo "   7. MYPAYGA_CALLBACK_URL"
echo "   8. MYPAYGA_API_BASE_URL"
echo "   9. MYPAYGA_COUNTRY"
echo "   10. MYPAYGA_CURRENCY"
echo "   11. MYPAYGA_SUCCESS_URL"
echo "   12. MYPAYGA_FAIL_URL"
echo "   13. MYPAYGA_PAYMENT_TIMEOUT_MS"
echo ""
echo "⚠️  Tu devras entrer chaque valeur manuellement."
echo ""

# Lire les valeurs depuis .env.local.prod si disponible, sinon .env.local.dev
ENV_FILE=""
if [ -f .env.local.prod ]; then
    ENV_FILE=".env.local.prod"
elif [ -f .env.local.dev ]; then
    ENV_FILE=".env.local.dev"
fi

if [ -n "$ENV_FILE" ]; then
    echo "📖 Lecture des valeurs depuis $ENV_FILE..."

    HOSTINGER_EMAIL_USER=$(grep "^HOSTINGER_EMAIL_USER=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    HOSTINGER_EMAIL_PASS=$(grep "^HOSTINGER_EMAIL_PASS=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    EMAIL_DISPLAY_NAME=$(grep "^EMAIL_DISPLAY_NAME=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    NEXT_PUBLIC_APP_URL=$(grep "^NEXT_PUBLIC_APP_URL=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_API_KEY=$(grep "^MYPAYGA_API_KEY=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_CALLBACK_SECRET=$(grep "^MYPAYGA_CALLBACK_SECRET=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_CALLBACK_URL=$(grep "^MYPAYGA_CALLBACK_URL=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_API_BASE_URL=$(grep "^MYPAYGA_API_BASE_URL=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_COUNTRY=$(grep "^MYPAYGA_COUNTRY=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_CURRENCY=$(grep "^MYPAYGA_CURRENCY=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_SUCCESS_URL=$(grep "^MYPAYGA_SUCCESS_URL=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_FAIL_URL=$(grep "^MYPAYGA_FAIL_URL=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    MYPAYGA_PAYMENT_TIMEOUT_MS=$(grep "^MYPAYGA_PAYMENT_TIMEOUT_MS=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
        NEXT_PUBLIC_APP_URL="https://www.tonnkama.com"
    fi

    echo ""
    echo "💡 Valeurs trouvées dans $ENV_FILE :"
    [ -n "$HOSTINGER_EMAIL_USER" ] && echo "   ✅ HOSTINGER_EMAIL_USER: $HOSTINGER_EMAIL_USER" || echo "   ⚠️  HOSTINGER_EMAIL_USER: non trouvé"
    [ -n "$HOSTINGER_EMAIL_PASS" ] && echo "   ✅ HOSTINGER_EMAIL_PASS: ***" || echo "   ⚠️  HOSTINGER_EMAIL_PASS: non trouvé"
    [ -n "$EMAIL_DISPLAY_NAME" ] && echo "   ✅ EMAIL_DISPLAY_NAME: $EMAIL_DISPLAY_NAME" || echo "   ⚠️  EMAIL_DISPLAY_NAME: non trouvé"
    [ -n "$NEXT_PUBLIC_APP_URL" ] && echo "   ✅ NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL" || echo "   ⚠️  NEXT_PUBLIC_APP_URL: non trouvé"
    [ -n "$MYPAYGA_API_KEY" ] && echo "   ✅ MYPAYGA_API_KEY: ***" || echo "   ⚠️  MYPAYGA_API_KEY: non trouvé"
    [ -n "$MYPAYGA_CALLBACK_SECRET" ] && echo "   ✅ MYPAYGA_CALLBACK_SECRET: ***" || echo "   ⚠️  MYPAYGA_CALLBACK_SECRET: non trouvé"
    [ -n "$MYPAYGA_CALLBACK_URL" ] && echo "   ✅ MYPAYGA_CALLBACK_URL: $MYPAYGA_CALLBACK_URL" || echo "   ⚠️  MYPAYGA_CALLBACK_URL: non trouvé"
    [ -n "$MYPAYGA_SUCCESS_URL" ] && echo "   ✅ MYPAYGA_SUCCESS_URL: $MYPAYGA_SUCCESS_URL" || echo "   ⚠️  MYPAYGA_SUCCESS_URL: non trouvé"
    [ -n "$MYPAYGA_FAIL_URL" ] && echo "   ✅ MYPAYGA_FAIL_URL: $MYPAYGA_FAIL_URL" || echo "   ⚠️  MYPAYGA_FAIL_URL: non trouvé"
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

# Configurer les secrets MyPayGa
echo "5️⃣ Configuration de MYPAYGA_API_KEY..."
if [ -n "$MYPAYGA_API_KEY" ]; then
    read -p "   Utiliser la valeur depuis $ENV_FILE? (o/n) " -n 1 -r; echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then MYPAYGA_API_KEY=""; fi
fi
if [ -z "$MYPAYGA_API_KEY" ]; then read -sp "   Entrer MYPAYGA_API_KEY (masqué): " MYPAYGA_API_KEY; echo; fi
echo "$MYPAYGA_API_KEY" | firebase functions:secrets:set MYPAYGA_API_KEY
echo ""

echo "6️⃣ Configuration de MYPAYGA_CALLBACK_SECRET..."
if [ -n "$MYPAYGA_CALLBACK_SECRET" ]; then
    read -p "   Utiliser la valeur depuis $ENV_FILE? (o/n) " -n 1 -r; echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then MYPAYGA_CALLBACK_SECRET=""; fi
fi
if [ -z "$MYPAYGA_CALLBACK_SECRET" ]; then read -sp "   Entrer MYPAYGA_CALLBACK_SECRET (masqué): " MYPAYGA_CALLBACK_SECRET; echo; fi
echo "$MYPAYGA_CALLBACK_SECRET" | firebase functions:secrets:set MYPAYGA_CALLBACK_SECRET
echo ""

echo "7️⃣ Configuration de MYPAYGA_CALLBACK_URL..."
if [ -z "$MYPAYGA_CALLBACK_URL" ]; then MYPAYGA_CALLBACK_URL="https://us-central1-location-maison-prod-167da.cloudfunctions.net/mypaygaPaymentCallback"; fi
echo "   Valeur suggérée: $MYPAYGA_CALLBACK_URL"
read -p "   Utiliser cette valeur? (o/n) " -n 1 -r; echo
if [[ ! $REPLY =~ ^[OoYy]$ ]]; then read -p "   Entrer MYPAYGA_CALLBACK_URL: " MYPAYGA_CALLBACK_URL; fi
echo "$MYPAYGA_CALLBACK_URL" | firebase functions:secrets:set MYPAYGA_CALLBACK_URL
echo ""

echo "8️⃣ Configuration de MYPAYGA_API_BASE_URL..."
if [ -z "$MYPAYGA_API_BASE_URL" ]; then MYPAYGA_API_BASE_URL="https://api.mypayga.com"; fi
echo "$MYPAYGA_API_BASE_URL" | firebase functions:secrets:set MYPAYGA_API_BASE_URL
echo ""

echo "9️⃣ Configuration de MYPAYGA_COUNTRY / CURRENCY / TIMEOUT..."
echo "${MYPAYGA_COUNTRY:-GA}" | firebase functions:secrets:set MYPAYGA_COUNTRY
echo "${MYPAYGA_CURRENCY:-XAF}" | firebase functions:secrets:set MYPAYGA_CURRENCY
echo "${MYPAYGA_PAYMENT_TIMEOUT_MS:-12000}" | firebase functions:secrets:set MYPAYGA_PAYMENT_TIMEOUT_MS
echo ""

echo "🔟 Configuration de MYPAYGA_SUCCESS_URL..."
if [ -z "$MYPAYGA_SUCCESS_URL" ]; then MYPAYGA_SUCCESS_URL="https://www.tonnkama.com/my-balance/recharge?payment=success"; fi
echo "$MYPAYGA_SUCCESS_URL" | firebase functions:secrets:set MYPAYGA_SUCCESS_URL
echo ""

echo "1️⃣1️⃣ Configuration de MYPAYGA_FAIL_URL..."
if [ -z "$MYPAYGA_FAIL_URL" ]; then MYPAYGA_FAIL_URL="https://www.tonnkama.com/my-balance/recharge?payment=fail"; fi
echo "$MYPAYGA_FAIL_URL" | firebase functions:secrets:set MYPAYGA_FAIL_URL
echo ""

echo "✅ Tous les secrets ont été configurés!"
echo ""
echo "📝 Pour vérifier les secrets configurés :"
echo "   firebase functions:secrets:access HOSTINGER_EMAIL_USER"
echo ""
echo "🔄 Pour redéployer la Cloud Function avec les nouveaux secrets :"
echo "   firebase deploy --only functions"
