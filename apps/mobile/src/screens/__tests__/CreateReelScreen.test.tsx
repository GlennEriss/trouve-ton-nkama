import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CreateReelScreen from '../CreateReelScreen';
import { buildMobileRawReelVideoPath, createMobileReelId, createReel, markReelUploadFailed, uploadReelVideo } from '../../api/reels';
import { getOwnedListing, listMyListings } from '../../api/myListings';
import { mockVideoPlayer } from '../../test-utils/expoVideoMock';

jest.mock('expo-image-picker');
jest.mock('../../api/reels', () => ({
  buildMobileRawReelVideoPath: jest.fn(),
  createMobileReelId: jest.fn(),
  createReel: jest.fn(),
  markReelUploadFailed: jest.fn(),
  uploadReelVideo: jest.fn(),
}));
jest.mock('../../api/myListings', () => ({ getOwnedListing: jest.fn(), listMyListings: jest.fn().mockResolvedValue([]) }));
jest.mock('../../hooks/useUserDoc', () => ({ useUserDoc: () => ({ userDoc: { phoneNumbers: ['+241077000000'] }, isLoading: false }) }));

const mockedPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockedPicker = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockedCreateId = createMobileReelId as jest.Mock;
const mockedBuildPath = buildMobileRawReelVideoPath as jest.Mock;
const mockedCreateReel = createReel as jest.Mock;
const mockedUploadVideo = uploadReelVideo as jest.Mock;
const mockedMarkFailed = markReelUploadFailed as jest.Mock;
const mockedListMyListings = listMyListings as jest.Mock;
const mockedGetOwnedListing = getOwnedListing as jest.Mock;
const navigation = { popToTop: jest.fn(), goBack: jest.fn() };

async function renderScreen(propertyId?: string) {
  return await render(<CreateReelScreen navigation={navigation as never} route={{ params: propertyId ? { propertyId } : undefined } as never} />);
}

async function selectVideo(duration = 30_000, overrides: Record<string, unknown> = {}) {
  mockedPermission.mockResolvedValue({ granted: true });
  mockedPicker.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/e2e-reel.mp4', fileName: 'e2e-reel.mp4', duration, fileSize: 10 * 1024 * 1024, mimeType: 'video/mp4', ...overrides }],
  });
  await fireEvent.press(screen.getByTestId('reel-video-picker'));
}

