const admin = require('firebase-admin');
const path = require('path');

function init() {
  // Prefer env var FIREBASE_SERVICE_ACCOUNT (stringified JSON)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(svc) });
      return;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT is set but invalid JSON', e);
    }
  }

  // Fallback to service-account.json in repo root
  const saPath = path.join(process.cwd(), 'service-account.json');
  try {
    const svc = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    return;
  } catch (e) {
    console.error('Failed to load service-account.json from project root:', e.message || e);
  }

  // Last resort: try ADC
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Failed to initialize Firebase Admin SDK:', e);
    process.exit(1);
  }
}

async function deleteDemoUser(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    console.log('Deleted demo user:', email, user.uid);
  } catch (e) {
    if (e.code === 'auth/user-not-found' || /not found/i.test(String(e.message))) {
      console.log('Demo user not found, skipping delete');
    } else {
      console.warn('Error deleting demo user:', e.message || e);
    }
  }
}

async function clearCollection(collectionName) {
  const db = admin.firestore();
  const col = db.collection(collectionName);
  const docs = await col.listDocuments();
  if (docs.length === 0) {
    console.log(collectionName, 'is already empty');
    return;
  }
  console.log('Deleting', docs.length, 'documents from', collectionName);
  for (const d of docs) {
    try {
      await d.delete();
    } catch (e) {
      console.warn('Failed to delete', d.path, e.message || e);
    }
  }
}

async function seedProblems() {
  const db = admin.firestore();
  const problemsRef = db.collection('problems');
  const samples = [
    {
      title: 'Two Sum',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      difficulty: 'Easy',
      tags: ['array', 'hashmap'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      title: 'Reverse String',
      description: 'Write a function that reverses a string.',
      difficulty: 'Easy',
      tags: ['string'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      title: 'Palindrome Number',
      description: 'Given an integer x, return true if x is a palindrome.',
      difficulty: 'Easy',
      tags: ['math'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      title: 'Merge Two Sorted Lists',
      description: 'Merge two sorted linked lists and return it as a sorted list.',
      difficulty: 'Easy',
      tags: ['linked-list'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  for (const s of samples) {
    await problemsRef.add(s);
  }
  console.log('Seeded', samples.length, 'problems');
}

(async () => {
  init();
  await deleteDemoUser('demo@dsa-verse.test');
  await clearCollection('problems');
  await seedProblems();
  console.log('Force reseed complete');
  process.exit(0);
})();
