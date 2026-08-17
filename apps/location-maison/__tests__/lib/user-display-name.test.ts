import { getUserDisplayInitial, getUserDisplayName } from '@/lib/user-display-name'

describe('getUserDisplayName', () => {
  it('prefere le pseudo au nom civil', () => {
    expect(getUserDisplayName({ pseudo: "kiss&sis'shop", firstname: 'Loddy', lastname: 'Kiss' }))
      .toBe("kiss&sis'shop")
  })

  it('retombe sur prenom + nom quand il n y a pas de pseudo', () => {
    // Cas de l'immense majorite des comptes existants au moment de l'ajout du champ.
    expect(getUserDisplayName({ firstname: 'Loddy', lastname: 'Kiss' })).toBe('Loddy Kiss')
  })

  it('ignore un pseudo vide ou fait uniquement d espaces', () => {
    expect(getUserDisplayName({ pseudo: '   ', firstname: 'Loddy', lastname: 'Kiss' })).toBe('Loddy Kiss')
    expect(getUserDisplayName({ pseudo: '', firstname: 'Loddy', lastname: 'Kiss' })).toBe('Loddy Kiss')
  })

  it('tolere un nom partiel', () => {
    expect(getUserDisplayName({ firstname: 'Loddy' })).toBe('Loddy')
    expect(getUserDisplayName({ lastname: 'Kiss' })).toBe('Kiss')
  })

  it('renvoie null quand aucun nom n est exploitable', () => {
    // L'appelant choisit alors son propre repli plutot que d'afficher "undefined undefined".
    expect(getUserDisplayName({})).toBeNull()
    expect(getUserDisplayName(null)).toBeNull()
    expect(getUserDisplayName(undefined)).toBeNull()
  })
})

describe('getUserDisplayInitial', () => {
  it('derive l initiale du meme nom que le libelle affiche', () => {
    expect(getUserDisplayInitial({ pseudo: "kiss&sis'shop", firstname: 'Loddy' })).toBe('K')
    expect(getUserDisplayInitial({ firstname: 'loddy', lastname: 'Kiss' })).toBe('L')
  })

  it('renvoie une chaine vide sans nom', () => {
    expect(getUserDisplayInitial(null)).toBe('')
  })
})