describe('CreateReelScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedCreateId.mockReturnValue('uid-test-reel-1');
    mockedBuildPath.mockReturnValue('reels-raw/uid-complet/uid-test-reel-1.mp4');
    mockedCreateReel.mockResolvedValue({ success: true, reelId: 'uid-test-reel-1' });
    mockedUploadVideo.mockResolvedValue(undefined);
    mockedMarkFailed.mockResolvedValue(undefined);
    mockedListMyListings.mockResolvedValue([]);
    mockedGetOwnedListing.mockResolvedValue(undefined);
  });

  afterEach(() => alertSpy.mockRestore());

  it('affiche le sélecteur natif avant la vidéo, sans formulaire ni bouton de publication', async () => {
    await renderScreen();
    expect(screen.getByTestId('reel-video-picker')).toBeTruthy();
    expect(screen.queryByTestId('reel-submit')).toBeNull();
    expect(screen.queryByText('ESPACE ANNONCEUR')).toBeNull();
  });

  it('crée puis téléverse un réel Mode avec ses métadonnées', async () => {
    await renderScreen();
    await selectVideo();
    expect(screen.getByTestId('reel-video-preview')).toBeTruthy();
    expect(screen.getByTestId('reel-trim-timeline')).toBeTruthy();
    expect(screen.getByTestId('reel-video-metadata').props.children.join('')).toContain('0:30');
    await fireEvent.press(screen.getByTestId('reel-category-mode'));
    await fireEvent.press(screen.getByTestId('reel-contact-toggle'));
    await fireEvent.changeText(screen.getByTestId('reel-contact'), '+24106000000');
    await fireEvent.changeText(screen.getByTestId('reel-description'), 'Réel Mode E2E');
    await fireEvent.press(screen.getByTestId('reel-submit'));

    await waitFor(() => expect(mockedUploadVideo).toHaveBeenCalledTimes(1));
    expect(mockedCreateReel).toHaveBeenCalledWith({
      reelId: 'uid-test-reel-1', propertyId: null,
      rawVideoPath: 'reels-raw/uid-complet/uid-test-reel-1.mp4',
      contact: '+24106000000', description: 'Réel Mode E2E', categoryRoot: 'Mode',
    });
    expect(mockedBuildPath).toHaveBeenCalledWith('uid-test-reel-1', 'e2e-reel.mp4');
    expect(mockedUploadVideo).toHaveBeenCalledWith('file:///tmp/e2e-reel.mp4', 'reels-raw/uid-complet/uid-test-reel-1.mp4', expect.any(Function), 'video/mp4');
    expect(alertSpy).toHaveBeenCalledWith('Vidéo envoyée', expect.any(String), expect.any(Array));
  });

  it('refuse une vidéo supérieure à dix minutes', async () => {
    await renderScreen();
    await selectVideo(600_001);
    expect(screen.getByRole('alert').props.children).toBe('Vidéo trop longue (10 minutes maximum).');
    expect(mockedCreateReel).not.toHaveBeenCalled();
  });

  it('refuse un format vidéo non supporté', async () => {
    await renderScreen();
    await selectVideo(30_000, { fileName: 'reel.avi', mimeType: 'video/x-msvideo' });
    expect(screen.getByRole('alert').props.children).toContain('Format non supporté');
    expect(screen.queryByTestId('reel-video-preview')).toBeNull();
  });

  it('transmet le son coupé au backend', async () => {
    await renderScreen();
    await selectVideo();
    await fireEvent.press(screen.getByTestId('reel-mute'));
    await fireEvent.press(screen.getByTestId('reel-submit'));
    await waitFor(() => expect(mockedCreateReel).toHaveBeenCalledWith(expect.objectContaining({ muted: true })));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Vidéo envoyée', expect.any(String), expect.any(Array)));
  });

  it('lie le réel à une annonce et utilise son contact sans envoyer categoryRoot', async () => {
    mockedListMyListings.mockResolvedValue([{ id: 'property-1', title: 'Maison Akanda', typeProperty: 'Home', city: 'Akanda', contact: '+241066111111' }]);
    await renderScreen();
    await selectVideo();
    await fireEvent.press(screen.getByTestId('reel-listing-picker'));
    await fireEvent.press(await screen.findByTestId('reel-listing-property-1'));
    await fireEvent.press(screen.getByTestId('reel-submit'));

    await waitFor(() => expect(mockedCreateReel).toHaveBeenCalled());
    expect(mockedCreateReel).toHaveBeenCalledWith(expect.objectContaining({
      propertyId: 'property-1',
      contact: '+241066111111',
    }));
    expect(mockedCreateReel.mock.calls[0][0]).not.toHaveProperty('categoryRoot');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Vidéo envoyée', expect.any(String), expect.any(Array)));
  });

  it('préselectionne automatiquement l’annonce transmise depuis Mes annonces', async () => {
    mockedGetOwnedListing.mockResolvedValue({ id: 'property-mode', title: 'Robe noire', categoryPath: { lvl0: 'Mode' }, city: 'Libreville', contact: '+241066222222' });
    await renderScreen('property-mode');
    expect(await screen.findByText('Pour « Robe noire »')).toBeTruthy();
    await selectVideo();
    await fireEvent.press(screen.getByTestId('reel-submit'));
    await waitFor(() => expect(mockedCreateReel).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 'property-mode', contact: '+241066222222' })));
    expect(mockedCreateReel.mock.calls[0][0]).not.toHaveProperty('categoryRoot');
  });

  it('affiche une erreur si l’annonce présélectionnée a disparu', async () => {
    mockedGetOwnedListing.mockRejectedValue(new Error('Annonce introuvable.'));
    await renderScreen('missing');
    expect(await screen.findByText('Annonce introuvable.')).toBeTruthy();
    expect(screen.queryByText(/Pour «/)).toBeNull();
  });

  it('bloque une double pression sur envoyer', async () => {
    let resolveCreation!: (value: { success: true; reelId: string }) => void;
    mockedCreateReel.mockReturnValue(new Promise((resolve) => { resolveCreation = resolve; }));
    await renderScreen();
    await selectVideo();
    await fireEvent.press(screen.getByTestId('reel-submit'));
    await fireEvent.press(screen.getByTestId('reel-submit'));
    expect(mockedCreateReel).toHaveBeenCalledTimes(1);
    await act(async () => { resolveCreation({ success: true, reelId: 'uid-test-reel-1' }); });
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Vidéo envoyée', expect.any(String), expect.any(Array)));
  });

  it('demande confirmation avant de fermer un montage en cours', async () => {
    await renderScreen();
    await selectVideo();
    await fireEvent.press(screen.getByTestId('reel-close'));
    expect(alertSpy).toHaveBeenCalledWith('Abandonner ce réel ?', expect.any(String), expect.any(Array));
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('ne manipule pas le lecteur déjà libéré au démontage de l’éditeur', async () => {
    const view = await renderScreen();
    await selectVideo();
    mockVideoPlayer.pause.mockClear();

    view.unmount();

    expect(mockVideoPlayer.pause).not.toHaveBeenCalled();
  });

  it("marque le réel en échec si le téléversement vidéo échoue", async () => {
    mockedUploadVideo.mockRejectedValue(new Error('Upload interrompu.'));
    await renderScreen();
    await selectVideo();
    await fireEvent.press(screen.getByTestId('reel-submit'));

    await waitFor(() => expect(mockedMarkFailed).toHaveBeenCalledWith('uid-test-reel-1', 'Upload interrompu.'));
    expect(await screen.findByText('Upload interrompu.')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
