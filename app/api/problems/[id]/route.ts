import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { mapProblemDocument } from "@/lib/problemMapper";
import { getErrorMessage } from "@/src/utils/errors";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

async function getRouteParams(context: RouteContext): Promise<{ id: string }> {
  if (context.params instanceof Promise) {
    return context.params;
  }
  return context.params;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await getRouteParams(context);
    const problemId = id.trim();

    if (!problemId) {
      return NextResponse.json({ error: "Problem id is required." }, { status: 400 });
    }

    const db = getFirestore();
    const docSnap = await db.collection("problems").doc(problemId).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Problem not found." }, { status: 404 });
    }

    const problem = mapProblemDocument(
      docSnap.id,
      docSnap.data() as Record<string, unknown>
    );

    return NextResponse.json({ problem });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch problem.") },
      { status: 500 }
    );
  }
}
