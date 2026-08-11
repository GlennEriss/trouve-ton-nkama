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
15. N'utilise JAMAIS le texte utilisateur brut comme description finale. Réécris-le en annonce claire, attractive et professionnelle.
16. Le titre doit être vendeur et contextualisé, pas seulement le type de bien. Exemple: "Belle chambre à louer à Akébé Poteau", pas "Chambre".
17. Comprends les formats de prix locaux:
   - "40 k", "40k", "40 mille", "40.000", "40 000" = 40000 FCFA
   - "1,5 million", "1.5 million", "1 500 000" = 1500000 FCFA
   - Ne confonds jamais un numéro de téléphone avec un prix.
18. Conserve les détails utiles: quartier, conditions d'entrée, charges, douche/toilettes, contact si présent.
19. Tu dois extraire toi-même la localisation, le contact et les conditions depuis la description utilisateur.
20. Pour "address", mets le quartier/la zone dans "district", la ville dans "city" et la province dans "province" si ces informations sont présentes ou déductibles.
21. Si tu ne connais pas les coordonnées GPS exactes, mets 0 pour longitude, latitude, provinceLon, provinceLat, cityLon, cityLat, streetLon et streetLat.
22. Ne laisse pas un champ important vide si l'information est clairement donnée dans la description utilisateur.
23. "contact" doit TOUJOURS être un seul numéro de téléphone. Si la description en donne plusieurs, ne garde que le premier — ne les concatène jamais avec "/", "," ou "et".

