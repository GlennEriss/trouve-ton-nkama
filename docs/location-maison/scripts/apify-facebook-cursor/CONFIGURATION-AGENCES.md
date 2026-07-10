# Configuration Agences

## Objectif
Centraliser les informations agences dans une configuration unique, pour eviter les uid hardcodes dans les scripts.

## Fichier cible
`scripts/apify-facebook-cursor-v2/config/agencies.json`

## Schema propose
```json
{
  "agencies": [
    {
      "key": "jika-immo",
      "name": "Jika Immo",
      "uid": "rO9AwHrh1aT9S6mbkFsQWKtNJqz2",
      "documentId": "rO9AwHrh1aT9S6mbkFsQWKtNJqz2",
      "enabled": true,
      "sources": [
        {
          "type": "facebook-group",
          "groupId": "1227810011219532",
          "label": "Annonces Facebook agence"
        }
      ],
      "defaults": {
        "countryCode": "GA",
        "country": "Gabon",
        "statusDefault": "FOR_RENT"
      }
    }
  ]
}
```

## Regles
- `key` unique et stable (utilisee en CLI).
- `uid` obligatoire: toutes les annonces de l'agence seront publiees avec `createdBy = uid`.
- `enabled = false` desactive l'agence sans supprimer la config.
- `sources[]` permet d'avoir plusieurs groupes/pages si necessaire.

## Resolution dans le pipeline
1. Lecture config.
2. Validation schema.
3. Selection agence par `--agency <key>`.
4. Injection de `uid/documentId/defaults` dans le `JobContext`.

## Validation recommandee
- Verifier que `uid == documentId` si c'est la convention actuelle.
- Verifier l'existence du user avant execution (`check-user-exists`).
- Bloquer `apply` si config invalide.

