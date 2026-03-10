/**
 * Service de gestion des prompts pour l'assistant IA immobilier
 */

export interface FormContext {
  activeStep?: number;
  totalSteps?: number;
  propertyPreview?: any;
  currentFormData?: any;
  factoryType?: string;
}

export class AIPromptsService {
  
  /**
   * Prompt système principal pour l'assistant immobilier
   */
  static getSystemPrompt(): string {
    return `
Tu es un assistant immobilier français expert spécialisé dans l'aide au remplissage de formulaires de propriétés.

CONTEXTE:
- Tu aides des utilisateurs à créer des annonces immobilières de qualité
- Les utilisateurs peuvent publier des maisons, appartements, studios, villas, bureaux, immeubles
- Chaque interaction coûte 1 crédit à l'utilisateur

CAPACITÉS:
- Analyser et améliorer les descriptions de propriétés
- Suggérer des prix appropriés selon le marché
- Recommander des tags pertinents
- Identifier les informations manquantes importantes
- Proposer des améliorations pour augmenter l'attractivité de l'annonce

RÈGLES:
- Réponds TOUJOURS en français
- Sois précis, professionnel et bienveillant
- Donne des conseils pratiques et actionnables
- Si tu ne peux pas répondre avec certitude, dis-le clairement
- Adapte tes réponses au type de propriété (maison, appartement, etc.)
- Prends en compte la localisation (province/ville) pour tes conseils

STYLE:
- Utilise un ton professionnel mais accessible
- Structure tes réponses avec des points clairs
- Utilise des emojis avec parcimonie (🏠, 💡, ✅, etc.)
- Propose des exemples concrets quand c'est pertinent
    `;
  }

  /**
   * Prompt pour analyser un formulaire
   */
  static getFormAnalysisPrompt(formData: any, context?: FormContext): string {
    const stepNames = ['Informations générales', 'Détails de la propriété', 'Localisation', 'Aperçu'];
    const currentStepName = context?.activeStep !== undefined ? stepNames[context.activeStep] : 'Inconnu';
    
    return `
ANALYSE DU FORMULAIRE DEMANDÉE

Étape actuelle: ${currentStepName} (${context?.activeStep !== undefined ? context.activeStep + 1 : '?'}/${context?.totalSteps ?? 4})
Type de propriété: ${context?.factoryType ?? 'Non spécifié'}

DONNÉES ACTUELLES:
${JSON.stringify(formData, null, 2)}

CONSIGNES D'ANALYSE:
1. Identifie les champs manquants critiques pour cette étape
2. Évalue la qualité des informations déjà saisies
3. Propose des améliorations concrètes (description, prix, tags, etc.)
4. Suggère des informations supplémentaires qui augmenteraient l'attractivité
5. Signale d'éventuelles incohérences ou erreurs

Donne une analyse structurée avec:
- ✅ Points forts actuels
- ⚠️ Points à améliorer
- 📝 Suggestions d'amélioration
- 🎯 Recommandations pour la suite
    `;
  }

  /**
   * Prompt pour suggérer des tags
   */
  static getTagSuggestionPrompt(propertyData: any): string {
    return `
SUGGESTION DE TAGS POUR PROPRIÉTÉ

Données de la propriété:
- Type: ${propertyData.propertyType ?? 'Non spécifié'}
- Superficie: ${propertyData.area ?? 'Non spécifiée'} m²
- Prix: ${propertyData.price ?? 'Non spécifié'}€
- Localisation: ${propertyData.city ?? ''}, ${propertyData.province ?? ''}
- Description: ${propertyData.description ?? 'Aucune description'}

CONSIGNES:
1. Propose 4-6 tags pertinents et attractifs
2. Mélange tags descriptifs (ex: "spacieux", "lumineux") et pratiques (ex: "proche transport")
3. Évite les tags trop génériques
4. Adapte selon le type de propriété et la localisation
5. Privilégie les tags qui valorisent la propriété

Format de réponse:
🏷️ Tags suggérés:
- [tag 1]: [raison de ce choix]
- [tag 2]: [raison de ce choix]
...

💡 Tags alternatifs: [liste de tags supplémentaires]
    `;
  }

  /**
   * Prompt pour améliorer une description
   */
  static getDescriptionImprovementPrompt(currentDescription: string, propertyData: any): string {
    return `
AMÉLIORATION DE DESCRIPTION IMMOBILIÈRE

Description actuelle:
"${currentDescription}"

Contexte de la propriété:
- Type: ${propertyData.propertyType ?? 'Non spécifié'}
- Superficie: ${propertyData.area ?? '?'} m²
- Nombre de pièces: ${propertyData.nbrRooms ?? '?'}
- Localisation: ${propertyData.city ?? '?'}, ${propertyData.province ?? '?'}

OBJECTIF:
Réécris cette description pour la rendre plus attractive et professionnelle.

CRITÈRES:
1. Commence par un élément accrocheur
2. Mets en valeur les points forts de la propriété
3. Inclus des détails pratiques importants
4. Utilise un vocabulaire immobilier approprié
5. Reste factuel et honnête
6. Longueur optimale: 100-200 mots
7. Structure avec des paragraphes courts

Propose une version améliorée suivie de 2-3 conseils spécifiques pour l'optimiser davantage.
    `;
  }

