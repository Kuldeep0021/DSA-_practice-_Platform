const admin = require('firebase-admin');
const path = require('path');

function init() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(svc) });
      return;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT invalid JSON', e.message || e);
    }
  }

  const saPath = path.join(process.cwd(), 'service-account.json');
  try {
    const svc = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    return;
  } catch (e) {
    // fallthrough
  }

  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Failed to initialize Firebase Admin SDK:', e.message || e);
    process.exit(1);
  }
}

async function recreate(email, password) {
  try {
    init();
    // delete if exists
    try {
      const u = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(u.uid);
      console.log('Deleted existing demo user', email, u.uid);
    } catch (e) {
      if (e.code === 'auth/user-not-found' || /not found/i.test(String(e.message))) {
        console.log('Demo user not found, will create new one');
      } else {
        console.warn('Error checking/deleting existing user:', e.message || e);
      }
    }

    const user = await admin.auth().createUser({ email, password });
    console.log('Created demo user', user.uid, email);
    // optional: add a user doc
    try {
      const db = admin.firestore();
      await db.collection('users').doc(user.uid).set({ email, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('Created user document in Firestore');
    } catch (e) {
      console.warn('Failed to write user doc:', e.message || e);
    }
  } catch (e) {
    console.error('Failed to recreate demo user:', e.message || e);
    process.exitCode = 1;
  }
}

(async () => {
  await recreate('demo@dsa-verse.test', 'password123');
})();
