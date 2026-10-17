import { getAuth } from '@react-native-firebase/auth';
import { updateDoc } from '@react-native-firebase/firestore';
import { notificationSettings, updateNotificationSetting } from '../settings';
jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
beforeEach(() => { jest.clearAllMocks(); (getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'self' } }); });
it.each(notificationSettings)('écrit uniquement notificationParameter.$key', async ({ key }) => {
  await updateNotificationSetting(key, true);
  expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { [`notificationParameter.${key}`]: true });
});
it('refuse les écritures sans session', async () => {
  (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
  await expect(updateNotificationSetting('isNew', false)).rejects.toThrow('Reconnectez-vous');
  expect(updateDoc).not.toHaveBeenCalled();
});