  /**
   * Prompt pour estimation de prix
   */
  static getPriceEstimationPrompt(propertyData: any): string {
    return `
ESTIMATION DE PRIX IMMOBILIER

Propriété à évaluer:
- Type: ${propertyData.propertyType ?? 'Non spécifié'}
- Superficie: ${propertyData.area ?? '?'} m²
- Nombre de pièces: ${propertyData.nbrRooms ?? '?'}
- Localisation: ${propertyData.city ?? '?'}, ${propertyData.province ?? '?'}
- État/Caractéristiques: ${propertyData.description ?? 'Non spécifié'}

CONSIGNES:
1. Donne une fourchette de prix réaliste pour cette propriété
2. Explique les facteurs qui influencent ce prix
3. Compare avec le marché local si possible
4. Propose des stratégies de pricing (prix d'appel, prix ferme, etc.)
5. Mentionne les éléments qui pourraient justifier un prix plus élevé

⚠️ IMPORTANT: Précise que c'est une estimation indicative et recommande une évaluation professionnelle pour une transaction réelle.
    `;
  }

  /**
   * Prompt pour conseils de localisation
   */
  static getLocationAdvicePrompt(locationData: any): string {
    return `
CONSEILS LOCALISATION IMMOBILIÈRE

Localisation:
- Rue: ${locationData.street ?? 'Non spécifiée'}
- Ville: ${locationData.city ?? 'Non spécifiée'}
- Province: ${locationData.province ?? 'Non spécifiée'}
- Informations additionnelles: ${locationData.additionalInformation ?? 'Aucune'}

CONSIGNES:
1. Évalue les avantages de cette localisation
2. Identifie les points d'intérêt à mentionner (transports, commerces, écoles, etc.)
3. Suggère des informations additionnelles utiles à ajouter
4. Propose des arguments de vente liés à la localisation
5. Conseille sur la mise en valeur de l'emplacement dans l'annonce

Fournis des conseils pratiques pour valoriser cette localisation dans l'annonce immobilière.
    `;
  }

  /**
   * Prompt pour génération automatique de formulaire
   */
  static getAutoFillPrompt(propertyType: string, propertyLabel: string, requiredFields: string[], userDescription: string): string {
    // Liste des tags autorisés (depuis src/constantes/index.ts)
    const availableTags = [
      'Travail', 'Famille', 'Couple', 'Villa', 'Sous barrière', 'Meublé', 'Centre-ville',
      'Vacances', 'Nature', 'Montagne', 'Piscine', 'Animaux admis', 'Commerces proches',
      'Transport proche', 'Parking', 'Wi-Fi', 'Sécurisé', 'Vélo', 'Activités sportives',
      'Adapté aux enfants', 'Accessible handicapés', 'Étudiant', 'Calme et tranquillité',
      'Proche de la plage'
    ];

    return `
GÉNÉRATION AUTOMATIQUE DE FORMULAIRE IMMOBILIER

TYPE DE PROPRIÉTÉ: ${propertyLabel} (${propertyType})

DESCRIPTION UTILISATEUR:
"${userDescription}"

CHAMPS REQUIS À REMPLIR:
${requiredFields.map(field => `- ${field}`).join('\n')}

TAGS AUTORISÉS (choisir UNIQUEMENT parmi cette liste):
${availableTags.map(tag => `- "${tag}"`).join('\n')}

CONSIGNES STRICTES:
1. Analyse la description utilisateur et génère les informations manquantes de manière cohérente
2. Si une information n'est pas fournie, propose une valeur réaliste basée sur le type de propriété
3. IMPORTANT: Les tags doivent être choisis EXCLUSIVEMENT parmi la liste des tags autorisés ci-dessus
4. Choisis 3-5 tags pertinents maximum
5. Le prix doit être cohérent avec la superficie et le type de bien
6. Tous les nombres doivent être des entiers positifs
7. Le prix doit TOUJOURS être exprimé en FCFA (jamais en euro ou autre devise)
8. Si la superficie n'est pas donnée, mets 0 (n'invente jamais de valeur)
9. Si le prix est donné dans la description utilisateur, tu dois le reprendre tel quel (en FCFA). N'invente jamais un autre prix.
10. Si la superficie est donnée dans la description utilisateur, tu dois la reprendre telle quelle.
11. Le champ "status" est obligatoire et doit valoir exactement "FOR_RENT" ou "FOR_SALE".
12. Si la description contient des indices de location (ex: "loyer", "location", "à louer", "mensuel", "caution"), mets "FOR_RENT".
13. Si la description contient des indices de vente (ex: "vente", "à vendre", "achat", "parcelle"), mets "FOR_SALE".
14. En cas d'ambiguïté, privilégie "FOR_RENT" si un montant mensuel est mentionné; sinon "FOR_SALE".

FORMAT DE RÉPONSE OBLIGATOIRE (JSON strict):
{
  "title": "Titre attractif pour l'annonce",
  "description": "Description détaillée et professionnelle (100-200 mots)",
  "area": superficie_donnée_par_l_utilisateur_ou_0_si_absente,
  "price": prix_en_fcfa_donné_par_l_utilisateur_ou_0_si_absent,
  "status": "FOR_RENT ou FOR_SALE",
  "tags": ["tag1", "tag2", "tag3"],
  "propertyDetails": {
    ${this.getPropertyDetailsFormat(propertyType)}
  },
  "confidence": pourcentage_de_confiance_sur_les_estimations,
  "suggestions": ["conseil1", "conseil2", "conseil3"]
}

EXEMPLE DE TAGS VALIDES pour une maison familiale:
["Famille", "Parking", "Calme et tranquillité", "Commerces proches"]

IMPORTANT: 
- Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après
- Assure-toi que tous les champs numériques sont des nombres entiers
- Les tags doivent être choisis UNIQUEMENT dans la liste autorisée
- Si des informations cruciales manquent, indique-le dans les suggestions
- Le prix doit TOUJOURS être en FCFA, jamais en euro ou autre devise
- Si la superficie n'est pas donnée, mets 0 (n'invente jamais de valeur)
- Si le prix est donné dans la description utilisateur, tu dois le reprendre tel quel (en FCFA). N'invente jamais un autre prix.
- Si la superficie est donnée dans la description utilisateur, tu dois la reprendre telle quelle.
- Le champ "status" doit être "FOR_RENT" ou "FOR_SALE" et cohérent avec le texte source.
    `;
  }

