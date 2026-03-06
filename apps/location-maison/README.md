# Location Maison - Plateforme de location immobilière

## Démarrage rapide

```bash
npm install
npm run dev
```

Le projet démarre en mode Turbopack via `next dev --turbopack`.

## Prérequis

- Node.js (version projet)
- npm
- Docker (si usage Jenkins local)
- Vault (optionnel)

## Observabilité: logs et incidents

### Logger applicatif (standard)

Le logger centralisé est dans `src/lib/logger.ts`.

- API: `createLogger('scope').debug|info|warn|error(message, context?)`
- Format: JSON structuré (timestamp, level, scope, message, context)
- Sécurité: redaction automatique des clés sensibles (`password`, `token`, `authorization`, `cookie`, `oobCode`, etc.)
- Niveaux:
  - `LOG_LEVEL`
  - `NEXT_PUBLIC_LOG_LEVEL`
  - fallback: `debug` en développement, `info` sinon

Exemple:

```ts
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth.service');
logger.warn('Phone uniqueness check failed', { phoneNumber, error });
```

### Gestion d’erreurs centralisée

#### Côté application

- Erreurs métiers/API partagées: `src/lib/errors/app-error.ts`
  - `AppError`
  - `ValidationError`
  - `UnauthorizedError`
  - `NotFoundError`

#### Côté API Next.js

- Couche commune: `src/lib/api/error-response.ts`
  - `assertStringField(...)`: validation de payload
  - `jsonApiError(...)`: réponse JSON homogène
  - `handleApiError(...)`: mapping/normalisation/logging

Format standard de réponse d’erreur:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Message lisible",
    "details": {}
  }
}
```

Routes auth déjà alignées:

- `POST /api/auth/send-verification-email`
- `POST /api/auth/send-password-reset-email`
- `POST /api/auth/password-reset-request`
- `GET|POST /api/auth/password-reset`
- `GET|POST /api/auth/verify-email`

### Incident: comment être averti et investiguer

État actuel:

- ✅ Logs structurés disponibles (app + routes auth)
- ✅ Logs functions consultables
- ❌ Pas d’alerte on-call centralisée implémentée dans le repo (Slack/PagerDuty/Email alerting automatisé)

Consultation des incidents:

1. Application Next.js locale:
```bash
NEXT_PUBLIC_LOG_LEVEL=debug npm run dev
```
2. Cloud Functions Firebase (emails/auth):
```bash
firebase functions:log --project <project-id> --only sendVerificationEmail --follow
```
3. Déploiement Vercel (si utilisé):
```bash
vercel logs <deployment-url>
```

Recommandation minimale pour alerting:

1. Activer alertes Vercel (erreurs runtime/latence)
2. Activer alertes Firebase/GCP (Functions errors rate)
3. Router vers un canal unique (Slack / email astreinte)

## Feature Auth: état actuel (register)

Référence: `documentation/feature/auth/PROGRESSION.md`

- Fait:
  - repository `UserRepository` + tests
  - service `AuthServiceImpl` + rollback + tests
  - hook `useSignup` + tests
  - formulaire signup (desktop/mobile) branché sur `useSignup`
  - distinction signup `Utilisateur` / `Annonceur` avec validation des conditions annonceur
  - envoi email de vérification via endpoint dédié
  - logger intégré dans le flux auth
  - standardisation des erreurs API auth
- Manque:
  - migration "Devenir Annonceur" post-inscription
  - création `AnnouncerProfile` à la création annonceur
  - E2E signup complets (User + Announcer) et couverture cible projet

## Vault (optionnel)

```bash
cd scripts/vault
vault server -config=vault.hcl
```

Vault: `http://localhost:8200`

## Jenkins local

```bash
docker compose up --build
```

Jenkins: `http://localhost:8090`

## Documentation projet

- Documentation globale: `documentation/README.md`
- Workflow: `documentation/workflow/WORKFLOW.md`
- Annuaire des features: `documentation/feature/ANNUAIRE.md`
- Feature Auth: `documentation/feature/auth/`
