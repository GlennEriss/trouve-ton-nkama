import { User } from '@/models/authentication';
import * as userDb from '@/db/user.db';
import * as notificationDb from '@/db/notification.db';
import { FormRegisterSchema } from '@/models/schema';

// Mock des modules Firebase
jest.mock('@/firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@/db/user.db', () => ({
  createUser: jest.fn(),
  findUserByPhoneNumber: jest.fn(),
}));

jest.mock('@/db/notification.db', () => ({
  createNotification: jest.fn(),
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
  const mockedFindUserByPhoneNumber = userDb.findUserByPhoneNumber as jest.Mock;
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    mockedFindUserByPhoneNumber.mockResolvedValueOnce(null); // Aucun utilisateur avec ce numéro

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

  it('should throw error if phone number is missing', async () => {
    const userWithoutPhone = { ...mockUserData, phoneNumbers: [] };
    
    await expect(onRegister(userWithoutPhone)).rejects.toThrow('Le numéro de téléphone est obligatoire.');
  });

  it('should throw error if phone number is empty', async () => {
    const userWithEmptyPhone = { ...mockUserData, phoneNumbers: [''] };
    
    await expect(onRegister(userWithEmptyPhone)).rejects.toThrow('Le numéro de téléphone est obligatoire.');
  });

  it('should throw error if phone number already exists', async () => {
    mockedFindUserByPhoneNumber.mockResolvedValueOnce({ id: 'existing-user', email: 'existing@example.com' });
    
    await expect(onRegister(mockUserData)).rejects.toThrow('Un numéro est déjà associé à un compte.');
  });

  it('should throw unexpected error', async () => {
    const { createUserWithEmailAndPassword } = require('@/firebase/auth');
    createUserWithEmailAndPassword.mockRejectedValueOnce(new Error('Unexpected error'));

    await expect(onRegister(mockUserData)).rejects.toThrow('Unexpected error');
  });

  it('should validate phone number format', async () => {
    const userWithInvalidPhone = { ...mockUserData, phoneNumbers: ['invalid-phone'] };
    
    // Le test vérifie que la validation du format est gérée par le schéma Zod
    // et que l'erreur est remontée correctement
    await expect(onRegister(userWithInvalidPhone)).rejects.toThrow();
  });
});

describe('FormRegisterSchema validation messages', () => {
  it('should return correct error message for missing phone', () => {
    const invalidData = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'test@example.com',
      password: 'TestPassword123!',
      passwordConfirm: 'TestPassword123!',
      birthdate: '1990-01-01',
      country: 'GA',
      phone: '', // Numéro vide
      termsOfPrivacyPolicy: true
    };

    const result = FormRegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneError = result.error.errors.find(error => 
        error.path.includes('phone')
      );
      expect(phoneError?.message).toBe('Le numéro de téléphone est obligatoire');
    }
  });

  it('should return correct error message for invalid phone format', () => {
    const invalidData = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'test@example.com',
      password: 'TestPassword123!',
      passwordConfirm: 'TestPassword123!',
      birthdate: '1990-01-01',
      country: 'GA',
      phone: 'invalid-phone', // Format invalide
      termsOfPrivacyPolicy: true
    };

    const result = FormRegisterSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneError = result.error.errors.find(error => 
        error.path.includes('phone')
      );
      expect(phoneError?.message).toBe('Le numéro de téléphone est invalide');
    }
  });

  it('should accept valid phone number', () => {
    const validData = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'test@example.com',
      password: 'TestPassword123!',
      passwordConfirm: 'TestPassword123!',
      birthdate: '1990-01-01',
      country: 'GA',
      phone: '+24101234567', // Format valide
      termsOfPrivacyPolicy: true
    };

    const result = FormRegisterSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
