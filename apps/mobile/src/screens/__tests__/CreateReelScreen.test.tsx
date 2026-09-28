import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CreateReelScreen from '../CreateReelScreen';
import { createMobileReelId, createReel, markReelUploadFailed, uploadReelVideo } from '../../api/reels';

jest.mock('expo-image-picker');
jest.mock('../../api/reels', () => ({
  createMobileReelId: jest.fn(),
  createReel: jest.fn(),
  markReelUploadFailed: jest.fn(),
  uploadReelVideo: jest.fn(),
}));

const mockedPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockedPicker = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockedCreateId = createMobileReelId as jest.Mock;
const mockedCreateReel = createReel as jest.Mock;
const mockedUploadVideo = uploadReelVideo as jest.Mock;
const mockedMarkFailed = markReelUploadFailed as jest.Mock;
const navigation = { popToTop: jest.fn() };

async function renderScreen() {
  return await render(<CreateReelScreen navigation={navigation as never} route={{} as never} />);
}

async function selectVideo(duration = 30_000) {
  mockedPermission.mockResolvedValue({ granted: true });
  mockedPicker.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/e2e-reel.mp4', fileName: 'e2e-reel.mp4', duration }],
  });
  await fireEvent.press(screen.getByTestId('reel-video-picker'));
}

describe('CreateReelScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedCreateId.mockReturnValue('uid-test-reel-1');
    mockedCreateReel.mockResolvedValue({ success: true, reelId: 'uid-test-reel-1' });
    mockedUploadVideo.mockResolvedValue(undefined);
    mockedMarkFailed.mockResolvedValue(undefined);
  });

  afterEach(() => alertSpy.mockRestore());

  it('garde la publication désactivée tant que vidéo et catégorie manquent', async () => {
    await renderScreen();
    expect(screen.getByTestId('reel-submit').props.accessibilityState.disabled).toBe(true);
  });

  it('crée puis téléverse un réel Mode avec ses métadonnées', async () => {
    await renderScreen();
    await selectVideo();
    await fireEvent.press(screen.getByTestId('reel-category-mode'));
    await fireEvent.changeText(screen.getByTestId('reel-contact'), '+24106000000');
    await fireEvent.changeText(screen.getByTestId('reel-description'), 'Réel Mode E2E');
    await fireEvent.press(screen.getByTestId('reel-submit'));

    await waitFor(() => expect(mockedUploadVideo).toHaveBeenCalledTimes(1));
    expect(mockedCreateReel).toHaveBeenCalledWith({
      reelId: 'uid-test-reel-1', propertyId: null,
      rawVideoPath: 'reels-raw/uid/uid-test-reel-1.mp4',
      contact: '+24106000000', description: 'Réel Mode E2E', categoryRoot: 'Mode',
    });
    expect(mockedUploadVideo).toHaveBeenCalledWith('file:///tmp/e2e-reel.mp4', 'reels-raw/uid/uid-test-reel-1.mp4', expect.any(Function));
    expect(alertSpy).toHaveBeenCalledWith('Vidéo envoyée', expect.any(String), expect.any(Array));
  });

  it('refuse une vidéo supérieure à dix minutes', async () => {
    await renderScreen();
    await selectVideo(600_001);
    expect(screen.getByRole('alert').props.children).toBe('Vidéo trop longue (10 minutes maximum).');
    expect(mockedCreateReel).not.toHaveBeenCalled();
  });

  it("marque le réel en échec si le téléversement vidéo échoue", async () => {
    mockedUploadVideo.mockRejectedValue(new Error('Upload interrompu.'));
    await renderScreen();
    await selectVideo();
    await fireEvent.press(screen.getByTestId('reel-category-immobilier'));
    await fireEvent.press(screen.getByTestId('reel-submit'));

    await waitFor(() => expect(mockedMarkFailed).toHaveBeenCalledWith('uid-test-reel-1', 'Upload interrompu.'));
    expect(await screen.findByText('Upload interrompu.')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