FORMAT DE RÉPONSE OBLIGATOIRE (JSON strict):
{
  "title": "Titre attractif pour l'annonce",
  "description": "Description détaillée et professionnelle (100-200 mots)",
  "area": 0,
  "price": 0,
  "status": "FOR_RENT",
  "tags": ["tag1", "tag2", "tag3"],
  "address": {
    "district": "quartier_ou_zone_extraite_ou_chaine_vide",
    "city": "ville_extraite_ou_deduite_ou_chaine_vide",
    "province": "province_extraite_ou_deduite_ou_chaine_vide"
  },
  "longitude": 0,
  "latitude": 0,
  "provinceLon": 0,
  "provinceLat": 0,
  "cityLon": 0,
  "cityLat": 0,
  "streetLon": 0,
  "streetLat": 0,
  "countryCode": "GA",
  "country": "Gabon",
  "additionnalInformation": "complement_de_localisation_ou_conditions_utiles_ou_chaine_vide",
  "contact": "numero_de_telephone_extrait_ou_chaine_vide",
  "isOwner": false,
  "propertyDetails": {
    ${this.getPropertyDetailsFormat(propertyType)}
  },
  "confidence": 85,
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
- Pour "isOwner", mets true seulement si le texte indique clairement que l'utilisateur est propriétaire; sinon mets false.
- La description finale doit être une reformulation professionnelle, jamais une copie brute du texte utilisateur.
- Toute l'interprétation doit venir de toi: prix, titre, description, statut, contact, localisation et détails du bien.
    `;
  }

  /**
   * Format des détails de propriété selon le type
   */
  private static getPropertyDetailsFormat(propertyType: string): string {
    switch (propertyType) {
      case 'home':
        return `
    "nbrRooms": 0,
    "nbrKitchens": 0,
    "nbrBathrooms": 0,
    "nbrToilets": 0,
    "nbrGarages": 0,
    "nbrFloors": 0,
    "nbrLivingRoom": 0`;

      case 'apartment':
        return `
    "nbrRooms": 0,
    "nbrKitchens": 0,
    "nbrBathrooms": 0,
    "nbrToilets": 0,
    "nbrFloorApartment": 0,
    "numeroApartment": ""`;

      case 'villa':
        return `
    "nbrRooms": 0,
    "nbrKitchens": 0,
    "nbrBathrooms": 0,
    "nbrToilets": 0,
    "nbrFloors": 0,
    "nbrPiscine": 0,
    "nbrGarages": 0`;

      case 'studio':
        return `
    "nbrRooms": 0,
    "nbrKitchens": 0,
    "nbrBathrooms": 0,
    "nbrToilets": 0,
    "nbrFloorStudio": 0,
    "numeroStudio": ""`;

      case 'building':
        return `
    "nbrApartments": 0,
    "nbrFloors": 0,
    "hasParking": false`;

      case 'desk':
        return `
    "nbrToilets": 0,
    "nbrRooms": 0`;

      case 'shop':
        return `
    "nbrRooms": 0,
    "nbrToilet": 0`;

      case 'kiosk':
        return `
    "kioskType": ""`;

      case 'room':
        return `
    "roomType": ""`;

      default:
        return '"additionalInfo": ""';
    }
  }

  /**
   * Types de bien que l'IA peut détecter, avec un indice FR d'une ligne pour
   * l'aider à choisir — mêmes 12 types que `DirectorFactory.createDirectorProperty`
   * (apps/location-maison/src/directors/factory.director.ts), le seul autre
   * point qui accepte un `typeProperty` de création. Défini localement ici
   * (pas `PROPERTY_TYPE_LABELS` de usePropertyType.ts, qui ne couvre que 10
   * types et sert au routing d'URL de l'ancien formulaire — pas touché).
   */
  private static readonly TYPE_DETECTION_HINTS: Record<string, string> = {
    Studio: 'une seule grande pièce à vivre (chambre+salon confondus), avec cuisine et salle de bain',
    Apartment: 'un logement dans un immeuble à plusieurs appartements, avec un numéro et un étage',
    Home: 'une maison individuelle de plain-pied ou à étages, sans piscine mise en avant',
    Villa: 'une maison individuelle haut standing, souvent avec piscine',
    Duplex: 'un logement sur deux niveaux internes reliés par un escalier intérieur',
    Building: "un immeuble entier avec plusieurs appartements à louer/vendre en bloc",
    Room: "une chambre simple louée séparément dans une maison partagée (chambre américaine, etc.)",
    Kiosk: 'un petit local commercial autonome (kiosque, cabine)',
    Shop: 'un local commercial de type boutique/magasin',
    Desk: 'un bureau ou espace de travail professionnel',
    Warehouse: "un entrepôt ou hangar de stockage/logistique",
    Land: 'un terrain nu, sans construction',
  };

  /**
   * Bloc `propertyDetails` attendu pour chaque type — repris tel quel de
   * {@link getPropertyDetailsFormat} (mêmes noms de champs), pour que l'objet
   * assemblé côté client corresponde exactement aux schémas zod par type
   * (apps/location-maison/src/models/schema.ts).
   */
  private static readonly TYPE_DETAILS_REFERENCE: Record<string, string> = {
    Home: '{ "nbrRooms": 0, "nbrKitchens": 0, "nbrBathrooms": 0, "nbrToilets": 0, "nbrGarages": 0, "nbrFloors": 0, "nbrLivingRoom": 0 }',
    Apartment: '{ "nbrRooms": 0, "nbrKitchens": 0, "nbrBathrooms": 0, "nbrToilets": 0, "nbrFloorApartment": 0, "numeroApartment": "" }',
    Villa: '{ "nbrRooms": 0, "nbrKitchens": 0, "nbrBathrooms": 0, "nbrToilets": 0, "nbrFloors": 0, "nbrPiscine": 0, "nbrGarages": 0 }',
    Studio: '{ "nbrRooms": 0, "nbrKitchens": 0, "nbrBathrooms": 0, "nbrToilets": 0, "nbrFloorStudio": 0, "numeroStudio": "" }',
    Duplex: '{ "nbrRooms": 0, "nbrKitchens": 0, "nbrBathrooms": 0, "nbrToilets": 0, "nbrFloors": 0, "nbrLivingRoom": 0, "nbrGarages": 0 }',
    Building: '{ "nbrApartments": 0, "nbrFloors": 0, "hasParking": false }',
    Desk: '{ "nbrToilets": 0, "nbrRooms": 0 }',
    Shop: '{ "nbrRooms": 0, "nbrToilet": 0 }',
    Warehouse: '{ "nbrSections": 0, "nbrToilets": 0 }',
    Kiosk: '{ "kioskType": "" }',
    Room: '{ "roomType": "" }',
    Land: '{}',
  };

  /**
   * Variante de {@link getAutoFillPrompt} qui laisse l'IA déterminer elle-même
   * le type de bien depuis la description (au lieu de le recevoir déjà fixé
   * par l'URL `/property/add/{type}`) — pour la page de création assistée
   * `/property/create`. Règles de contenu (prix, statut, tags, isOwner,
   * localisation) reprises à l'identique de `getAutoFillPrompt`, volontairement
   * dupliquées plutôt que factorisées pour ne rien risquer sur le prompt
   * existant, encore utilisé par l'assistant du formulaire classique.
   */
  static getAutoFillPromptWithTypeDetection(userDescription: string): string {
    const availableTags = [
      'Travail', 'Famille', 'Couple', 'Villa', 'Sous barrière', 'Meublé', 'Centre-ville',
      'Vacances', 'Nature', 'Montagne', 'Piscine', 'Animaux admis', 'Commerces proches',
      'Transport proche', 'Parking', 'Wi-Fi', 'Sécurisé', 'Vélo', 'Activités sportives',
      'Adapté aux enfants', 'Accessible handicapés', 'Étudiant', 'Calme et tranquillité',
      'Proche de la plage'
    ];

    const typeHints = Object.entries(this.TYPE_DETECTION_HINTS)
      .map(([type, hint]) => `- "${type}": ${hint}`)
      .join('\n');

    const detailsReference = Object.entries(this.TYPE_DETAILS_REFERENCE)
      .map(([type, shape]) => `  "${type}": ${shape}`)
      .join('\n');

    return `
GÉNÉRATION AUTOMATIQUE D'ANNONCE IMMOBILIÈRE (avec détection du type de bien)

DESCRIPTION UTILISATEUR:
"${userDescription}"

ÉTAPE 1 — DÉTERMINE LE TYPE DE BIEN décrit, en choisissant EXACTEMENT une valeur parmi:
${typeHints}

ÉTAPE 2 — Remplis l'annonce complète, y compris le bloc "propertyDetails" QUI DOIT CORRESPONDRE UNIQUEMENT au type choisi, avec exactement ces champs selon le type (ne mélange jamais les champs de deux types) :
${detailsReference}

TAGS AUTORISÉS (choisir UNIQUEMENT parmi cette liste):
${availableTags.map(tag => `- "${tag}"`).join('\n')}

CONSIGNES STRICTES:
1. Analyse la description utilisateur et génère les informations manquantes de manière cohérente.
2. Si une information n'est pas fournie, propose une valeur réaliste basée sur le type de propriété détecté.
3. IMPORTANT: Les tags doivent être choisis EXCLUSIVEMENT parmi la liste des tags autorisés ci-dessus.
4. Choisis 3-5 tags pertinents maximum.
5. Le prix doit être cohérent avec la superficie et le type de bien.
6. Tous les nombres doivent être des entiers positifs.
7. Le prix doit TOUJOURS être exprimé en FCFA (jamais en euro ou autre devise).
8. Si la superficie n'est pas donnée, mets 0 (n'invente jamais de valeur).
9. Si le prix est donné dans la description utilisateur, tu dois le reprendre tel quel (en FCFA). N'invente jamais un autre prix.
10. Si la superficie est donnée dans la description utilisateur, tu dois la reprendre telle quelle.
11. Le champ "status" est obligatoire et doit valoir exactement "FOR_RENT" ou "FOR_SALE".
12. Si la description contient des indices de location (ex: "loyer", "location", "à louer", "mensuel", "caution"), mets "FOR_RENT".
13. Si la description contient des indices de vente (ex: "vente", "à vendre", "achat", "parcelle"), mets "FOR_SALE".
14. En cas d'ambiguïté, privilégie "FOR_RENT" si un montant mensuel est mentionné; sinon "FOR_SALE".
15. N'utilise JAMAIS le texte utilisateur brut comme description finale. Réécris-le en annonce claire, attractive et professionnelle.
16. Le titre doit être vendeur et contextualisé, pas seulement le type de bien. Exemple: "Belle chambre à louer à Akébé Poteau", pas "Chambre".
17. Comprends les formats de prix locaux:
   - "40 k", "40k", "40 mille", "40.000", "40 000" = 40000 FCFA
   - "1,5 million", "1.5 million", "1 500 000" = 1500000 FCFA
   - Ne confonds jamais un numéro de téléphone avec un prix.
