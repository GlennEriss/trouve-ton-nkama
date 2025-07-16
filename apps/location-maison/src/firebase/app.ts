import { firebaseClientConfig } from './firebaseClientConfig';
import { initializeApp, getApp, getApps } from 'firebase/app';

const setupFirebase = () => {
  if (getApps().length) return getApp();
  return initializeApp(firebaseClientConfig);
};

export const app = setupFirebase();
