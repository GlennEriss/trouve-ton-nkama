#!/bin/bash

# Script de déploiement pour la préprod
# Ce script déploie les Cloud Functions, les règles Firestore et les index Firestore

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement en préprod"
echo "=========================="
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que Firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI n'est pas installé${NC}"
    echo "Installez-le avec: npm install -g firebase-tools"
    exit 1
fi

# Vérifier que l'utilisateur est connecté à Firebase
echo "🔐 Vérification de la connexion Firebase..."
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vous n'êtes pas connecté à Firebase${NC}"
    echo "Connexion..."
    firebase login
fi

# Vérifier que le projet préprod existe
echo ""
echo "📋 Vérification du projet préprod..."
PROJECT_ID=$(firebase use preprod 2>&1 | grep -o 'location-maison-preprod' || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Le projet préprod n'est pas configuré${NC}"
    echo "Vérifiez votre fichier .firebaserc"
    exit 1
fi

echo -e "${GREEN}✅ Projet préprod: location-maison-preprod${NC}"

# Confirmation avant déploiement
echo ""
echo -e "${YELLOW}⚠️  Vous êtes sur le point de déployer en PRÉPROD${NC}"
read -p "Continuer? (oui/non): " confirm
if [ "$confirm" != "oui" ]; then
    echo "Déploiement annulé"
    exit 0
fi

# 1. Déployer les Cloud Functions
echo ""
echo "📦 Étape 1/3: Déploiement des Cloud Functions..."
echo "================================================"
cd functions

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📥 Installation des dépendances..."
    npm install
fi

# Build des fonctions
echo "🔨 Compilation des fonctions TypeScript..."
npm run build

# Vérifier que les secrets sont configurés
echo ""
echo "🔐 Vérification des secrets Firebase..."
SECRETS=("HOSTINGER_EMAIL_USER" "HOSTINGER_EMAIL_PASS" "EMAIL_DISPLAY_NAME" "NEXT_PUBLIC_APP_URL")
MISSING_SECRETS=()

for secret in "${SECRETS[@]}"; do
    if ! firebase functions:secrets:access "$secret" --project location-maison-preprod &> /dev/null; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Secrets manquants: ${MISSING_SECRETS[*]}${NC}"
    echo ""
    echo "💡 Les secrets peuvent être configurés automatiquement depuis .env.local.preprod :"
    echo "   ./scripts/configure-firebase-secrets-preprod.sh"
    echo ""
    echo "Ou manuellement avec :"
    echo "   firebase functions:secrets:set SECRET_NAME --project location-maison-preprod"
    echo ""
    read -p "Configurer les secrets maintenant depuis .env.local.preprod? (oui/non): " configure_secrets
    if [ "$configure_secrets" == "oui" ]; then
        if [ -f "scripts/configure-firebase-secrets-preprod.sh" ]; then
            ./scripts/configure-firebase-secrets-preprod.sh
        else
            echo -e "${RED}❌ Script de configuration des secrets non trouvé${NC}"
            read -p "Continuer quand même? (oui/non): " continue_without_secrets
            if [ "$continue_without_secrets" != "oui" ]; then
                echo "Déploiement annulé"
                exit 1
            fi
        fi
    else
        read -p "Continuer quand même? (oui/non): " continue_without_secrets
        if [ "$continue_without_secrets" != "oui" ]; then
            echo "Déploiement annulé"
            exit 1
        fi
    fi
fi

# Déployer les fonctions
echo ""
echo "🚀 Déploiement des Cloud Functions..."
firebase deploy --only functions --project location-maison-preprod

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Cloud Functions déployées avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors du déploiement des Cloud Functions${NC}"
    exit 1
fi

cd ..

# 2. Déployer les règles Firestore
echo ""
echo "📜 Étape 2/3: Déploiement des règles Firestore..."
echo "=================================================="
firebase deploy --only firestore:rules --project location-maison-preprod

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Règles Firestore déployées avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors du déploiement des règles Firestore${NC}"
    exit 1
fi

# 3. Déployer les index Firestore
echo ""
echo "📊 Étape 3/3: Déploiement des index Firestore..."
echo "================================================"

# Vérifier que le fichier firestore.indexes.json existe
if [ ! -f "firestore.indexes.json" ]; then
    echo -e "${YELLOW}⚠️  Fichier firestore.indexes.json non trouvé${NC}"
    echo "Création d'un fichier vide..."
    echo '{"indexes": [], "fieldOverrides": []}' > firestore.indexes.json
fi

firebase deploy --only firestore:indexes --project location-maison-preprod

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Index Firestore déployés avec succès${NC}"
    echo ""
    echo -e "${YELLOW}ℹ️  Note: Les index peuvent prendre quelques minutes à être créés${NC}"
    echo "Vérifiez leur statut dans la console Firebase: https://console.firebase.google.com/project/location-maison-preprod/firestore/indexes"
else
    echo -e "${RED}❌ Erreur lors du déploiement des index Firestore${NC}"
    exit 1
fi

# Résumé
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Déploiement terminé avec succès!${NC}"
echo "=========================================="
echo ""
echo "📋 Résumé:"
echo "  ✅ Cloud Functions déployées"
echo "  ✅ Règles Firestore déployées"
echo "  ✅ Index Firestore déployés"
echo ""
echo "🔗 Liens utiles:"
echo "  - Console Firebase: https://console.firebase.google.com/project/location-maison-preprod"
echo "  - Cloud Functions: https://console.firebase.google.com/project/location-maison-preprod/functions"
echo "  - Firestore: https://console.firebase.google.com/project/location-maison-preprod/firestore"
echo "  - Index Firestore: https://console.firebase.google.com/project/location-maison-preprod/firestore/indexes"
echo ""
