import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import { firebaseConfig } from './config';
export const adminApp =
  admin.apps.length === 0
    ? admin.initializeApp({
        credential: admin.credential.cert(
          firebaseConfig as admin.ServiceAccount
        ),
      })
    : admin.apps[0];

export const adminAuth = getAuth(adminApp as App);