18. Conserve les détails utiles: quartier, conditions d'entrée, charges, douche/toilettes, contact si présent.
19. Tu dois extraire toi-même la localisation, le contact et les conditions depuis la description utilisateur.
20. Pour "address", mets le quartier/la zone dans "district", la ville dans "city" et la province dans "province" si ces informations sont présentes ou déductibles.
21. Si tu ne connais pas les coordonnées GPS exactes, mets 0 pour longitude, latitude, provinceLon, provinceLat, cityLon, cityLat, streetLon et streetLat.
22. Ne laisse pas un champ important vide si l'information est clairement donnée dans la description utilisateur.
23. Si le type de bien n'est pas clair, choisis le plus probable — ne laisse JAMAIS "typeProperty" vide.
24. RÈGLE STRICTE SUR LES NUMÉROS DE TÉLÉPHONE — repère TOUS les numéros présents dans la description
    (il peut y en avoir 1, 2, 3 ou plus — propriétaire, agent, membre de la famille...). Aucun champ
    ("contact", "whatsappContact", "callContact", ni un élément de "additionalContacts") ne doit JAMAIS
    contenir plusieurs numéros collés ensemble (interdit: "066180344 / 066575165" — un seul numéro par
    valeur, toujours) :
    - Un seul numéro → "contact" = ce numéro, "whatsappContact"/"callContact" vides, "additionalContacts" = [].
    - Deux numéros ET la description précise explicitement leur rôle (ex: "WhatsApp: X", "Appel/Tel: Y") →
      "whatsappContact" = le numéro WhatsApp, "callContact" = le numéro d'appel, "contact" = le numéro
      d'appel (ou le premier mentionné si pas de numéro d'appel identifié), "additionalContacts" = [].
    - Deux numéros ou plus SANS rôle précisé (cas fréquent : plusieurs numéros donnés à la suite, sans
      préciser lequel est WhatsApp/lequel est pour appeler) → "contact" = le premier numéro,
      "whatsappContact"/"callContact" vides, et TOUS les numéros restants dans "additionalContacts"
      (un numéro par élément du tableau) — ne les laisse jamais de côté.
    - "additionalContacts" contient au maximum 4 numéros supplémentaires (5 numéros au total avec "contact").

