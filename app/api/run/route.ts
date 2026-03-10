import { NextResponse } from "next/server";
import { assertSupportedLanguage, runCodeAgainstTestCases } from "@/lib/codeRunner";
import { parseTestCases } from "@/lib/problemMapper";
import { getErrorMessage } from "@/src/utils/errors";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json()) as unknown;
    if (!isRecord(rawBody)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const languageValue = rawBody.language;
    const codeValue = rawBody.code;
    const testCasesValue = rawBody.testCases;

    if (typeof languageValue !== "string" || typeof codeValue !== "string") {
      return NextResponse.json(
        { error: "Both language and code are required." },
        { status: 400 }
      );
    }

    const language = assertSupportedLanguage(languageValue);
    const code = codeValue.trim();
    if (!code) {
      return NextResponse.json({ error: "Code cannot be empty." }, { status: 400 });
    }

    const testCases = parseTestCases(testCasesValue);
    if (testCases.length === 0) {
      return NextResponse.json(
        { error: "At least one test case is required to run code." },
        { status: 400 }
      );
    }

    const result = await runCodeAgainstTestCases(language, code, testCases);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to run code.") },
      { status: 500 }
    );
  }
}
