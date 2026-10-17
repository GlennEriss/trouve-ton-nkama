import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CreateListingScreen from '../CreateListingScreen';
import { getPublishableLeaves } from '../../api/categories';
import { createMobileListing, requestCategoryDraft, requestPropertyDraft, uploadListingImages } from '../../api/publishing';

jest.mock('expo-image-picker');
jest.mock('../../api/categories', () => ({ getPublishableLeaves: jest.fn() }));
jest.mock('../../api/publishing', () => ({
  createMobileListing: jest.fn(),
  requestCategoryDraft: jest.fn(),
  requestPropertyDraft: jest.fn(),
  uploadListingImages: jest.fn(),
}));

const mockedPickerPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockedLaunchPicker = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockedUploadImages = uploadListingImages as jest.Mock;
const mockedPropertyDraft = requestPropertyDraft as jest.Mock;
const mockedCategoryDraft = requestCategoryDraft as jest.Mock;
const mockedCreateListing = createMobileListing as jest.Mock;
const mockedLeaves = getPublishableLeaves as jest.Mock;

const image = { uri: 'file:///tmp/e2e-annonce.jpg', fileName: 'e2e-annonce.jpg', mimeType: 'image/jpeg', width: 800, height: 600 };
const uploadedImage = { fileURL: 'https://storage.test/e2e-annonce.jpg', filePATH: 'property/e2e-annonce.jpg' };
const navigation = { popToTop: jest.fn() };

async function renderScreen(categorySlug: string, categoryName: string) {
  return await render(
    <CreateListingScreen
      route={{ key: 'create', name: 'CreateListing', params: { categorySlug, categoryName } } as never}
      navigation={navigation as never}
    />,
  );
}

async function selectOneImage() {
  mockedPickerPermission.mockResolvedValue({ granted: true });
  mockedLaunchPicker.mockResolvedValue({ canceled: false, assets: [image] });
  await fireEvent.press(screen.getByTestId('listing-image-picker'));
}

describe('CreateListingScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedUploadImages.mockResolvedValue([uploadedImage]);
    mockedCreateListing.mockResolvedValue({ success: true, id: 'listing-e2e-1' });
  });

  afterEach(() => alertSpy.mockRestore());

  it("bloque une annonce immobilière incomplète sans appeler l'API", async () => {
    await renderScreen('immobilier', 'Immobilier');
    await fireEvent.press(screen.getByTestId('listing-submit'));

    expect(screen.getByText(/Complète d'abord : une description/)).toBeTruthy();
    expect(uploadListingImages).not.toHaveBeenCalled();
    expect(createMobileListing).not.toHaveBeenCalled();
  });

  it("crée une annonce immobilière avec photo, localisation et statut propriétaire", async () => {
    const draft = { title: 'Studio E2E', price: 85000, typeProperty: 'Studio' };
    mockedPropertyDraft.mockResolvedValue(draft);
    await renderScreen('immobilier', 'Immobilier');

    await fireEvent.changeText(screen.getByTestId('listing-description'), 'Studio test à louer avec douche interne pour 85 000 FCFA.');
    await fireEvent.changeText(screen.getByTestId('listing-district'), 'Nzeng-Ayong');
    await fireEvent(screen.getByTestId('listing-is-owner'), 'valueChange', true);
    await selectOneImage();
    await fireEvent.press(screen.getByTestId('listing-submit'));

    await waitFor(() => expect(mockedCreateListing).toHaveBeenCalledTimes(1));
    expect(mockedPropertyDraft).toHaveBeenCalledWith('Studio test à louer avec douche interne pour 85 000 FCFA.');
    expect(mockedCreateListing).toHaveBeenCalledWith({
      kind: 'immobilier', draft, images: [uploadedImage], isOwner: true,
      province: 'Estuaire', city: 'Libreville', district: 'Nzeng-Ayong',
    });
    expect(alertSpy).toHaveBeenCalledWith('Annonce créée', expect.any(String), expect.any(Array));
  });

  it('crée une annonce Mode avec la catégorie détectée et validée', async () => {
    const draft = { title: 'Robe E2E', price: 12000, categoryId: 'robes' };
    mockedCategoryDraft.mockResolvedValue(draft);
    mockedLeaves.mockResolvedValue([{ id: 'robes', name: 'Robes', rootName: 'Mode' }]);
    await renderScreen('mode', 'Mode');

    await fireEvent.changeText(screen.getByTestId('listing-description'), 'Robe longue noire neuve disponible à Libreville pour 12 000 FCFA.');
    await selectOneImage();
    await fireEvent.press(screen.getByTestId('listing-submit'));

    await waitFor(() => expect(mockedCreateListing).toHaveBeenCalledTimes(1));
    expect(mockedCreateListing).toHaveBeenCalledWith({
      kind: 'category',
      draft: { ...draft, categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Robes' } },
      images: [uploadedImage],
    });
  });

  it("affiche l'erreur et ne confirme pas si la création échoue", async () => {
    mockedPropertyDraft.mockRejectedValue(new Error('Service IA indisponible.'));
    await renderScreen('immobilier', 'Immobilier');
    await fireEvent.changeText(screen.getByTestId('listing-description'), 'Appartement test suffisamment détaillé.');
    await fireEvent.changeText(screen.getByTestId('listing-district'), 'Glass');
    await selectOneImage();
    await fireEvent.press(screen.getByTestId('listing-submit'));

    expect(await screen.findByText('Service IA indisponible.')).toBeTruthy();
    expect(mockedCreateListing).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
