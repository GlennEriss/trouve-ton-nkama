# Location Maison Admin - Documentation

## Objectif du projet

Construire un dashboard admin pour la plateforme **Trouve Ton Nkama** (code source principal dans `../location-maison`).

Ce dashboard doit permettre:

- le pilotage opérationnel de la plateforme
- la modération et le support
- le suivi business
- la gestion sécurisée de plusieurs admins avec des rôles et permissions

## Source métier principale

- Projet plateforme actuel: `../location-maison`
- Cette application (`location-maison-admin`) est un back-office dédié, séparé du front public.

## Principes de conception

- Sécurité par défaut (RBAC strict, audit des actions sensibles)
- Traçabilité (journal d'activité admin)
- Simplicité opérationnelle (actions rapides, filtres, bulk actions)
- Évolutivité (ajout de nouveaux rôles/modules sans refonte)

## Index de la documentation

- [Vision Produit](./VISION-PRODUIT.md)
- [Fonctionnalités Dashboard Admin](./FONCTIONNALITES-DASHBOARD-ADMIN.md)
- [Gestion Annonces Admin (listing, edition, etats, doublons)](./GESTION-ANNONCES-ADMIN-SPEC.md)
- [Matrice Permissions Annonces (ecran/action detaillee)](./MATRICE-PERMISSIONS-ANNONCES-ECRANS-ACTIONS.md)
- [Matrice Permissions Social Import (ecran/action detaillee)](./MATRICE-PERMISSIONS-SOCIAL-IMPORT-ECRANS-ACTIONS.md)
- [RBAC - Rôles et Permissions](./RBAC-ROLES-PERMISSIONS.md)
- [Matrice Permissions Écran/Action](./MATRICE-PERMISSIONS-ECRANS-ACTIONS.md)
- [Schéma Données Analytics](./SCHEMA-DONNEES-ANALYTICS.md)
- [Monétisation Pubs AdSense - Suivi Revenus](./MONETISATION-PUBS-ADSENSE-SPEC.md)
- [Régie Publicitaire (Concierge) - Pubs d'entreprises externes](./REGIE-PUBLICITAIRE-CONCIERGE-SPEC.md)
- [Architecture Operationnelle - Import Annonces Reseaux Sociaux](./architecture/ARCHITECTURE-OPERATIONNELLE-IMPORT-ANNONCES-RESEAUX-SOCIAUX.md)
- [Checklist Implementation RBAC Social Import (backend/frontend)](./architecture/CHECKLIST-IMPLEMENTATION-RBAC-SOCIAL-IMPORT.md)
- [Sprint Social Import - Backlog implementation (tickets API/UI)](./architecture/SPRINT-SOCIAL-IMPORT-IMPLEMENTATION-BACKLOG.md)
- [Analytics Data Contract v1 (events + payloads API + validation)](./architecture/ANALYTICS-DATA-CONTRACT-V1.md)
- [MVP v1 Figé](./MVP-V1-FIGE.md)
- [Roadmap MVP](./ROADMAP-MVP.md)
- [Architecture (Overview + API/BD/Services + UML)](./architecture/README.md)
- [Architecture - Decisions implementation (stack, securite, patterns)](./architecture/IMPLEMENTATION-DECISIONS-TECH-STACK.md)
- [Plan implementation sprint par sprint](./architecture/SPRINT-BY-SPRINT-IMPLEMENTATION-PLAN.md)
- [Sprint 6 Analytics - Backlog implementation](./architecture/SPRINT-6-ANALYTICS-IMPLEMENTATION-BACKLOG.md)
- [ANL-001/002 - BigQuery DDL + Zod spec](./architecture/ANL-001-ANL-002-BIGQUERY-DDL-ZOD-SPEC.md)
- [Sprint 6 Analytics - Delivery matrix (owner/estimation/priority)](./architecture/SPRINT-6-ANALYTICS-DELIVERY-MATRIX.md)

## Terminologie

- Dans cette documentation, on standardise **RDBC** vers **RBAC**:
- RBAC = Role-Based Access Control
- Contrôle d'accès basé sur les rôles
