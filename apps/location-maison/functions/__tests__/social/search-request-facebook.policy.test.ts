import {
  buildSearchRequestPostMessage,
  buildSearchRequestsListUrl,
  shouldPublishApprovedSearchRequest,
} from '../../src/social/search-request-facebook.policy';

const APPROVED = { moderationStatus: 'APPROVED', state: 'IN_PROGRESS' };

describe('shouldPublishApprovedSearchRequest', () => {
  it('publie au passage en APPROVED', () => {
    expect(shouldPublishApprovedSearchRequest({ moderationStatus: 'PENDING' }, APPROVED)).toBe(true);
  });

  it('ne republie pas une demande deja approuvee que l on modifie', () => {
    expect(
      shouldPublishApprovedSearchRequest(
        { moderationStatus: 'APPROVED', budgetMaxXaf: 500000 },
        { moderationStatus: 'APPROVED', budgetMaxXaf: 450000, state: 'IN_PROGRESS' }
      )
    ).toBe(false);
  });

  it('ignore les autres decisions de moderation', () => {
    expect(shouldPublishApprovedSearchRequest({ moderationStatus: 'PENDING' }, { moderationStatus: 'REJECTED' })).toBe(false);
    expect(shouldPublishApprovedSearchRequest({}, { moderationStatus: null })).toBe(false);
  });

  it('ne publie jamais deux fois grace au marqueur facebookPost', () => {
    expect(
      shouldPublishApprovedSearchRequest(
        { moderationStatus: 'PENDING' },
        { ...APPROVED, facebookPost: { id: '123_456' } }
      )
    ).toBe(false);
  });

  it('ne publie pas une demande archivee', () => {
    expect(
      shouldPublishApprovedSearchRequest({ moderationStatus: 'PENDING' }, { ...APPROVED, state: 'ARCHIVED' })
    ).toBe(false);
  });
});

describe('buildSearchRequestsListUrl', () => {
  it('pointe vers la liste des demandes, pas une page individuelle', () => {
    // Decision explicite : pas de page /demandes-recherche/{id} (contrairement a /annonce/{id})
    // pour ne pas exposer a une URL publique indexable stable le numero WhatsApp d'une demande.
    expect(buildSearchRequestsListUrl('https://www.tonnkama.com')).toBe(
      'https://www.tonnkama.com/demandes-recherche'
    );
  });

  it('tolere une barre oblique finale dans l URL de base', () => {
    expect(buildSearchRequestsListUrl('https://www.tonnkama.com/')).toBe(
      'https://www.tonnkama.com/demandes-recherche'
    );
  });
});

describe('buildSearchRequestPostMessage', () => {
  const url = 'https://www.tonnkama.com/demandes-recherche';

  it('compose type, transaction, ville et budget', () => {
    const message = buildSearchRequestPostMessage(
      {
        typeProperty: 'Studio',
        transactionType: 'FOR_RENT',
        city: 'Libreville',
        neighborhood: 'Akébé',
        budgetMinXaf: 80000,
        budgetMaxXaf: 120000,
        description: 'Recherche studio simple pour étudiant.',
      },
      url,
    );

    expect(message).toContain('Studio');
    expect(message).toContain('à louer');
    expect(message).toContain('Libreville, Akébé');
    expect(message).toContain('Recherche studio simple pour étudiant.');
    expect(message).toContain(url);
    expect(message).toMatch(/80[\s ]000 FCFA/);
    expect(message).toMatch(/120[\s ]000 FCFA/);
  });

  it('traduit le type de bien avec le libelle francais', () => {
    const message = buildSearchRequestPostMessage(
      { typeProperty: 'Room', transactionType: 'FOR_RENT', city: 'Libreville' },
      url,
    );
    expect(message).toContain('Chambre');
    expect(message).not.toContain('Room');
  });

  it('affiche "à acheter" pour une transaction FOR_SALE', () => {
    const message = buildSearchRequestPostMessage(
      { typeProperty: 'Villa', transactionType: 'FOR_SALE', city: 'Port-Gentil' },
      url,
    );
    expect(message).toContain('à acheter');
    expect(message).not.toContain('à louer');
  });

  it('retombe sur la province si ville/quartier absents', () => {
    const message = buildSearchRequestPostMessage(
      { typeProperty: 'Land', transactionType: 'FOR_SALE', province: 'Estuaire' },
      url,
    );
    expect(message).toContain('Estuaire');
  });

  it('gere un budget partiel (min seul, max seul, ou absent)', () => {
    expect(buildSearchRequestPostMessage({ budgetMinXaf: 50000 }, url)).toContain('à partir de');
    expect(buildSearchRequestPostMessage({ budgetMaxXaf: 200000 }, url)).toContain("jusqu'à");
    expect(buildSearchRequestPostMessage({}, url)).not.toContain('Budget');
  });

  it('ignore un budget nul ou invalide plutot que d afficher 0 FCFA', () => {
    expect(buildSearchRequestPostMessage({ budgetMinXaf: 0, budgetMaxXaf: 0 }, url)).not.toContain('FCFA');
    expect(buildSearchRequestPostMessage({ budgetMinXaf: 'abc' }, url)).not.toContain('FCFA');
  });

  it('ajoute le pied de post avec catalogue et reseaux', () => {
    const message = buildSearchRequestPostMessage({ typeProperty: 'Studio' }, url);

    expect(message).toContain('https://www.tonnkama.com/search');
    expect(message).toContain('TikTok :');
    expect(message).toContain('Chaîne WhatsApp :');
    // Le lien de la liste doit rester avant le pied, meme sans carte d'apercu individuelle a
    // porter (pas de page dediee) — coherence avec l'ordre du message des annonces.
    expect(message.indexOf(url)).toBeLessThan(message.indexOf('https://www.tonnkama.com/search'));
  });

  it('retombe sur "un bien" si le type de bien est absent', () => {
    expect(buildSearchRequestPostMessage({ transactionType: 'FOR_RENT' }, url)).toContain('un bien');
  });
});
