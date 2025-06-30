import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import { firebaseAdminConfig } from './firebaseAdminConfig';
export const adminApp =
  admin.apps.length === 0
    ? admin.initializeApp({
      credential: admin.credential.cert(
        firebaseAdminConfig as admin.ServiceAccount
      ),
    })
    : admin.apps[0];

export const adminAuth = getAuth(adminApp as App);