#!/bin/bash

# Script pour configurer les secrets Firebase depuis .env.local.preprod
# Usage: ./scripts/configure-firebase-secrets-preprod.sh

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔐 Configuration des secrets Firebase pour la préprod"
echo "======================================================"
echo ""

# Vérifier que Firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI n'est pas installé${NC}"
    echo "Installez-le avec: npm install -g firebase-tools"
    exit 1
fi

# Vérifier que l'utilisateur est connecté
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vous n'êtes pas connecté à Firebase${NC}"
    echo "Connexion..."
    firebase login
fi

# Vérifier le projet préprod
echo "📋 Vérification du projet préprod..."
firebase use preprod 2>&1 | grep -q "location-maison-preprod" || {
    echo -e "${RED}❌ Le projet préprod n'est pas configuré${NC}"
    exit 1
}
echo -e "${GREEN}✅ Projet préprod: location-maison-preprod${NC}"
echo ""

# Vérifier que le fichier .env.local.preprod existe
if [ ! -f .env.local.preprod ]; then
    echo -e "${RED}❌ Fichier .env.local.preprod non trouvé${NC}"
    echo "Créez-le à partir de documentation/setup/env.local.preprod.template"
    exit 1
fi

echo "📖 Lecture des valeurs depuis .env.local.preprod..."
echo ""

# Fonction pour extraire une valeur depuis .env
extract_env_value() {
    local key=$1
    local value=$(grep "^${key}=" .env.local.preprod | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
    echo "$value"
}

# Extraire les valeurs
HOSTINGER_EMAIL_USER=$(extract_env_value "HOSTINGER_EMAIL_USER")
HOSTINGER_EMAIL_PASS=$(extract_env_value "HOSTINGER_EMAIL_PASS")
EMAIL_DISPLAY_NAME=$(extract_env_value "EMAIL_DISPLAY_NAME")
NEXT_PUBLIC_APP_URL=$(extract_env_value "NEXT_PUBLIC_APP_URL")

# Valeur par défaut pour EMAIL_DISPLAY_NAME si vide
if [ -z "$EMAIL_DISPLAY_NAME" ]; then
    EMAIL_DISPLAY_NAME="Trouve Ton Nkama"
fi

# Valeur par défaut pour NEXT_PUBLIC_APP_URL si vide
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    NEXT_PUBLIC_APP_URL="https://location-maison-preprod.vercel.app"
fi

# Afficher les valeurs trouvées (masquer le mot de passe)
echo "💡 Valeurs trouvées dans .env.local.preprod :"
[ -n "$HOSTINGER_EMAIL_USER" ] && echo -e "   ${GREEN}✅${NC} HOSTINGER_EMAIL_USER: $HOSTINGER_EMAIL_USER" || echo -e "   ${YELLOW}⚠️${NC}  HOSTINGER_EMAIL_USER: non trouvé"
[ -n "$HOSTINGER_EMAIL_PASS" ] && echo -e "   ${GREEN}✅${NC} HOSTINGER_EMAIL_PASS: ***" || echo -e "   ${YELLOW}⚠️${NC}  HOSTINGER_EMAIL_PASS: non trouvé"
[ -n "$EMAIL_DISPLAY_NAME" ] && echo -e "   ${GREEN}✅${NC} EMAIL_DISPLAY_NAME: $EMAIL_DISPLAY_NAME" || echo -e "   ${YELLOW}⚠️${NC}  EMAIL_DISPLAY_NAME: non trouvé (utilisera: $EMAIL_DISPLAY_NAME)"
[ -n "$NEXT_PUBLIC_APP_URL" ] && echo -e "   ${GREEN}✅${NC} NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL" || echo -e "   ${YELLOW}⚠️${NC}  NEXT_PUBLIC_APP_URL: non trouvé (utilisera: $NEXT_PUBLIC_APP_URL)"
echo ""

# Vérifier que les secrets essentiels sont présents
if [ -z "$HOSTINGER_EMAIL_USER" ] || [ -z "$HOSTINGER_EMAIL_PASS" ]; then
    echo -e "${RED}❌ Les secrets essentiels (HOSTINGER_EMAIL_USER, HOSTINGER_EMAIL_PASS) sont manquants${NC}"
    echo "Ajoutez-les dans .env.local.preprod"
    exit 1
fi

# Confirmation
echo -e "${YELLOW}⚠️  Vous êtes sur le point de configurer les secrets Firebase pour la préprod${NC}"
read -p "Continuer? (oui/non): " confirm
if [ "$confirm" != "oui" ]; then
    echo "Configuration annulée"
    exit 0
fi

echo ""
echo "🚀 Configuration des secrets..."
echo ""

# Configurer HOSTINGER_EMAIL_USER
echo "1️⃣ Configuration de HOSTINGER_EMAIL_USER..."
echo "$HOSTINGER_EMAIL_USER" | firebase functions:secrets:set HOSTINGER_EMAIL_USER --project location-maison-preprod
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ HOSTINGER_EMAIL_USER configuré${NC}"
else
    echo -e "${RED}❌ Erreur lors de la configuration de HOSTINGER_EMAIL_USER${NC}"
    exit 1
fi
echo ""

# Configurer HOSTINGER_EMAIL_PASS
echo "2️⃣ Configuration de HOSTINGER_EMAIL_PASS..."
echo "$HOSTINGER_EMAIL_PASS" | firebase functions:secrets:set HOSTINGER_EMAIL_PASS --project location-maison-preprod
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ HOSTINGER_EMAIL_PASS configuré${NC}"
else
    echo -e "${RED}❌ Erreur lors de la configuration de HOSTINGER_EMAIL_PASS${NC}"
    exit 1
fi
echo ""

# Configurer EMAIL_DISPLAY_NAME
echo "3️⃣ Configuration de EMAIL_DISPLAY_NAME..."
echo "$EMAIL_DISPLAY_NAME" | firebase functions:secrets:set EMAIL_DISPLAY_NAME --project location-maison-preprod
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ EMAIL_DISPLAY_NAME configuré${NC}"
else
    echo -e "${RED}❌ Erreur lors de la configuration de EMAIL_DISPLAY_NAME${NC}"
    exit 1
fi
echo ""

# Configurer NEXT_PUBLIC_APP_URL
echo "4️⃣ Configuration de NEXT_PUBLIC_APP_URL..."
echo "$NEXT_PUBLIC_APP_URL" | firebase functions:secrets:set NEXT_PUBLIC_APP_URL --project location-maison-preprod
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ NEXT_PUBLIC_APP_URL configuré${NC}"
else
    echo -e "${RED}❌ Erreur lors de la configuration de NEXT_PUBLIC_APP_URL${NC}"
    exit 1
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Tous les secrets ont été configurés avec succès!${NC}"
echo "=========================================="
echo ""
echo "📝 Pour vérifier les secrets configurés :"
echo "   firebase functions:secrets:access HOSTINGER_EMAIL_USER --project location-maison-preprod"
echo ""
echo "🔄 Pour redéployer la Cloud Function avec les nouveaux secrets :"
echo "   firebase deploy --only functions:sendVerificationEmail --project location-maison-preprod"
echo ""
echo "🚀 Ou utilisez le script de déploiement complet :"
echo "   ./scripts/deploy-preprod.sh"
echo ""
