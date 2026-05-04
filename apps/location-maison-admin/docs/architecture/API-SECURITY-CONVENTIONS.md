# API Conventions and Security (Admin Dashboard)

## 1. Versioning API

Convention retenue:

- Prefixe: `/api/admin/v1/*`
- Exemple: `/api/admin/v1/users`, `/api/admin/v1/analytics/searches`

Regles:

- `v1` stable pour MVP.
- breaking changes => nouvelle version (`v2`) sans casser `v1` immediatement.
- deprecation announcee dans changelog architecture + date de fin de support.

## 2. Contrat reponse API

Format unique:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "correlationId": "...",
    "version": "v1"
  }
}
```

En erreur:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Permission manquante",
    "details": {}
  },
  "meta": {
    "correlationId": "...",
    "version": "v1"
  }
}
```

## 3. Strategie auth admin

Decision MVP:

- Auth source: `Firebase Auth`.
- API session: cookie de session securise (`httpOnly`, `secure`, `sameSite=strict`).
- Verification server: Firebase Admin SDK (session cookie verifiee sur chaque requete sensible).

## 4. Strategie RBAC API

Pipeline obligatoire:

1. `requireAuth()`
2. `requireActiveAdmin()`
3. `requirePermission("resource.action")`
4. `requireBusinessConstraint()` si action critique
5. `writeAuditLog()` mutation

Exemples permissions:

- `admins.invite`
- `users.suspend`
- `listings.approve`
- `credits.grant`
- `refunds.approve`

## 5. Hardening securite API

- Validation stricte input avec `zod`.
- Rejet des payloads inconnus (`strict mode`).
- Rate limiting Redis par IP + actor + endpoint.
- Idempotency key obligatoire pour operations critiques:
- attribution credits
- remboursement
- changement role admin

- Controle anti replay sur endpoints sensibles.
- CORS verrouille (admin domains uniquement).
- Protections CSRF pour mutations basees cookie.

## 6. Journalisation et traçabilite

Audit log obligatoire pour:

- invitation admin
- changement role
- suspension/reactivation utilisateur
- approbation/rejet annonce
- attribution credits
- remboursement
- modification settings

Champs minimum:

- `actorId`, `role`, `action`, `resource`, `resourceId`, `status`, `correlationId`, `timestamp`, `diff`

## 7. Erreurs et codes standards

Codes minimum harmonises:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

## 8. Tests securite obligatoires

- test unitaire policy RBAC par role
- test integration endpoint par endpoint (allow/deny matrix)
- test idempotence endpoints critiques
- test rate limit
- test csrf/cookie flags en preprod

## 9. Checklist release securite

- aucune route admin hors `/api/admin/v1`
- aucune mutation sans audit log
- aucune mutation sans validation zod
- aucune action critique sans idempotency strategy
- secrets uniquement via env management par environnement
