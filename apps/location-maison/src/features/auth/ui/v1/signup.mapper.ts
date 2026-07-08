import { FormRegisterSchemaType } from '@/models/schema';
import { SignupData, SignupError, SignupErrorCode } from '../../services/auth.service.interface';

export function mapSignupErrorToToast(error?: SignupError): { title: string; description: string } {
  const description = error?.message || 'Une erreur est survenue.';

  switch (error?.code) {
    case SignupErrorCode.EMAIL_ALREADY_IN_USE:
      return {
        title: 'Email déjà utilisé',
        description:
          "Cette adresse email est déjà associée à un compte existant. Si c'est votre compte, veuillez vous connecter. Sinon, utilisez une autre adresse email.",
      };
    case SignupErrorCode.PHONE_ALREADY_IN_USE:
      return {
        title: 'Numéro de téléphone déjà utilisé',
        description: 'Ce numéro de téléphone est déjà associé à un compte existant. Veuillez utiliser un autre numéro.',
      };
    case SignupErrorCode.WEAK_PASSWORD:
      return {
        title: 'Mot de passe trop faible',
        description: 'Votre mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.',
      };
    case SignupErrorCode.INVALID_EMAIL:
      return {
        title: 'Email invalide',
        description: "L'adresse email fournie n'est pas valide. Veuillez vérifier votre saisie.",
      };
    case SignupErrorCode.TERMS_NOT_ACCEPTED:
      return {
        title: 'Conditions non acceptées',
        description: "Vous devez accepter les conditions d'utilisation et la politique de confidentialité pour créer un compte.",
      };
    case SignupErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED:
      return {
        title: 'Conditions annonceur non acceptées',
        description: 'Vous devez accepter les conditions annonceur pour créer un compte annonceur.',
      };
    case SignupErrorCode.NETWORK_ERROR:
      return {
        title: 'Erreur de connexion',
        description: 'Une erreur de connexion est survenue. Veuillez vérifier votre connexion internet et réessayer.',
      };
    default:
      return { title: 'Erreur', description };
  }
}

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
