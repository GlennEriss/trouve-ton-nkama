#!/bin/bash

# Script pour déployer les règles Firestore sur tous les environnements

set -e

echo "🚀 Déploiement des règles Firestore..."

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour déployer sur un environnement
deploy_rules() {
    local env=$1
    local project_id=$2
    
    echo -e "\n${YELLOW}📦 Déploiement sur l'environnement: $env${NC}"
    echo "   Project ID: $project_id"
    
    firebase use $env
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erreur lors du changement d'environnement: $env${NC}"
        return 1
    fi
    
    firebase deploy --only firestore:rules
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Règles déployées avec succès sur $env${NC}"
    else
        echo -e "${RED}❌ Erreur lors du déploiement sur $env${NC}"
        return 1
    fi
}

# Déployer sur dev
echo -e "\n${YELLOW}=== ENVIRONNEMENT DEV ===${NC}"
read -p "Déployer sur dev? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    deploy_rules "dev" "location-maison-dev"
fi

# Déployer sur preprod
echo -e "\n${YELLOW}=== ENVIRONNEMENT PREPROD ===${NC}"
read -p "Déployer sur preprod? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    deploy_rules "preprod" "location-maison-preprod"
fi

# Déployer sur prod
echo -e "\n${YELLOW}=== ENVIRONNEMENT PROD ===${NC}"
read -p "Déployer sur prod? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    deploy_rules "prod" "location-maison-prod-167da"
fi

echo -e "\n${GREEN}✨ Déploiement terminé!${NC}"
