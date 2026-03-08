# Recherche IA - Index

## Documents

- Specification fonctionnelle: `FEATURE-001-ASSISTANT-IA-RECHERCHE.md`
- Architecture cible: `ARCHITECTURE.md`
- Prompts et guardrails: `PROMPTS-GUARDRAILS.md`
- Economie couts/marge: `COUTS-MARGE-UNIT-ECONOMICS.md`
- Diagramme de sequence: `ia-recherche-sequence-diagram.puml`
- Suivi d'avancement: `PROGRESSION.md`

## But produit

Cette sous-feature definit un assistant IA conversationnel sur `/search-with-ia` pour:

- aider l'utilisateur a trouver un logement meme en cas de "0 resultat"
- proposer des alternatives intelligentes (budget, zone, type, tags)
- monétiser l'usage avec des credits, en restant rentable

## Positionnement UX

- `/search` reste la page de recherche classique (rapide, legere, filtres standards).
- `/search-with-ia` est la page experte conversationnelle (accompagnement IA + credits).
- Depuis `/search`, un CTA "Essayer la recherche IA" redirige vers `/search-with-ia`.

## Decision business cle

- Aucun debit si la conversation n'a pas encore declenche de recherche.
- Debit au premier appel de recherche, puis par paliers d'usage.
- Suivi quotidien des couts tokens/requetes et de la marge.

## References UML

- Use cases recherche: `../../uml/use-cases-recherche.puml`
- Use cases administrateur: `../../uml/use-cases-administrateur.puml`
