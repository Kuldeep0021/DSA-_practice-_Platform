import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { mapProblemDocument, toProblemListItem } from "@/lib/problemMapper";
import { getErrorMessage } from "@/src/utils/errors";

export async function GET() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection("problems").get();

    const problems = snapshot.docs
      .map((problemDoc) =>
        toProblemListItem(
          mapProblemDocument(
            problemDoc.id,
            problemDoc.data() as Record<string, unknown>
          )
        )
      )
      .sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json({ problems });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch problems.") },
      { status: 500 }
    );
  }
}
