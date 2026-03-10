import { NextResponse } from "next/server";
import { getAdmin, getAuth, getFirestore } from "@/lib/firebaseAdmin";
import { getErrorMessage } from "@/src/utils/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  try {
    const admin = getAdmin();
    const body = (await request.json().catch(() => ({}))) as unknown;
    const payload = isRecord(body) ? body : {};

    const email =
      typeof payload.email === "string" && payload.email.trim().length > 0
        ? payload.email.trim()
        : "demo@dsa-verse.test";

    const password =
      typeof payload.password === "string" && payload.password.trim().length > 0
        ? payload.password
        : "password123";

    const userRecord = await getAuth().createUser({ email, password });

    const db = getFirestore();
    await db.collection("users").doc(userRecord.uid).set({
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, uid: userRecord.uid, email });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error, "Failed to create demo user.") },
      { status: 500 }
    );
  }
}
