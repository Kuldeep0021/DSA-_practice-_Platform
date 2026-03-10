import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { authenticateRequest, RequestAuthError } from "@/lib/serverAuth";
import type { RunCaseResult, RunResult } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toMillis(value: unknown): number {
  if (isRecord(value) && typeof value.toMillis === "function") {
    return value.toMillis() as number;
  }
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseCaseResult(value: unknown): RunCaseResult | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.input) || typeof value.passed !== "boolean") {
    return null;
  }

  return {
    input: value.input,
    expected: value.expected,
    actual: value.actual,
    passed: value.passed,
    stdout: typeof value.stdout === "string" ? value.stdout : "",
    stderr: typeof value.stderr === "string" ? value.stderr : "",
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

function parseRunResult(value: unknown): RunResult {
  if (!isRecord(value) || typeof value.passedAll !== "boolean" || !Array.isArray(value.results)) {
    return { passedAll: false, results: [] };
  }

  const parsedResults = value.results
    .map((item) => parseCaseResult(item))
    .filter((item): item is RunCaseResult => item !== null);

  return {
    passedAll: value.passedAll,
    results: parsedResults,
  };
}

export async function GET(request: Request) {
  try {
    const user = await authenticateRequest(request);
    const db = getFirestore();

    const byUserIdSnapshot = await db
      .collection("submissions")
      .where("userId", "==", user.uid)
      .get();

    const byEmailSnapshot =
      user.email !== null
        ? await db
            .collection("submissions")
            .where("userEmail", "==", user.email)
            .get()
        : null;

    const mergedDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const submissionDoc of byUserIdSnapshot.docs) {
      mergedDocs.set(submissionDoc.id, submissionDoc);
    }
    if (byEmailSnapshot) {
      for (const submissionDoc of byEmailSnapshot.docs) {
        mergedDocs.set(submissionDoc.id, submissionDoc);
      }
    }

    const submissions = Array.from(mergedDocs.values())
      .map((submissionDoc) => {
        const data = submissionDoc.data() as Record<string, unknown>;
        return {
          id: submissionDoc.id,
          userId: typeof data.userId === "string" ? data.userId : user.uid,
          userEmail: typeof data.userEmail === "string" ? data.userEmail : user.email,
          problemId: typeof data.problemId === "string" ? data.problemId : "",
          language:
            data.language === "python" || data.language === "javascript"
              ? data.language
              : "javascript",
          code: typeof data.code === "string" ? data.code : "",
          status:
            data.status === "accepted" ||
            data.status === "wrong_answer" ||
            data.status === "runtime_error"
              ? data.status
              : "wrong_answer",
          result: parseRunResult(data.result),
          createdAt: data.createdAt,
          problemTitle: typeof data.problemTitle === "string" ? data.problemTitle : "",
        };
      })
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    return NextResponse.json({ submissions });
  } catch (error: unknown) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load submissions.") },
      { status: 500 }
    );
  }
}
