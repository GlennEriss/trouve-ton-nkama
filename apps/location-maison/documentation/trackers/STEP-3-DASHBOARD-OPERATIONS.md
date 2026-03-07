# Etape 3 - Dashboards & operations

## Objectif

Transformer les events collectes en decisions produit concretes.

Source principale:

- Rapports/Explorations Google Analytics 4 (et BigQuery plus tard si necessaire).

## Dashboards v1 a construire

### 1) Acquisition & trafic

- top pages vues (jour/semaine/mois)
- sources de trafic
- taux de rebond par page cle

### 2) Engagement produit

- top boutons cliques
- CTR par CTA principal
- interactions annonces (whatsapp, telephone, favoris)

### 3) Conversion metier

- visite -> contact annonce
- contact -> publication annonce
- intention recharge credits

## Runbook exploitation

Rythme:

- revue hebdomadaire (produit)
- revue mensuelle (tech + business)

Checklist hebdo:

1. verifier anomalies (events chutes brusques)
2. verifier top CTA en progression/regression
3. verifier parcours qui decrochent (drop-offs)
4. proposer 1 action UX basee sur les donnees

## Qualite des donnees

Controles:

- ratio events invalides
- ratio events sans `sessionId`
- ratio events sans `pagePath`
- dedupe sur evenements critiques

## Alerting minimal v1

- alerte si volume events global chute > 40% jour/jour
- alerte si `business.property.published` = 0 sur 24h
- alerte si `cta.property.whatsapp_click` chute fortement

## Criteres d'acceptation

1. Les 3 dashboards sont consultables.
2. Une routine hebdo est executee et archivee.
3. Les anomalies majeures de tracking sont detectees rapidement.
