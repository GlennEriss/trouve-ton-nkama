import { buildFilters } from '../algolia';

// Syntaxe vérifiée contre buildPublicSearchFilters côté web (src/lib/search/
// search-filter-query.ts) : une seule chaîne `filters` jointe par AND, types multiples
// groupés en OR entre parenthèses, budget en clauses numériques sans guillemets. Toute
// divergence ici casse silencieusement la recherche (Algolia n'erreure pas sur un DSL
// syntaxiquement valide mais sémantiquement faux).
describe('buildFilters', () => {
  it('applique toujours le filtre de base (annonces actives et approuvées)', () => {
    expect(buildFilters({})).toBe('state:"IN_PROGRESS" AND moderationStatus:"APPROVED"');
  });

  it('ajoute un seul type de bien sans parenthèses', () => {
    expect(buildFilters({ typeProperty: ['Home'] })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND typeProperty:"Home"',
    );
  });

  it('groupe plusieurs types de bien en OR entre parenthèses', () => {
    expect(buildFilters({ typeProperty: ['Home', 'Apartment'] })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND (typeProperty:"Home" OR typeProperty:"Apartment")',
    );
  });

  it('ajoute le statut de transaction', () => {
    expect(buildFilters({ status: 'FOR_RENT' })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND status:"FOR_RENT"',
    );
  });

  it('ajoute la ville entre guillemets', () => {
    expect(buildFilters({ city: 'Libreville' })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND city:"Libreville"',
    );
  });

  it('échappe les guillemets et antislashs dans la ville', () => {
    expect(buildFilters({ city: 'Port"Gentil\\Nord' })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND city:"Port\\"Gentil\\\\Nord"',
    );
  });

  it('ajoute le budget min et max sans guillemets, avec espaces autour de l\'opérateur', () => {
    expect(buildFilters({ budgetMinXaf: 100000, budgetMaxXaf: 300000 })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND price >= 100000 AND price <= 300000',
    );
  });

  it('ignore un budget à 0 (aucune clause ajoutée)', () => {
    expect(buildFilters({ budgetMinXaf: 0, budgetMaxXaf: 0 })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED"',
    );
  });

  it('combine tous les filtres ensemble', () => {
    expect(
      buildFilters({ typeProperty: ['Villa'], status: 'FOR_SALE', city: 'Libreville', budgetMaxXaf: 50000000 }),
    ).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND typeProperty:"Villa" AND status:"FOR_SALE" AND city:"Libreville" AND price <= 50000000',
    );
  });

  it('ajoute la province entre guillemets (scope Immobilier)', () => {
    expect(buildFilters({ province: 'Estuaire' })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND province:"Estuaire"',
    );
  });

  it('ajoute la catégorie racine sur categoryPath.lvl0', () => {
    expect(buildFilters({ category: 'Mode' })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND categoryPath.lvl0:"Mode"',
    );
  });

  it('ajoute la feuille de catégorie sur categoryId', () => {
    expect(buildFilters({ category: 'Mode', categoryId: 'chaussures' })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND categoryPath.lvl0:"Mode" AND categoryId:"chaussures"',
    );
  });

  it('ajoute un seul attribut dynamique sans parenthèses', () => {
    expect(buildFilters({ category: 'Mode', attributes: { pointure: ['40'] } })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND categoryPath.lvl0:"Mode" AND attributes.pointure:"40"',
    );
  });

  it('groupe plusieurs valeurs du même attribut en OR entre parenthèses', () => {
    expect(buildFilters({ category: 'Mode', attributes: { pointure: ['40', '41'] } })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND categoryPath.lvl0:"Mode" AND (attributes.pointure:"40" OR attributes.pointure:"41")',
    );
  });

  it('combine plusieurs attributs dynamiques (une clause par clé)', () => {
    expect(buildFilters({ category: 'Mode', categoryId: 'chaussures', attributes: { pointure: ['40'], etat: ['Neuf'] } })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND categoryPath.lvl0:"Mode" AND categoryId:"chaussures" AND attributes.pointure:"40" AND attributes.etat:"Neuf"',
    );
  });

  it('ignore une clé attributs sans valeur sélectionnée', () => {
    expect(buildFilters({ category: 'Mode', attributes: { pointure: [] } })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND categoryPath.lvl0:"Mode"',
    );
  });

  // Filet de sécurité (voir IMMOBILIER_ONLY_PARAMS côté web, search-filter-query.ts) : un
  // filtre immobilier resté dans le state après un changement de catégorie ne doit jamais
  // atteindre la requête Algolia en scope Mode — aucune annonce Mode n'a ces champs, ça
  // donnerait 0 résultat sans explication visible pour l'utilisateur.
  it('ignore typeProperty/status/province en scope Mode même si présents dans les filtres', () => {
    expect(
      buildFilters({
        category: 'Mode',
        typeProperty: ['Villa'],
        status: 'FOR_RENT',
        province: 'Estuaire',
      }),
    ).toBe('state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND categoryPath.lvl0:"Mode"');
  });

  it('conserve ville et budget en scope Mode (pas immobilier uniquement)', () => {
    // `city` interroge l'attribut `cities` (tableau, zones multiples) hors scope
    // immobilier — voir docs/marketplace-multi-categories/08-zones-multiples-mode.md §5.
    expect(buildFilters({ category: 'Mode', city: 'Libreville', budgetMaxXaf: 20000 })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND cities:"Libreville" AND price <= 20000 AND categoryPath.lvl0:"Mode"',
    );
  });

  it('applique les filtres immobilier normalement quand category=Immobilier explicitement', () => {
    expect(buildFilters({ category: 'Immobilier', typeProperty: ['Villa'] })).toBe(
      'state:"IN_PROGRESS" AND moderationStatus:"APPROVED" AND typeProperty:"Villa" AND categoryPath.lvl0:"Immobilier"',
    );
  });
});
