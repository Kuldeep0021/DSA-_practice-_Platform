import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

function loadServiceAccount(): admin.ServiceAccount | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string) as admin.ServiceAccount;
    } catch (e) {
      console.warn('FIREBASE_SERVICE_ACCOUNT is set but invalid JSON.');
    }
  }

  const saPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    try {
      const raw = fs.readFileSync(saPath, 'utf8');
      return JSON.parse(raw) as admin.ServiceAccount;
    } catch (e) {
      console.warn('Failed to read service-account.json:', e);
    }
  }

  return null;
}

export function initAdmin() {
  if (admin.apps && admin.apps.length > 0) return admin;

  const svc = loadServiceAccount();
  if (svc) {
    admin.initializeApp({ credential: admin.credential.cert(svc) });
  } else {
    // Fallback to Application Default Credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS)
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn(
        'No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT (stringified JSON), place service-account.json in the project root, or set GOOGLE_APPLICATION_CREDENTIALS to the path of a service account file.'
      );
    }

    try {
      admin.initializeApp();
    } catch (err) {
      console.error('Failed to initialize Firebase Admin SDK with default credentials:', err);
      throw err;
    }
  }

  return admin;
}

export function getAdmin() {
  return initAdmin();
}

export function getFirestore() {
  return initAdmin().firestore();
}

export function getAuth() {
  return initAdmin().auth();
}
