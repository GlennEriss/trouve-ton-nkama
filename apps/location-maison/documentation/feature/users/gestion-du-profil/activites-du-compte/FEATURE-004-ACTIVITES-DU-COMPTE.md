# FEATURE-004 - Activites Du Compte

## 1. Contexte

Dans `/settings`, l'option **Activites du compte** est deja visible (`isAccountActivity`), mais aujourd'hui elle ne declenche pas encore une chaine complete et robuste de notifications metier.

Cette sous-feature formalise:

- quels evenements "compte" doivent etre notifies
- sur quels canaux (in-app, email)
- avec quelles regles de priorite/sensibilite
- avec quelle architecture cible (feature-based)

References:

- `documentation/feature/users/gestion-du-profil/FEATURE-001-GESTION-PROFIL.md`
- `src/components/notifications/ParameterNotifications.tsx`
- `src/providers/NotificationProvider.tsx`

---

## 2. Objectif fonctionnel

Permettre a un utilisateur connecte (`User` ou `Announcer`) d'etre informe de toute activite pertinente sur son compte, avec une regle claire:

1. Evenements critiques securite: notification obligatoire.
2. Evenements informatifs: soumis au parametre `isAccountActivity`.

---

## 3. RBAC et acces

- `User`: concerne
- `Announcer`: concerne (heritage des droits User)
- Non connecte: hors scope
- `Admin`: hors scope (gestion admin des campagnes documentee dans use-case admin)

Routes impactees:

- `/settings` (activation/desactivation preference)
- `/list-notifications` (consultation)
- `/login-and-security` (source d'evenements)
- `/profil/informations` (source d'evenements)
- `/verify-phone` (source d'evenements)

---

## 4. Contrat metier

### 4.1 Parametre utilisateur

Cle preference:

- `notificationParameter.isAccountActivity`

Semantique:

- `true`: l'utilisateur recoit les notifications d'activite non critique.
- `false`: l'utilisateur ne recoit pas les notifications d'activite non critique.
- Les notifications critiques securite restent envoyees meme si `false`.

### 4.2 Catalogue d'evenements v1

| Event | Sensibilite | In-app | Email | Respect `isAccountActivity` |
|---|---|---|---|---|
| `ACCOUNT_PASSWORD_CHANGED` | Critique | Oui | Oui (immediat) | Non (force) |
| `ACCOUNT_EMAIL_CHANGED` | Critique | Oui | Oui (immediat) | Non (force) |
| `ACCOUNT_PROVIDER_LINKED` | Critique | Oui | Oui (immediat) | Non (force) |
| `ACCOUNT_PROVIDER_UNLINKED` | Critique | Oui | Oui (immediat) | Non (force) |
| `ACCOUNT_PHONE_CHANGED` | Moyen | Oui | Non | Oui |
| `ACCOUNT_PHONE_VERIFIED` | Moyen | Oui | Non | Oui |
| `ACCOUNT_PROFILE_UPDATED` | Faible | Oui | Non | Oui |

### 4.3 Regles de priorite

1. Ne jamais bloquer l'action principale (ex: changement mot de passe) si la notification echoue.
2. Journaliser tout echec de dispatch.
3. Eviter les doublons sur un meme evenements utilisateur (idempotence `eventId`).

---

## 5. Architecture cible (feature-based)

Module cible:

- `src/features/users/account-activity-notifications/`

Sous-structure proposee:

- `services/account-activity-notification.service.ts`
- `services/account-activity-policy.ts`
- `services/account-activity-dispatcher.ts`
- `repositories/account-activity.repository.ts`
- `__tests__/`

Composants existants reutilises:

- `createNotification` (`src/db/notification.db.ts`) pour in-app
- `emailService` + templates emails pour canal email
- `createLogger` pour observabilite

---

## 6. Flux fonctionnel cible

1. Une action compte est executee (password/email/provider/profile/phone).
2. Le service metier emet un evenement d'activite compte.
3. Le dispatcher applique la policy (critique vs non critique + preference utilisateur).
4. Si autorise:
- creation notification in-app
- envoi email si policy l'impose
5. Ecriture logs structures (`scope`, `eventType`, `userId`, `channel`, `status`).

---

## 7. Gestion erreurs et logs

Scopes recommandes:

- `users.account-activity.dispatcher`
- `users.account-activity.policy`
- `users.account-activity.email`

Codes d'erreur metier recommandes:

- `ACCOUNT_ACTIVITY_USER_NOT_FOUND`
- `ACCOUNT_ACTIVITY_CHANNEL_FAILED`
- `ACCOUNT_ACTIVITY_DUPLICATE_EVENT`
- `ACCOUNT_ACTIVITY_POLICY_REJECTED`

Regle:

- les erreurs de notification sont non bloquantes
- elles sont tracees en `warn/error` avec contexte

---

## 8. Criteres d'acceptation

1. Preference
- activer/desactiver `isAccountActivity` depuis `/settings` modifie reellement le comportement pour les evenements non critiques.

2. Critique securite
- changement mot de passe/email/provider declenche toujours in-app + email.

3. In-app
- les evenements apparaissent dans `/list-notifications`.

4. Non regression
- les actions principales (update profil, password reset, etc.) restent fonctionnelles meme si la notification echoue.

5. Observabilite
- logs structures disponibles pour diagnostic incident.

---

## 9. Plan d'implementation

1. Definir types d'evenements et policy centrale.
2. Implementer dispatcher unique (in-app + email).
3. Brancher les triggers dans services metier existants:
- profile management
- login/security
- oauth link/unlink
- phone verification
4. Ajouter templates email "account activity" (critique).
5. Ajouter tests unitaires + integration sur cas critiques.

---

## 10. Hors scope

- Notifications push PWA (traitees au point 3)
- Moteur de recommandations personnalisees (point 5)
- Campagnes admin "nouveautes plateforme" (point 1)

