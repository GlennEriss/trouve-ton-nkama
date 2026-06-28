# Feature — Publicité (Régie publicitaire first-party)

> **Documentation-only** (aucun code dans ce document). Spécification fonctionnelle
> et technique du module qui permet à des **entreprises / marques / services**
> de promouvoir leur activité sur la plateforme, contre paiement.
>
> Côté back-office, voir : `../../../location-maison-admin/docs/REGIE-PUBLICITAIRE-CONCIERGE-SPEC.md`

## 1. Objectif

Permettre à un commerçant, une marque ou un prestataire (restaurant, garage,
salon, école, événement…) d'**afficher une publicité** sur les pages de la
plateforme, afin de toucher notre audience locale (intention immobilière +
trafic Gabon).

Le service est **payant** et facturé via le **système de crédits existant**
(rechargé en Airtel Money).

## 2. Vocabulaire — éviter LA confusion ⚠️

La plateforme manipule **trois notions distinctes** qu'il ne faut pas mélanger :

| Notion | Définition | Existant |
|---|---|---|
| **Annonce (immobilier)** | Un bien posté par un *annonceur* (rôle `announcer`) sur `/property`. | ✅ existant |
| **Promotion d'annonce** | Le *boost* payant d'une annonce immobilière (`Promotion`: `featured` / `trending-7d` / `boost`). | ✅ existant (`models/annonce.d.ts`) |
| **Publicité (ce module)** | Une **pub d'entreprise externe** (pas de l'immobilier), vendue par la plateforme. | 🆕 ce document |

Pour ne pas écraser le rôle `announcer` (immobilier), le module pub introduit un
vocabulaire propre :

- **Annonceur publicitaire** (user-facing) = l'entreprise qui paie la pub → entité code suggérée **`Advertiser`**.
- **Campagne** = le produit vendu → **`AdCampaign`**.
- **Créa / visuel** = l'image + le lien de la pub → **`AdCreative`** (intégré à la campagne en V1).
- **Emplacement (slot)** = l'endroit où s'affiche la pub.

> Nom de code module suggéré : `src/features/advertising` (distinct de
> `src/components/ads` & `src/lib/ads` qui gèrent **AdSense**, et de
> `src/features/announcer` qui gère l'immobilier).

## 3. Positionnement vs AdSense

La plateforme sert déjà des pubs **AdSense** (revenus Google, faibles : ~1,40 €,
cf. `location-maison-admin/docs/MONETISATION-PUBS-ADSENSE-SPEC.md`).

La régie first-party et AdSense sont deux inventaires indépendants :

```
Pour une zone pub donnée :
  1. Campagne publicitaire maison ACTIVE et éligible ? → on l'affiche
  2. L'unité AdSense associée reste affichée aussi
```

→ La pub maison ne remplace pas AdSense. AdSense n'est pas un backfill de la
régie maison ; il garde ses propres emplacements et sa propre logique de rendu.

## 4. Décisions V1 (validées)

| Sujet | Décision V1 |
|---|---|
| **Modèle opérationnel** | **Concierge** : l'admin crée/publie la pub pour le client. Self-serve = phase 2. |
| **Tarification** | **Montant en FCFA saisi par l'admin** (le client paie en direct). Les **crédits** restent le moyen de paiement **des utilisateurs** (promotion d'annonce ; pub self-serve = phase 2). |
| **Emplacements** | **Search in-feed**, **Détail annonce**, **Accueil**, **Pages immobilier**. |

## 5. Emplacements V1 (inventaire)

Réutilise la matrice de placements déjà définie pour AdSense (§13-14 de la spec
monétisation), donc cohérence visuelle et règles de densité identiques.

