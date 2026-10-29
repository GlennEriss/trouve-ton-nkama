# Décision : publication sans compte

**État actuel : raccordement code réalisé, voir [lot 9](LOT-9-PAIEMENT.md). Les éléments « à implémenter » ci-dessous constituent le contrat de référence initial ; les limites d'activation et tests réels figurent au lot 9.**

Cette décision remplace les exigences « annonceur authentifié », rôle Announcer et ownerUid obligatoire de la conception initiale, y compris les diagrammes d'architecture historiques. Ces derniers ne doivent pas être implémentés tels quels pour le lot paiement.

## Implémenté

- Formulaire dans le groupe public, accessible sans connexion.
- Carte de création visible dans Publier pour tous les visiteurs.
- Aucune obligation de compléter un profil pour cette route ; protections des autres routes conservées.
- Deux étapes inchangées. Vérification locale seulement ; aucune publication ni transaction financière.

## Contrat à implémenter au lot 9

- Initiation publique avec validation serveur du contenu, localisation et contact ; montant serveur fixé à 200 FCFA.
- Session facultative : identité éventuelle exclusivement issue d'une session vérifiée. Ne jamais accepter un ownerUid déclaré par le client ni inventer un compte pour une publication anonyme.
- Contact public distinct du téléphone payeur ; aucun des deux ne constitue une preuve d'identité ou de propriété.
- Réservation/idempotence et protection anti-abus pour les anonymes, quotas et protection des requêtes navigateur à définir et tester avant activation.
- Suivi/reprise du paiement protégé par un secret opaque non devinable, limité à l'opération, conservé côté serveur sous forme hachée. Un identifiant public d'annonce ne doit pas permettre d'accéder aux données financières privées.
- Confirmation MyPayGa authentifiée et montant vérifié côté serveur, transitions idempotentes puis modération. Aucun succès déclaré par le navigateur ne publie une annonce.
- Adapter le modèle privé et les règles/tests pour l'identité facultative, sans ouvrir d'écriture Firestore publique ni exposer les informations payeur.

Le paiement anonyme n'est pas encore opérationnel. Aucun changement des règles Firestore ou des endpoints de paiement dans ce correctif d'accès.