FORMAT DE RÉPONSE OBLIGATOIRE (JSON strict):
{
  "typeProperty": "Studio",
  "title": "Titre attractif pour l'annonce",
  "description": "Description détaillée et professionnelle (100-200 mots)",
  "area": 0,
  "price": 0,
  "status": "FOR_RENT",
  "tags": ["tag1", "tag2", "tag3"],
  "address": {
    "district": "quartier_ou_zone_extraite_ou_chaine_vide",
    "city": "ville_extraite_ou_deduite_ou_chaine_vide",
    "province": "province_extraite_ou_deduite_ou_chaine_vide"
  },
  "longitude": 0,
  "latitude": 0,
  "provinceLon": 0,
  "provinceLat": 0,
  "cityLon": 0,
  "cityLat": 0,
  "streetLon": 0,
  "streetLat": 0,
  "countryCode": "GA",
  "country": "Gabon",
  "additionnalInformation": "complement_de_localisation_ou_conditions_utiles_ou_chaine_vide",
  "contact": "UN_SEUL_numero_de_telephone_ou_chaine_vide",
  "whatsappContact": "numero_whatsapp_UNIQUEMENT_si_explicitement_distinct_sinon_chaine_vide",
  "callContact": "numero_appel_UNIQUEMENT_si_explicitement_distinct_sinon_chaine_vide",
  "additionalContacts": ["numero_supplementaire_1", "numero_supplementaire_2"],
  "isOwner": false,
  "propertyDetails": { },
  "confidence": 85,
  "suggestions": ["conseil1", "conseil2", "conseil3"]
}

IMPORTANT:
- Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après.
- "typeProperty" doit être EXACTEMENT l'une des 12 valeurs listées à l'étape 1, respecte la casse exacte (ex: "Studio", pas "studio").
- "propertyDetails" doit contenir EXACTEMENT les champs du type choisi (voir étape 2), aucun champ en plus ou en moins.
- Assure-toi que tous les champs numériques sont des nombres entiers.
- Les tags doivent être choisis UNIQUEMENT dans la liste autorisée.
- Le prix doit TOUJOURS être en FCFA, jamais en euro ou autre devise.
- Pour "isOwner", mets true seulement si le texte indique clairement que l'utilisateur est propriétaire; sinon mets false.
- La description finale doit être une reformulation professionnelle, jamais une copie brute du texte utilisateur.
- "contact" est TOUJOURS un seul numéro — jamais deux numéros séparés par "/", "," ou "et" (voir règle 24).
- "additionalContacts" est un tableau d'UN numéro par élément (jamais deux numéros dans un même élément) — [] si aucun numéro supplémentaire.
    `;
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
