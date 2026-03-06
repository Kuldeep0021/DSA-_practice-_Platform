import { NextResponse } from 'next/server';
import { getAuth, getFirestore, getAdmin } from '../../../lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const app = getAdmin();
    const body = await req.json().catch(() => ({}));
    const email = body.email || 'demo@dsa-verse.test';
    const password = body.password || 'password123';

    const userRecord = await getAuth().createUser({ email, password });

    const db = getFirestore();
    await db.collection('users').doc(userRecord.uid).set({ email, createdAt: app.firestore.FieldValue.serverTimestamp() });

    return NextResponse.json({ ok: true, uid: userRecord.uid, email });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || String(err) }, { status: 500 });
  }
}