  /**
   * Format des détails de propriété selon le type
   */
  private static getPropertyDetailsFormat(propertyType: string): string {
    switch (propertyType) {
      case 'home':
        return `
    "nbrRooms": nombre_de_chambres,
    "nbrChickens": nombre_de_cuisines,
    "nbrBathrooms": nombre_de_salles_de_bain,
    "nbrToilets": nombre_de_toilettes,
    "nbrGarages": nombre_de_garages,
    "nbrFloors": nombre_d_etages,
    "nbrLivingRoom": nombre_de_salons`;

      case 'apartment':
        return `
    "nbrRooms": nombre_de_chambres,
    "nbrChickens": nombre_de_cuisines,
    "nbrBathrooms": nombre_de_salles_de_bain,
    "nbrToilets": nombre_de_toilettes,
    "nbrFloorApartment": numero_d_etage,
    "numeroApartment": "numero_appartement"`;

      case 'villa':
        return `
    "nbrRooms": nombre_de_chambres,
    "nbrChickens": nombre_de_cuisines,
    "nbrBathrooms": nombre_de_salles_de_bain,
    "nbrToilets": nombre_de_toilettes,
    "nbrFloors": nombre_d_etages,
    "nbrPiscine": nombre_de_piscines,
    "nbrGarages": nombre_de_garages`;

      case 'studio':
        return `
    "nbrRooms": nombre_de_chambres,
    "nbrChickens": nombre_de_cuisines,
    "nbrBathrooms": nombre_de_salles_de_bain,
    "nbrToilets": nombre_de_toilettes,
    "nbrFloorStudio": numero_d_etage,
    "numeroStudio": "numero_studio"`;

      case 'building':
        return `
    "nbrApartments": nombre_d_appartements,
    "nbrFloors": nombre_d_etages,
    "hasParking": true_ou_false`;

      case 'desk':
        return `
    "nbrToilets": nombre_de_toilettes,
    "nbrRooms": nombre_de_pieces`;

      case 'shop':
        return `
    "nbrRooms": nombre_de_pieces,
    "nbrToilet": nombre_de_toilettes`;

      case 'kiosk':
        return `
    "kioskType": "type_de_kiosque"`;

      case 'room':
        return `
    "roomType": "type_de_chambre"`;

      default:
        return '"additionalInfo": "informations_supplementaires"';
    }
  }

  /**
   * Utilitaire pour construire un prompt contextualisé
   */
  static buildContextualPrompt(userMessage: string, context: FormContext): string {
    const systemPrompt = this.getSystemPrompt();
    
    let contextInfo = '';
    if (context.activeStep !== undefined) {
      const stepNames = ['Informations générales', 'Détails de la propriété', 'Localisation', 'Aperçu'];
      contextInfo += `\nÉTAPE ACTUELLE: ${stepNames[context.activeStep]} (${context.activeStep + 1}/${context.totalSteps})\n`;
    }
    
    if (context.currentFormData) {
      contextInfo += `\nDONNÉES DU FORMULAIRE:\n${JSON.stringify(context.currentFormData, null, 2)}\n`;
    }

    // Ajout des règles strictes pour la superficie et la devise
    const rules = `\n\nRègles importantes :\n- Si la superficie n'est pas précisée par l'utilisateur, indique 0 pour la superficie (n'invente jamais de valeur).\n- Le prix doit toujours être exprimé en FCFA, jamais en euro ou autre devise.\n`;

    return `${systemPrompt}\n${contextInfo}${rules}\nQUESTION UTILISATEUR: ${userMessage}\n\nRéponds de manière utile et précise:`;
  }
}

export default AIPromptsService; 
