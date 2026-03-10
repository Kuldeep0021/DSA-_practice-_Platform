import { NextResponse } from "next/server";
import { assertSupportedLanguage, runCodeAgainstTestCases } from "@/lib/codeRunner";
import { getAdmin, getFirestore } from "@/lib/firebaseAdmin";
import { mapProblemDocument } from "@/lib/problemMapper";
import { authenticateRequest, RequestAuthError } from "@/lib/serverAuth";
import type { RunResult, SubmissionStatus, TestCase } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function deriveSubmissionStatus(result: {
  passedAll: boolean;
  results: Array<{ error?: string }>;
}): SubmissionStatus {
  if (result.passedAll) return "accepted";
  if (result.results.some((item) => typeof item.error === "string" && item.error.length > 0)) {
    return "runtime_error";
  }
  return "wrong_answer";
}

function buildExecutionFailureResult(
  testCases: TestCase[],
  message: string
): RunResult {
  return {
    passedAll: false,
    results: testCases.map((testCase) => ({
      input: testCase.input,
      expected: testCase.output,
      actual: null,
      passed: false,
      stdout: "",
      stderr: message,
      error: message,
    })),
  };
}

export async function POST(request: Request) {
  try {
    const user = await authenticateRequest(request);

    const rawBody = (await request.json()) as unknown;
    if (!isRecord(rawBody)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const problemId = typeof rawBody.problemId === "string" ? rawBody.problemId.trim() : "";
    const languageRaw = typeof rawBody.language === "string" ? rawBody.language : "";
    const code = typeof rawBody.code === "string" ? rawBody.code.trim() : "";

    if (!problemId || !languageRaw || !code) {
      return NextResponse.json(
        { error: "problemId, language and code are required." },
        { status: 400 }
      );
    }

    const language = assertSupportedLanguage(languageRaw);

    const db = getFirestore();
    const problemDoc = await db.collection("problems").doc(problemId).get();
    if (!problemDoc.exists) {
      return NextResponse.json({ error: "Problem not found." }, { status: 404 });
    }

    const problem = mapProblemDocument(
      problemDoc.id,
      problemDoc.data() as Record<string, unknown>
    );

    if (problem.testCases.length === 0) {
      return NextResponse.json(
        { error: "Problem does not have test cases configured yet." },
        { status: 400 }
      );
    }

    let runResult: RunResult;
    try {
      runResult = await runCodeAgainstTestCases(language, code, problem.testCases);
    } catch (executionError: unknown) {
      const message = getErrorMessage(executionError, "Code execution failed.");
      runResult = buildExecutionFailureResult(problem.testCases, message);
    }

    const status = deriveSubmissionStatus(runResult);

    const admin = getAdmin();
    const submissionRef = await db.collection("submissions").add({
      userId: user.uid,
      userEmail: user.email,
      problemId,
      problemTitle: problem.title,
      language,
      code,
      status,
      result: runResult,
      type: "submit",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      submissionId: submissionRef.id,
      status,
      result: runResult,
    });
  } catch (error: unknown) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to submit solution.") },
      { status: 500 }
    );
  }
}
