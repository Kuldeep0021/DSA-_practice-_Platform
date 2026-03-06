import { NextResponse } from "next/server";
import { getFirestore, getAdmin } from '../../../lib/firebaseAdmin';

export async function GET() {
  try {
    const db = getFirestore();

    const snapshot = await db.collection("problems").get();

    const problems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(problems);
  } catch (error: any) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}