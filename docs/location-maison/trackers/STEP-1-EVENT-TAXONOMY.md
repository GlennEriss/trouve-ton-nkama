# Etape 1 - Taxonomie des evenements

## Objectif

Definir un langage unique de tracking pour tout le produit.

Sans cette etape, les dashboards deviennent rapidement inutilisables.

## Regles de nommage

Format:

- `category.object.action`

Exemples:

- `page.search.view`
- `cta.property.whatsapp_click`
- `auth.signin.success`
- `credit.pack.whatsapp_intent`

## Proprietes minimales obligatoires

Chaque evenement doit embarquer:

- `eventName`
- `occurredAt` (ISO)
- `pagePath`
- `userId` (si connecte, sinon `null`)
- `sessionId`
- `roleContext` (`visitor` | `user` | `announcer`)
- `source` (`web` pour v1)

## Evenements v1 prioritaires

### Pages vues

- `page.home.view`
- `page.search.view`
- `page.property_details.view`
- `page.property_owner_console.view`

### Clics CTA

- `cta.auth.signup_click`
- `cta.auth.signin_click`
- `cta.property.whatsapp_click`
- `cta.property.phone_click`
- `cta.property.favorite_add_click`
- `cta.credit.recharge_whatsapp_click`

### Evenements metier

- `business.property.published`
- `business.property.archived`
- `business.credit.purchase_intent`
- `business.credit.spent`

## Livrables

1. Dictionnaire d'evenements (Markdown versionne)
2. Typage TS des noms/proprietes
3. Convention de revue PR "tracking contract"

## Criteres d'acceptation

1. 100% des nouveaux evenements respectent la convention.
2. Aucun evenement free-text non type en code.
3. Les events critiques business sont clairement identifies.
