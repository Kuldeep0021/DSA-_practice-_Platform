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

async function createAdmin(email, password) {
  try {
    init();

    // delete if exists
    try {
      const existing = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(existing.uid);
      console.log('Deleted existing user', email);
    } catch (e) {
      // ignore not found
    }

    const user = await admin.auth().createUser({ email, password });
    console.log('Created admin user', user.uid, email);

    // set custom claims
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('Set custom claim {admin: true} for', email);

    // create or update user doc
    try {
      const db = admin.firestore();
      await db.collection('users').doc(user.uid).set({ email, role: 'admin', createdAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('Created/updated user doc in Firestore');
    } catch (e) {
      console.warn('Failed to write user doc:', e.message || e);
    }

  } catch (e) {
    console.error('Failed to create admin user:', e.message || e);
    process.exitCode = 1;
  }
}

(async () => {
  // change these if you'd like different admin credentials
  const adminEmail = 'admin@dsa-verse.test';
  const adminPassword = 'adminpassword';
  await createAdmin(adminEmail, adminPassword);
})();
