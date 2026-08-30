# Dépannage & Diagnostic

Ce dossier contient la documentation relative au dépannage et aux diagnostics du projet.

## 📄 Fichiers

- **DIAGNOSTIC_SIGNUP.md** : Diagnostic des problèmes d'inscription
- **BUGS-AUTH-E2E-2026-08.md** : Bugs trouvés et corrigés via la suite e2e Playwright réelle de l'auth (labels signup, contraste, a11y navbar, timing complete-profile) — état à jour de la suite
- **BUGS-PROPERTY-E2E-2026-08.md** : Bugs trouvés et corrigés via les tests e2e réels de /property — z-index Select sous Dialog/Sheet, promotion jamais affichée côté client, suppression d'annonce bloquée 30-60s puis en échec, bouton "Voir" qui plantait sur une annonce Mode, bouton "Modifier" qui envoyait ~949/950 annonces immobilières vers le mauvais flux puis vers l'ancien formulaire déprécié (bascule finale vers preview+crayons), les sauvegardes par crayon (EditableField) qui ne persistaient jamais réellement en base (permission-denied silencieux, corrigé via route serveur Admin SDK) — + couverture archiver/désarchiver (immobilier + Mode) + bug transverse de tests découvert (RUN_ID/OWNER_UID statiques non isolés entre workers Playwright)

---

*Dernière mise à jour : 2026-08-29*

