#!/bin/bash

# Script pour accorder les permissions Secret Manager au service account de la Cloud Function
# 
# Usage:
#   ./scripts/grant-secret-manager-permissions.sh

PROJECT_ID="location-maison-dev"
REGION="us-central1"
FUNCTION_NAME="sendVerificationEmail"

echo "🔐 Configuration des permissions Secret Manager pour la Cloud Function"
echo "📦 Projet: $PROJECT_ID"
echo "🔧 Fonction: $FUNCTION_NAME"
echo ""

# Obtenir le service account de la Cloud Function
# Le format est: PROJECT_ID@appspot.gserviceaccount.com ou 
# PROJECT_NUMBER-compute@developer.gserviceaccount.com
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

echo "👤 Service account: $SERVICE_ACCOUNT"
echo ""

# Vérifier si gcloud est installé
if ! command -v gcloud &> /dev/null; then
  echo "❌ Erreur: gcloud CLI n'est pas installé"
  echo "   Installez-le depuis: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

echo "🔍 Vérification des permissions actuelles..."
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:$SERVICE_ACCOUNT" \
  --format="table(bindings.role)" 2>/dev/null || echo "⚠️  Impossible de récupérer les permissions actuelles"

echo ""
echo "➕ Ajout du rôle 'Secret Manager Secret Accessor'..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Permissions ajoutées avec succès !"
  echo ""
  echo "📋 Prochaines étapes:"
  echo "   1. Redéployez la Cloud Function:"
  echo "      firebase deploy --only functions:sendVerificationEmail --project $PROJECT_ID"
  echo "   2. Testez la fonction:"
  echo "      node scripts/test-cloud-function-email.js <uid>"
else
  echo ""
  echo "❌ Erreur lors de l'ajout des permissions"
  echo "   Vérifiez que vous avez les permissions nécessaires sur le projet"
  exit 1
fi
