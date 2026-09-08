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
});
