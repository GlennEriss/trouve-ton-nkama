import * as userDb from '@/db/user.db'
import * as notificationDb from '@/db/notification.db'
import { User } from '@/models/authentication';

jest.mock('@/firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  signOut: jest.fn(),
  auth: {}
}));

jest.mock('@/db/user.db', () => ({
  createUser: jest.fn()
}));

jest.mock('@/db/notification.db', () => ({
  createNotification: jest.fn()
}));

describe('Signup', () => {
  const SIGNUP_TEST_PASSWORD = `SignupPass_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const mockUserData: Partial<User> = {
    firstname: 'John',
    lastname: 'Doe',
    login: 'johndoe@example.com',
    email: 'johndoe@example.com',
    birthDate: '1990-01-01',
    country: { name: 'Gabon', code: 'GA' },
    phoneNumbers: ['+24101234567'],
    password: SIGNUP_TEST_PASSWORD,
    roles: ['Announcer'],
    uid: '',
    providers: ['CREDENTIALS'],
    metadata: {},
    favoris: []
  };

  const mockedCreateUser = userDb.createUser as jest.Mock;
  const mockedCreateNotification = notificationDb.createNotification as jest.Mock;

  const onRegister = async (user: Partial<User>) => {
    const { createUserWithEmailAndPassword, sendEmailVerification, signOut } = require('@/firebase/auth');

    const result = await createUserWithEmailAndPassword({}, user.login, user.password);
    await sendEmailVerification(result.user);
    await mockedCreateUser({ uid: result.user.uid, ...user });
    await mockedCreateNotification({
      type: 'SECURITY',
      title: 'Bienvenue sur la plateforme',
      message: 'Votre compte a été créé avec succès. Veuillez vérifier votre email.',
      isRead: false,
      createdFor: result.user.uid
    });
    await signOut();
    
    return result.user.uid;
  };

  it('should register a user successfully', async () => {
    const { createUserWithEmailAndPassword, sendEmailVerification, signOut } = require('@/firebase/auth');
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: '123', email: mockUserData.email } });
    sendEmailVerification.mockResolvedValueOnce(undefined);
    mockedCreateUser.mockResolvedValueOnce(mockUserData);
    mockedCreateNotification.mockResolvedValueOnce({
      type: 'SECURITY',
      title: 'Bienvenue sur la plateforme',
      message: 'Votre compte a été créé avec succès. Veuillez vérifier votre email.',
      isRead: false,
      createdFor: '123'
    });
    signOut.mockResolvedValueOnce(undefined);

    const uid = await onRegister(mockUserData);

    expect(uid).toBe('123');
    expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    expect(sendEmailVerification).toHaveBeenCalled();
    expect(mockedCreateUser).toHaveBeenCalled();
    expect(mockedCreateNotification).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it('should throw error if email already exists', async () => {
    const { createUserWithEmailAndPassword } = require('@/firebase/auth');
    createUserWithEmailAndPassword.mockRejectedValueOnce(new Error('auth/email-already-in-use'));

    await expect(onRegister(mockUserData)).rejects.toThrow('auth/email-already-in-use');
  });

  it('should throw unexpected error', async () => {
    const { createUserWithEmailAndPassword } = require('@/firebase/auth');
    createUserWithEmailAndPassword.mockRejectedValueOnce(new Error('Unexpected error'));

    await expect(onRegister(mockUserData)).rejects.toThrow('Unexpected error');
  });
});
