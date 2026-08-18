import {
  buildListingPostMessage,
  buildListingUrl,
  shouldPublishApprovedListing,
} from '../../src/social/facebook-page.policy';

const APPROVED = { moderationStatus: 'APPROVED', state: 'IN_PROGRESS' };

describe('shouldPublishApprovedListing', () => {
  it('publie au passage en APPROVED', () => {
    expect(shouldPublishApprovedListing({ moderationStatus: 'PENDING' }, APPROVED)).toBe(true);
  });

  it('ne republie pas une annonce déjà approuvée que l on modifie', () => {
    // Le trigger se déclenche à chaque écriture (prix, promotion, rafraîchissement) : sans ce
    // garde-fou la même annonce repartirait sur la Page à chaque modification.
    expect(
      shouldPublishApprovedListing(
        { moderationStatus: 'APPROVED', price: 7000 },
        { moderationStatus: 'APPROVED', price: 6500, state: 'IN_PROGRESS' }
      )
    ).toBe(false);
  });

  it('ignore les autres décisions de modération', () => {
    expect(shouldPublishApprovedListing({ moderationStatus: 'PENDING' }, { moderationStatus: 'REJECTED' })).toBe(false);
    expect(shouldPublishApprovedListing({}, { moderationStatus: 'PENDING' })).toBe(false);
  });

  it('ne publie jamais deux fois grâce au marqueur facebookPost', () => {
    // Cloud Functions garantit at-least-once : un rejeu du trigger ne doit pas créer un doublon.
    expect(
      shouldPublishApprovedListing(
        { moderationStatus: 'PENDING' },
        { ...APPROVED, facebookPost: { id: '123_456' } }
      )
    ).toBe(false);
  });

  it('ne publie pas une annonce archivée', () => {
    expect(
      shouldPublishApprovedListing({ moderationStatus: 'PENDING' }, { ...APPROVED, state: 'ARCHIVED' })
    ).toBe(false);
  });
});

describe('buildListingUrl', () => {
  it('construit l URL publique canonique', () => {
    expect(buildListingUrl('abc123', 'https://www.tonnkama.com')).toBe(
      'https://www.tonnkama.com/annonce/abc123'
    );
  });

  it('tolère une barre oblique finale dans l URL de base', () => {
    expect(buildListingUrl('abc123', 'https://www.tonnkama.com/')).toBe(
      'https://www.tonnkama.com/annonce/abc123'
    );
  });
});

describe('buildListingPostMessage', () => {
  const url = 'https://www.tonnkama.com/annonce/abc123';

  it('compose titre, prix, catégorie et ville pour une annonce mode', () => {
    const message = buildListingPostMessage(
      {
        title: 'Lot beauté : Bonnet satin, brume Crush et gloss',
        price: 7000,
        city: 'Libreville',
        categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Parfums & beauté' },
      },
      url
    );

    expect(message).toContain('Lot beauté : Bonnet satin, brume Crush et gloss');
    expect(message).toContain('Parfums & beauté');
    expect(message).toContain('Libreville');
    expect(message).toContain(url);
    expect(message).toMatch(/7[\s ]000 FCFA/);
  });

  it('prefere le libelle francais de categoryPath a l enum typeProperty', () => {
    // Sans ça le post affiche "Room" au lieu de "Chambre" — constaté sur une vraie annonce
    // avant la première publication.
    const message = buildListingPostMessage(
      {
        title: 'Chambre américaine sécurisée',
        price: 80000,
        city: 'Libreville',
        typeProperty: 'Room',
        categoryPath: { lvl0: 'Immobilier', lvl1: 'Immobilier > Chambre' },
      },
      url
    );

    expect(message).toContain('Chambre');
    expect(message).not.toContain('Room');
  });

  it('retombe sur typeProperty pour les annonces sans categoryPath', () => {
    const message = buildListingPostMessage(
      { title: 'Studio meublé', price: 150000, city: 'Libreville', typeProperty: 'Studio' },
      url
    );

    expect(message).toContain('Studio');
  });

  it('omet les informations absentes sans laisser de séparateur orphelin', () => {
    const message = buildListingPostMessage({ title: 'Annonce sans détails' }, url);

    expect(message).not.toContain('·');
    expect(message).toContain('Annonce sans détails');
    expect(message).toContain(url);
  });

  it('ignore un prix nul ou invalide plutôt que d afficher 0 FCFA', () => {
    expect(buildListingPostMessage({ title: 'Don', price: 0, city: 'Owendo' }, url)).not.toContain('FCFA');
    expect(buildListingPostMessage({ title: 'Don', price: 'abc', city: 'Owendo' }, url)).not.toContain('FCFA');
  });

  it('ajoute le pied de post avec catalogue et reseaux', () => {
    const message = buildListingPostMessage({ title: 'Studio meublé', price: 150000 }, url);

    expect(message).toContain('https://www.tonnkama.com/search');
    expect(message).toContain('TikTok :');
    expect(message).toContain('Chaîne WhatsApp :');
    // La Page Facebook est volontairement absente : le post est publié dessus.
    expect(message).not.toContain('Page Facebook');
    // Le lien de l'annonce doit rester avant le pied : c'est lui qui porte la carte d'aperçu.
    expect(message.indexOf(url)).toBeLessThan(message.indexOf('https://www.tonnkama.com/search'));
  });

  it('retombe sur un titre générique si l annonce n en a pas', () => {
    expect(buildListingPostMessage({}, url)).toContain('Nouvelle annonce');
  });
});
