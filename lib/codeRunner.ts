import { isDeepStrictEqual } from "node:util";
import vm from "node:vm";
import type { RunCaseResult, RunResult, SupportedLanguage, TestCase } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";

const PISTON_URL = process.env.PISTON_URL ?? "https://emkc.org/api/v2/piston/execute";

interface RunnerOutput {
  stdout: string;
  stderr: string;
  parsed: unknown;
  parseError?: string;
  runnerError?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function normalizeLanguage(language: string): SupportedLanguage | null {
  if (language === "javascript") return "javascript";
  if (language === "python") return "python";
  return null;
}

function makeJavascriptWrapper(code: string, input: unknown[]): string {
  const inputLiteral = JSON.stringify(input);
  return [
    `const INPUT = ${inputLiteral};`,
    code,
    "try {",
    "  const fn = typeof solution === 'function' ? solution : null;",
    "  if (!fn) {",
    "    throw new Error('Define a function named solution');",
    "  }",
    "  const result = fn(...INPUT);",
    "  console.log(JSON.stringify(result));",
    "} catch (error) {",
    "  console.error(error && error.stack ? error.stack : String(error));",
    "  process.exit(1);",
    "}",
  ].join("\n");
}

function makePythonWrapper(code: string, input: unknown[]): string {
  const encodedInput = Buffer.from(JSON.stringify(input), "utf8").toString("base64");
  return [
    "import base64",
    "import json",
    "",
    `INPUT = json.loads(base64.b64decode("${encodedInput}").decode("utf-8"))`,
    code,
    "try:",
    "    result = solution(*INPUT)",
    "    print(json.dumps(result))",
    "except Exception as error:",
    "    import traceback",
    "    traceback.print_exc()",
    "    raise SystemExit(1)",
  ].join("\n");
}

function parseStdout(stdout: string): { parsed: unknown; parseError?: string } {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { parsed: null };
  }

  const candidate = lines[lines.length - 1];
  try {
    return { parsed: JSON.parse(candidate) as unknown };
  } catch {
    return { parsed: null, parseError: "Output is not valid JSON." };
  }
}

function runJavascriptLocally(code: string, input: unknown[]): RunnerOutput {
  const contextObject: { __input: unknown[]; __result: unknown } = {
    __input: input,
    __result: null,
  };
  const context = vm.createContext(contextObject);
  const source = [
    `"use strict";`,
    code,
    `if (typeof solution !== "function") {`,
    `  throw new Error("Define a function named solution");`,
    `}`,
    `const result = solution(...__input);`,
    `if (result && typeof result.then === "function") {`,
    `  throw new Error("Async solutions are not supported.");`,
    `}`,
    `__result = result;`,
  ].join("\n");

  try {
    const script = new vm.Script(source, { filename: "solution.js" });
    script.runInContext(context, { timeout: 2000 });
    return {
      stdout: JSON.stringify(contextObject.__result),
      stderr: "",
      parsed: contextObject.__result,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Local JavaScript execution failed.");
    return {
      stdout: "",
      stderr: message,
      parsed: null,
      runnerError: message,
    };
  }
}

async function executeSingle(
  language: SupportedLanguage,
  code: string,
  input: unknown[]
): Promise<RunnerOutput> {
  const source =
    language === "javascript"
      ? makeJavascriptWrapper(code, input)
      : makePythonWrapper(code, input);

  const payload = {
    language: language === "javascript" ? "javascript" : "python3",
    source,
  };

  try {
    const response = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      if (language === "javascript") {
        return runJavascriptLocally(code, input);
      }

      return {
        stdout: "",
        stderr: "",
        parsed: null,
        runnerError: `Runner error: ${response.status} ${response.statusText}`,
      };
    }

    const payloadBody = (await response.json()) as unknown;
    const root = isRecord(payloadBody) ? payloadBody : {};
    const run = isRecord(root.run) ? root.run : {};

    const stdout =
      readString(root, "stdout") || readString(root, "output") || readString(run, "stdout");
    const stderr = readString(root, "stderr") || readString(run, "stderr");
    const parsed = parseStdout(stdout);

    return {
      stdout,
      stderr,
      parsed: parsed.parsed,
      parseError: parsed.parseError,
    };
  } catch (error: unknown) {
    if (language === "javascript") {
      return runJavascriptLocally(code, input);
    }

    return {
      stdout: "",
      stderr: "",
      parsed: null,
      runnerError: `Remote runner unavailable: ${getErrorMessage(error, "Unknown error")}`,
    };
  }
}

export function assertSupportedLanguage(language: string): SupportedLanguage {
  const normalized = normalizeLanguage(language);
  if (!normalized) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return normalized;
}

export async function runCodeAgainstTestCases(
  language: SupportedLanguage,
  code: string,
  testCases: TestCase[]
): Promise<RunResult> {
  const results: RunCaseResult[] = [];

  for (const testCase of testCases) {
    const execution = await executeSingle(language, code, testCase.input);
    const runtimeError = execution.runnerError || (execution.stderr.trim() ? execution.stderr.trim() : undefined);
    const parseError = execution.parseError;

    const passed =
      !runtimeError &&
      !parseError &&
      isDeepStrictEqual(execution.parsed, testCase.output);

    results.push({
      input: testCase.input,
      expected: testCase.output,
      actual: execution.parsed,
      passed,
      stdout: execution.stdout,
      stderr: execution.stderr,
      error: runtimeError || parseError,
    });
  }

  return {
    passedAll: results.length > 0 && results.every((result) => result.passed),
    results,
  };
}
