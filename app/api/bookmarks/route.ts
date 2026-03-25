import { NextResponse } from "next/server";
import { getAdmin, getFirestore } from "@/lib/firebaseAdmin";
import { authenticateRequest, RequestAuthError } from "@/lib/serverAuth";
import { getErrorMessage } from "@/src/utils/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toProblemId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toMillis(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (isRecord(value)) {
    const toMillisMethod = value.toMillis;
    if (typeof toMillisMethod === "function") {
      try {
        return Number(toMillisMethod.call(value));
      } catch {
        return 0;
      }
    }

    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds;
    if (typeof seconds === "number") {
      const nanos = typeof nanoseconds === "number" ? nanoseconds : 0;
      return seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
  }

  return 0;
}

export async function GET(request: Request) {
  try {
    const user = await authenticateRequest(request);
    const db = getFirestore();

    const snapshot = await db
      .collection("bookmarks")
      .where("userId", "==", user.uid)
      .get();

    const problemIds = snapshot.docs
      .map((bookmarkDoc) => {
        const data = bookmarkDoc.data() as Record<string, unknown>;
        return {
          problemId: toProblemId(data.problemId),
          createdAt: data.createdAt,
        };
      })
      .filter((bookmark) => bookmark.problemId.length > 0)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      .map((bookmark) => bookmark.problemId);

    return NextResponse.json({ problemIds });
  } catch (error: unknown) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load bookmarks.") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateRequest(request);
    const rawBody = (await request.json()) as unknown;

    if (!isRecord(rawBody)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const problemId = toProblemId(rawBody.problemId);
    if (!problemId) {
      return NextResponse.json({ error: "problemId is required." }, { status: 400 });
    }

    const db = getFirestore();
    const admin = getAdmin();
    const bookmarkId = `${user.uid}_${problemId}`;

    await db.collection("bookmarks").doc(bookmarkId).set(
      {
        userId: user.uid,
        userEmail: user.email,
        problemId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, problemId });
  } catch (error: unknown) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to save bookmark.") },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authenticateRequest(request);

    const url = new URL(request.url);
    let problemId = toProblemId(url.searchParams.get("problemId"));

    if (!problemId) {
      const rawBody = (await request.json().catch(() => null)) as unknown;
      if (isRecord(rawBody)) {
        problemId = toProblemId(rawBody.problemId);
      }
    }

    if (!problemId) {
      return NextResponse.json({ error: "problemId is required." }, { status: 400 });
    }

    const db = getFirestore();
    const bookmarkId = `${user.uid}_${problemId}`;
    await db.collection("bookmarks").doc(bookmarkId).delete();

    return NextResponse.json({ ok: true, problemId });
  } catch (error: unknown) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to remove bookmark.") },
      { status: 500 }
    );
  }
}
