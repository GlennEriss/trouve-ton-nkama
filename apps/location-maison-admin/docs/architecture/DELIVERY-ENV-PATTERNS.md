# Delivery, Environments, and Design Patterns (Implementation-Near)

## 1. Environnements et discipline dev -> prod

Environnements:

- `local`: developpement + emulateurs + tests rapides
- `dev`: integration continue fonctionnelle
- `preprod`: validation release candidate
- `prod`: exploitation

Regle ferme:

- Toute feature passe `dev` puis `preprod` avant `prod`.
- Aucun hotfix direct prod sans retro-port dev/preprod.

## 2. Workflow de promotion

1. dev branch -> CI
2. deploy env dev
3. tests integration + revue metier
4. promote preprod
5. smoke + securite + perf baseline
6. validation go-live
7. promote prod

## 3. Gates CI/CD obligatoires

- lint + typecheck
- unit tests
- integration tests API RBAC
- policy tests role matrix
- migration/index checks Firestore
- smoke tests sur endpoints critiques en preprod

## 4. Design patterns retenus (et pourquoi)

## 4.1 Patterns a utiliser

- Modular Monolith: iteration rapide, frontiere modules claire.
- Layered Architecture: lisibilite et separation des responsabilites.
- Repository Pattern: abstraction persistence, testabilite.
- Service Layer Pattern: orchestration use cases.
- Policy Pattern (RBAC/Business rules): regles explicites et testables.
- Outbox Pattern: fiabilite emission events.
- Idempotency Pattern: securisation actions critiques.
- Cache-Aside Pattern (Redis): performance lecture.

## 4.2 Patterns a eviter en MVP

- Sur-usage Factory/Builder/Mediator sans besoin reel.
- CQRS complet avec read/write stores separes partout.
- Event sourcing complet (surcout MVP).
- Microservices prematures.

## 5. Standards de code architecture

- Un module = un contexte metier clair.
- Aucune logique metier dans composants UI.
- Aucune requete DB directe dans presentation.
- Toute mutation sensible via service + audit.
- DTO explicites entree/sortie API.

## 6. Strategie tests par couche

- Domain: unit tests policy/validation.
- Application: tests use cases (happy + edge).
- Infrastructure: tests repository + adapters.
- API: integration RBAC/security.
- E2E: scenarios critiques admin.

## 7. Checklist pre-implementation

- stack frontend figee (`lucide-react`, `shadcn/ui`, `zustand`, `tanstack query`)
- conventions API/security validees
- scope Cloud Functions critiques valide
- matrices RBAC validees
- doc UML alignee aux modules reels
- plan dev/preprod/prod valide
