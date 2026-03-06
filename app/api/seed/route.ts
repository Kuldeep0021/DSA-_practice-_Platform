import { NextResponse } from 'next/server';

// This route uses the Firebase Admin SDK to seed Firestore from the server-side.
// Provide a service account JSON via the FIREBASE_SERVICE_ACCOUNT environment
// variable (stringified JSON) or set GOOGLE_APPLICATION_CREDENTIALS to a path.

import { getFirestore, getAdmin } from '../../../lib/firebaseAdmin';

export async function POST() {
  try {
    const app = getAdmin();
    const db = getFirestore();

    const problemsRef = db.collection('problems');
    const existing = await problemsRef.limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ ok: false, message: 'Collection already has documents.' }, { status: 409 });
    }

    const samples = [
      {
        title: 'Two Sum',
        description:
          'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        difficulty: 'Easy',
        tags: ['array', 'hashmap'],
        createdAt: app.firestore.FieldValue.serverTimestamp(),
      },
      {
        title: 'Reverse String',
        description: 'Write a function that reverses a string.',
        difficulty: 'Easy',
        tags: ['string'],
        createdAt: app.firestore.FieldValue.serverTimestamp(),
      },
      {
        title: 'Palindrome Number',
        description: 'Given an integer x, return true if x is a palindrome.',
        difficulty: 'Easy',
        tags: ['math'],
        createdAt: app.firestore.FieldValue.serverTimestamp(),
      },
      {
        title: 'Merge Two Sorted Lists',
        description: 'Merge two sorted linked lists and return it as a sorted list.',
        difficulty: 'Easy',
        tags: ['linked-list'],
        createdAt: app.firestore.FieldValue.serverTimestamp(),
      },
    ];

    for (const s of samples) {
      await problemsRef.add(s);
    }

    return NextResponse.json({ ok: true, message: 'Seeded problems.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || String(err) }, { status: 500 });
  }
}
