import type { User } from '@/models/authentication';

export enum ProfileInformationErrorCode {
  USER_ID_REQUIRED = 'USER_ID_REQUIRED',
  FIRSTNAME_REQUIRED = 'FIRSTNAME_REQUIRED',
  LASTNAME_REQUIRED = 'LASTNAME_REQUIRED',
  INVALID_BIRTHDATE = 'INVALID_BIRTHDATE',
  UNDERAGE = 'UNDERAGE',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_COUNTRY = 'INVALID_COUNTRY',
  PHONE_ALREADY_IN_USE = 'PHONE_ALREADY_IN_USE',
  PHONE_CHANGE_LOCKED = 'PHONE_CHANGE_LOCKED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UPDATE_FAILED = 'UPDATE_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type UpdateProfileInformationData = {
  uid: string;
  firstname: string;
  lastname: string;
  birthDate: string;
  phoneNumber: string;
  countryCode: string;
};

export type ProfileInformationError = {
  code: ProfileInformationErrorCode;
  message: string;
};

export type UpdateProfileInformationResult = {
  success: boolean;
  user?: User;
  error?: ProfileInformationError;
};

export interface ProfileInformationService {
  updateProfileInformation(
    data: UpdateProfileInformationData
  ): Promise<UpdateProfileInformationResult>;
}
