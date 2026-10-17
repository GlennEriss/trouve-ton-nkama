import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import EditListingScreen from '../EditListingScreen';
import { getMyListing, updateMyListing } from '../../api/myListings';
import { uploadListingImages } from '../../api/publishing';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

jest.mock('expo-image-picker');
jest.mock('../../api/myListings', () => ({ getMyListing: jest.fn(), updateMyListing: jest.fn() }));
jest.mock('../../api/publishing', () => ({ uploadListingImages: jest.fn() }));
jest.mock('../../navigation/navigationRef', () => ({ navigationRef: { navigate: jest.fn() } }));

const mockedGetListing = getMyListing as jest.Mock;
const mockedUpdateListing = updateMyListing as jest.Mock;
const mockedUpload = uploadListingImages as jest.Mock;
const route = { key: 'edit', name: 'EditListing', params: { listingId: 'listing-1' } };

const listing = {
  id: 'listing-1', title: 'Studio initial', description: 'Description initiale du studio.', price: 85000,
  typeProperty: 'Studio', status: 'FOR_RENT', moderationStatus: 'APPROVED', state: 'IN_PROGRESS',
  province: 'Estuaire', city: 'Libreville', street: 'Glass', isOwner: true,
  images: [{ fileURL: 'https://storage.test/ancienne.jpg', filePATH: 'property/ancienne.jpg' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetListing.mockResolvedValue(listing);
  mockedUpdateListing.mockResolvedValue(undefined);
  mockedUpload.mockResolvedValue([]);
});

it('préremplit puis met à jour la même annonce sans recréation', async () => {
  await renderWithProviders(<EditListingScreen route={route as never} navigation={{} as never} />);
  expect(await screen.findByDisplayValue('Studio initial')).toBeTruthy();
  expect(screen.getByDisplayValue('85000')).toBeTruthy();

  await fireEvent.changeText(screen.getByTestId('edit-listing-title'), 'Studio rénové');
  await fireEvent.changeText(screen.getByTestId('edit-listing-price'), '95000');
  await fireEvent.press(screen.getByTestId('edit-listing-submit'));

  await waitFor(() => expect(mockedUpdateListing).toHaveBeenCalledTimes(1));
  expect(mockedUpdateListing).toHaveBeenCalledWith('listing-1', expect.objectContaining({
    title: 'Studio rénové', price: 95000, images: listing.images,
  }), false);
});

it('demande confirmation avant de retirer une photo existante', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await renderWithProviders(<EditListingScreen route={route as never} navigation={{} as never} />);
  await screen.findByDisplayValue('Studio initial');
  await fireEvent.press(screen.getByTestId('edit-remove-existing-0'));
  expect(alertSpy).toHaveBeenCalledWith('Supprimer cette photo ?', expect.any(String), expect.any(Array));
  const buttons = alertSpy.mock.calls.at(-1)?.[2] as { text: string; onPress?: () => void }[];
  await act(async () => buttons.find((button) => button.text === 'Supprimer')?.onPress?.());
  expect(screen.queryByTestId('edit-remove-existing-0')).toBeNull();
  alertSpy.mockRestore();
});

it('ajoute une nouvelle photo et resoumet une annonce rejetée', async () => {
  mockedGetListing.mockResolvedValue({ ...listing, moderationStatus: 'REJECTED' });
  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///nouvelle.jpg', fileName: 'nouvelle.jpg', width: 100, height: 100 }] });
  mockedUpload.mockResolvedValue([{ fileURL: 'https://storage.test/nouvelle.jpg', filePATH: 'property/nouvelle.jpg' }]);

  await renderWithProviders(<EditListingScreen route={route as never} navigation={{} as never} />);
  await screen.findByDisplayValue('Studio initial');
  await fireEvent.press(screen.getByTestId('edit-listing-image-picker'));
  await fireEvent.press(screen.getByTestId('edit-listing-submit'));

  await waitFor(() => expect(mockedUpdateListing).toHaveBeenCalled());
  expect(mockedUpload).toHaveBeenCalledTimes(1);
  expect(mockedUpdateListing).toHaveBeenCalledWith('listing-1', expect.objectContaining({ images: expect.arrayContaining([expect.objectContaining({ fileURL: 'https://storage.test/nouvelle.jpg' })]) }), true);
});
