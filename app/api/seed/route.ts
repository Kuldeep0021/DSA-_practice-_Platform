import { NextResponse } from "next/server";
import { getAdmin, getFirestore } from "@/lib/firebaseAdmin";
import { SAMPLE_PROBLEMS } from "@/lib/problemSamples";
import { getErrorMessage } from "@/src/utils/errors";

export async function POST() {
  try {
    const admin = getAdmin();
    const db = getFirestore();
    const problemsRef = db.collection("problems");
    const existing = await problemsRef.get();
    const existingTitles = new Set(
      existing.docs
        .map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return typeof data.title === "string" ? data.title.trim().toLowerCase() : "";
        })
        .filter((title) => title.length > 0)
    );

    let created = 0;
    let skipped = 0;

    for (const sample of SAMPLE_PROBLEMS) {
      const titleKey = sample.title.trim().toLowerCase();
      if (existingTitles.has(titleKey)) {
        skipped += 1;
        continue;
      }

      await problemsRef.add({
        ...sample,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created += 1;
      existingTitles.add(titleKey);
    }

    return NextResponse.json({
      ok: true,
      message: "Seed completed.",
      created,
      skipped,
      totalSamples: SAMPLE_PROBLEMS.length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error, "Failed to seed problems.") },
      { status: 500 }
    );
  }
}
