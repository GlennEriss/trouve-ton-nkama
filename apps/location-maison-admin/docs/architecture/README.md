# Architecture - Dashboard Admin Trouve Ton Nkama

## Objectif

Documenter l'architecture cible du projet `location-maison-admin` avant implémentation.

## Sommaire

- [Architecture Overview](./ARCHITECTURE-OVERVIEW.md)
- [Architecture API / BD / Services](./API-BD-SERVICES-ARCHITECTURE.md)
- [Architecture Base de Donnees](./DATABASE-ARCHITECTURE.md)
- [Implementation Decisions - Tech Stack](./IMPLEMENTATION-DECISIONS-TECH-STACK.md)
- [API Conventions and Security](./API-SECURITY-CONVENTIONS.md)
- [Cloud Functions - Scope Critique](./CLOUD-FUNCTIONS-CRITICAL-SCOPE.md)
- [Analytics Data Contract v1](./ANALYTICS-DATA-CONTRACT-V1.md)
- [Sprint 6 Analytics - Backlog d'Implementation](./SPRINT-6-ANALYTICS-IMPLEMENTATION-BACKLOG.md)
- [ANL-001/002 - BigQuery DDL + Zod Validation Spec](./ANL-001-ANL-002-BIGQUERY-DDL-ZOD-SPEC.md)
- [Sprint 6 Analytics - Delivery Matrix](./SPRINT-6-ANALYTICS-DELIVERY-MATRIX.md)
- [Delivery, Environments, and Design Patterns](./DELIVERY-ENV-PATTERNS.md)
- [Sprint-by-Sprint Implementation Plan](./SPRINT-BY-SPRINT-IMPLEMENTATION-PLAN.md)
- [UML Component Overview](./uml/architecture-overview-component.puml)
- [UML Use Case](./uml/use-cases-admin-dashboard.puml)
- [UML Package Diagram](./uml/package-diagram-admin-dashboard.puml)
- [UML Class Diagram](./uml/class-diagram-admin-dashboard.puml)

## Positionnement architectural

- Architecture applicative: **modular monolith** (MVP)
- Style interne: **layered + hexagonal boundaries**
- Donnees operationnelles: **Firestore**
- Analytics centralisees: **BigQuery + aggregates pour dashboard**
- Cache/presence/rate-limit: **Redis**
- Monitoring applicatif: **Sentry**
- Async events broker: **Pub/Sub** (Kafka non retenu en MVP)

## Regles de gouvernance

- Deny by default sur les permissions.
- API first pour les mutations admin.
- Audit obligatoire sur actions sensibles.
- Aucune decision technique majeure sans mise a jour de cette documentation.
