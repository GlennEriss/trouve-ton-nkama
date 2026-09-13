import { render, fireEvent } from '@testing-library/react-native';
import { LocationSelect } from '../LocationSelect';

const OPTIONS = [
  { label: 'Franceville', value: 'Franceville' },
  { label: 'Libreville', value: 'Libreville' },
  { label: 'Port-Gentil', value: 'Port-Gentil' },
];

describe('LocationSelect', () => {
  it('affiche le placeholder tant qu’aucune valeur n’est sélectionnée', async () => {
    const { getByText } = await render(
      <LocationSelect testID="loc" label="Ville" options={OPTIONS} placeholder="Toutes les villes" onSelect={jest.fn()} />,
    );
    expect(getByText('Toutes les villes')).toBeTruthy();
  });

  it('affiche le libellé de la valeur sélectionnée (pas la valeur brute)', async () => {
    const { getByText, queryByText } = await render(
      <LocationSelect
        testID="loc"
        label="Ville"
        value="Libreville"
        options={OPTIONS}
        placeholder="Toutes les villes"
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Libreville')).toBeTruthy();
    expect(queryByText('Toutes les villes')).toBeNull();
  });

  it('ouvre la liste des options au tap', async () => {
    const { getByTestId } = await render(
      <LocationSelect testID="loc" label="Ville" options={OPTIONS} placeholder="Toutes les villes" onSelect={jest.fn()} />,
    );
    await fireEvent.press(getByTestId('loc'));
    expect(getByTestId('loc-modal')).toBeTruthy();
    expect(getByTestId('loc-option-Franceville')).toBeTruthy();
    expect(getByTestId('loc-option-Libreville')).toBeTruthy();
    expect(getByTestId('loc-option-Port-Gentil')).toBeTruthy();
  });

  it('filtre les options par la recherche tapée, insensible à la casse', async () => {
    const { getByTestId, queryByTestId } = await render(
      <LocationSelect testID="loc" label="Ville" options={OPTIONS} placeholder="Toutes les villes" onSelect={jest.fn()} />,
    );
    await fireEvent.press(getByTestId('loc'));
    await fireEvent.changeText(getByTestId('loc-search-input'), 'libre');
    expect(getByTestId('loc-option-Libreville')).toBeTruthy();
    expect(queryByTestId('loc-option-Franceville')).toBeNull();
    expect(queryByTestId('loc-option-Port-Gentil')).toBeNull();
  });

  it('affiche un message quand la recherche ne correspond à rien', async () => {
    const { getByTestId, getByText } = await render(
      <LocationSelect testID="loc" label="Ville" options={OPTIONS} placeholder="Toutes les villes" onSelect={jest.fn()} />,
    );
    await fireEvent.press(getByTestId('loc'));
    await fireEvent.changeText(getByTestId('loc-search-input'), 'zzz');
    expect(getByText('Aucun résultat pour « zzz ».')).toBeTruthy();
  });

  it('sélectionner une option appelle onSelect avec sa valeur et ferme la modale', async () => {
    const onSelect = jest.fn();
    const { getByTestId, queryByTestId } = await render(
      <LocationSelect testID="loc" label="Ville" options={OPTIONS} placeholder="Toutes les villes" onSelect={onSelect} />,
    );
    await fireEvent.press(getByTestId('loc'));
    await fireEvent.press(getByTestId('loc-option-Libreville'));
    expect(onSelect).toHaveBeenCalledWith('Libreville');
    expect(queryByTestId('loc-modal')).toBeNull();
  });

  it('"Tous / Toutes" appelle onSelect avec undefined (efface le filtre)', async () => {
    const onSelect = jest.fn();
    const { getByTestId } = await render(
      <LocationSelect
        testID="loc"
        label="Ville"
        value="Libreville"
        options={OPTIONS}
        placeholder="Toutes les villes"
        onSelect={onSelect}
      />,
    );
    await fireEvent.press(getByTestId('loc'));
    await fireEvent.press(getByTestId('loc-option-tout'));
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });

  it('désactivé : le tap sur le déclencheur n’ouvre pas la modale (cascade non résolue)', async () => {
    const { getByTestId, queryByTestId } = await render(
      <LocationSelect
        testID="loc"
        label="Ville"
        options={OPTIONS}
        placeholder="Choisissez d'abord une province"
        disabled
        onSelect={jest.fn()}
      />,
    );
    await fireEvent.press(getByTestId('loc'));
    expect(queryByTestId('loc-modal')).toBeNull();
  });

  it('affiche "Chargement..." pendant le chargement des options', async () => {
    const { getByText } = await render(
      <LocationSelect testID="loc" label="Ville" options={[]} placeholder="Toutes les villes" loading onSelect={jest.fn()} />,
    );
    expect(getByText('Chargement...')).toBeTruthy();
  });
});