| Emplacement | Page | Position | Format conseillé |
|---|---|---|---|
| `search_infeed` | `/search` | inséré dans la grille (cadence : desktop après ~8e carte, mobile après ~6e) | carte sponsorisée responsive |
| `property_detail` | `/houseDetails/[id]` | bloc entre le détail et les recommandations | bannière responsive |
| `home` | `/` | bloc/bannière discrète | bannière responsive |
| `immobilier_infeed` | `/immobilier/*` | in-feed dans la grille SEO | carte sponsorisée responsive |

Règles reprises de l'existant : 1 emplacement produit = 1 slot, formats
responsive, pas d'empilement de 2 pubs consécutives, label **« Sponsorisé »**
obligatoire.

## 6. Modèle de données (Firestore)

Aligné sur les types existants (`models/annonce.d.ts` pour le pattern
`Promotion`, `models/credit-transaction.d.ts` pour la facturation).

### `advertisers` (annonceurs publicitaires)
```
id, name, businessName, contactPhone, contactEmail,
ownerUid (nullable: rattaché à un compte user si self-serve plus tard),
createdByAdminUid, createdAt, updatedAt, notes
```

### `ad_campaigns`
```
id
advertiserId
title
creative: {
  imagePATH, imageURL,         // visuel (réutilise le pattern Image existant)
  headline, body,              // textes courts
  ctaLabel,                    // ex: "Appeler", "WhatsApp", "Voir"
  ctaUrl                       // lien externe / wa.me / tel:
}
placements: AdPlacement[]       // sous-ensemble de la liste §5
targeting?: {                   // optionnel V1 (réutilise la géo Gabon)
  provinces?: string[]
  cities?: string[]
}
startDate, endDate              // Timestamp (même logique que Promotion)
status: 'draft'|'pending_review'|'scheduled'|'active'|'paused'|'ended'|'rejected'
priority: number                // arbitrage si plusieurs campagnes éligibles
billing: {                      // V1 concierge = montant FCFA saisi par l'admin
  mode: 'admin_amount' | 'user_credits'   // V1 = 'admin_amount'
  amount?: number               // montant payé en FCFA (mode admin_amount)
  currency?: 'XAF'
  paymentMethod?: string        // espèces / virement / Airtel direct / autre
  paymentReference?: string     // n° reçu / référence transaction
  paidAt?: Timestamp
  paymentStatus: 'unpaid' | 'paid' | 'refunded'
  creditsUsed?: number          // uniquement si mode 'user_credits' (phase 2)
}
createdByAdminUid               // V1 = toujours l'admin (concierge)
metrics: { impressions, clicks } // compteurs dénormalisés (cf. §9)
createdAt, updatedAt
```

`AdPlacement` = `'search_infeed' | 'property_detail' | 'home' | 'immobilier_infeed'`.

### Facturation
- **V1 (concierge)** : paiement **direct**. Le client donne un **montant** à l'admin (espèces, virement, Airtel direct…). L'admin enregistre ce **montant en FCFA** sur la campagne (`billing.mode = 'admin_amount'`, `amount`, `paymentMethod`, `paymentReference`, `paidAt`). **Aucun crédit n'est utilisé.**
- **Phase 2 (self-serve)** : un **utilisateur** paie **en crédits** → réutilise `credit_transactions` (`type: 'spend'`, `service: 'advertising_campaign'`, `+ campaignId`). Les crédits sont le moyen de paiement **des utilisateurs**, jamais de l'admin.

## 7. Rendu côté plateforme (serving)

Un composant unique **`<SponsoredSlot placement="search_infeed" context={...} />`** :

1. Côté serveur, sélectionne **une** campagne `active` éligible pour ce
   `placement` (+ ciblage géo éventuel via le `context` de la page).
2. Si trouvée → rend la **créa** + un libellé **« Sponsorisé »** + tracking
   impression/clic.
3. Rend aussi l'unité AdSense configurée pour la zone ; AdSense n'est pas
   conditionné par l'existence d'une campagne maison.

