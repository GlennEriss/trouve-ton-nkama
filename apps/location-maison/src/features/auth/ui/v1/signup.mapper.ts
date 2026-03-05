import { FormRegisterSchemaType } from '@/models/schema';
import { SignupData } from '../../services/auth.service.interface';

interface SignupMapperOptions {
  accountType?: 'User' | 'Announcer';
  announcerType?: 'INDIVIDUAL' | 'AGENCY' | 'BROKER' | 'AGENT';
  acceptAnnouncerTerms?: boolean;
}

export function mapRegisterFormToSignupData(
  values: FormRegisterSchemaType,
  options: SignupMapperOptions = {}
): SignupData {
  const birthDate = values.birthdate && values.birthdate.day && values.birthdate.month && values.birthdate.year
    ? `${values.birthdate.year}-${String(values.birthdate.month).padStart(2, '0')}-${String(values.birthdate.day).padStart(2, '0')}`
    : '';

  return {
    email: values.email,
    password: values.password,
    firstName: values.firstname,
    lastName: values.lastname,
    birthDate,
    phoneNumber: values.phone,
    country: values.country || 'GA',
    acceptTerms: values.termsOfPrivacyPolicy,
    accountType: options.accountType || values.accountType || 'User',
    announcerType: options.announcerType,
    acceptAnnouncerTerms: options.acceptAnnouncerTerms ?? values.acceptAnnouncerTerms,
  };
}
