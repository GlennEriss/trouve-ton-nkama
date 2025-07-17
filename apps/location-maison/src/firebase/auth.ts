import { getAuth } from "firebase/auth";
import { app } from "./app";

export const auth = getAuth(app);
export {
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithCustomToken,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updatePassword,
  updateProfile,
  updateEmail,
  signOut,
  signInWithPopup,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  type Auth,
  type User,
  GoogleAuthProvider,
  type Unsubscribe,
  // Phone auth exports
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  type ConfirmationResult
} from "firebase/auth";