Sélection V1 (simple, pas d'enchère) : campagnes éligibles triées par
`priority` puis date de création ; rotation simple si plusieurs.

## 8. Tarification (montant FCFA — V1 concierge)

Ancrage concurrentiel : Facebook ≈ **700 FCFA/jour**. En V1 l'admin facture un
**montant en FCFA** (le client paie en direct) selon un barème forfaitaire :

| Forfait | Durée | Emplacements | Prix (FCFA) |
|---|---|---|---|
| Découverte | 7 j | 1 | ~5 000 |
| Visibilité | 14 j | jusqu'à 2 | ~12 000 |
| Marque | 30 j | tous (4) | ~25 000 |

> Le barème est **piloté par l'admin** (modifiable sans redéploiement, comme les
> `credit_packs`). Chiffres à valider après test marché.
>
> **Phase 2 (self-serve)** : ces mêmes forfaits seront proposés aux utilisateurs
> **en crédits** (1 crédit ≈ 250–400 FCFA, `lib/credits/credit-packs.ts`), via
> le rail crédits + Airtel existant.

## 9. Mesure & reporting

Réutilise l'instrumentation **`ads_slot_events`** déjà spécifiée
(`ad_slot_rendered`, `ad_impression`, `ad_click`), en ajoutant la dimension
`campaign_id`. Compteurs dénormalisés sur `ad_campaigns.metrics` pour
l'affichage rapide. L'annonceur (et l'admin) voit : **impressions, clics, CTR,
jours restants**.

## 10. Parcours V1 — concierge

1. Le client contacte la plateforme (formulaire de contact / WhatsApp / page « Faire de la pub »).
2. L'admin crée la fiche **annonceur publicitaire** + la **campagne** (visuel, lien, emplacements, durée).
3. Le client paie en direct ; l'admin **enregistre le montant payé (FCFA)** sur la campagne (méthode + référence). Pas de crédits.
4. L'admin **publie** → la campagne devient `active`, la pub s'affiche sur les emplacements choisis.
5. Suivi des métriques ; à `endDate` → `ended` automatiquement.

Côté plateforme publique V1, prévoir uniquement :
- une page **« Faire de la pub »** (landing simple : bénéfices, formats, tarifs, bouton contact/WhatsApp) ;
- le rendu **`SponsoredSlot`** sur les 4 emplacements.

## 11. Simplicité pour l'annonceur (exigence produit)

Même en self-serve (phase 2), une campagne = **un seul écran, peu de champs** :
visuel + titre + lien (tel/WhatsApp/URL) + durée + emplacement. Aucune notion
d'enchère, de pixel, d'audience complexe. Objectif : « je mets ma pub en 2
minutes ».

## 12. Conformité & garde-fous

- **Modération** du visuel avant publication (admin) ; statut `rejected` motivé.
- Label **« Sponsorisé »** systématique (séparation pub / contenu).
- Contenus interdits : illégaux, trompeurs, hors-charte.
- Ne pas dégrader l'UX (densité, pas d'overlay agressif) — mêmes règles qu'AdSense.
- Toute action est **tracée** (cf. audit admin).

## 13. Hors-scope V1 → Phase 2

- **Self-serve** complet (compte annonceur pub, éditeur de campagne, paiement auto, modération en file).
- Ciblage avancé (device, centres d'intérêt), A/B testing créa.
- Enchères / budget journalier dynamique.
- Facturation à la performance (CPC/CPM).

## 14. Sources de référence (plateforme)

- `src/models/annonce.d.ts` (pattern `Promotion`)
- `src/models/credit-transaction.d.ts` (facturation crédits)
- `src/lib/credits/credit-packs.ts`, `src/constantes/credit-packs.ts`
- `src/components/ads/*`, `src/lib/ads/*` (AdSense / fallback)
- `src/constantes/gabon-locations.ts` (ciblage géo)
- Spec admin AdSense : `location-maison-admin/docs/MONETISATION-PUBS-ADSENSE-SPEC.md`
