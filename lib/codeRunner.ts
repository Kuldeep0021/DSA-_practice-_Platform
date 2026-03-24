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
  if (language === "java") return "java";
  if (language === "cpp") return "cpp";
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

function makeJavaWrapper(code: string, input: unknown[]): string {
  const encodedInput = Buffer.from(JSON.stringify(input), "utf8").toString("base64");
  return `
import java.util.*;
import java.io.*;
import org.json.JSONArray;
import org.json.JSONObject;

${code}

class Main {
    public static void main(String[] args) {
        try {
            byte[] decodedBytes = Base64.getDecoder().decode("${encodedInput}");
            String decodedString = new String(decodedBytes);
            JSONArray inputs = new JSONArray(decodedString);
            
            Solution sol = new Solution();
            // This is a simplified way to pass arguments.
            // It might need adjustments based on the problem's specific input types.
            Object[] argsArray = new Object[inputs.length()];
            for (int i = 0; i < inputs.length(); i++) {
                argsArray[i] = inputs.get(i);
            }

            Object result = sol.solution(argsArray);

            System.out.println(new JSONObject().put("result", result).toString());
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}`;
}

function makeCppWrapper(code: string, input: unknown[]): string {
    const encodedInput = Buffer.from(JSON.stringify(input), "utf8").toString("base64");
    // Using nlohmann/json for C++ JSON parsing, assuming it's available in Piston.
    return `
#include <iostream>
#include <vector>
#include <string>
#include "nlohmann/json.hpp"

// Base64 decoding function
std::string base64_decode(const std::string &in) {
    std::string out;
    std::vector<int> T(256,-1);
    for (int i=0; i<64; i++) T["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[i]] = i;

    int val=0, valb=-8;
    for (char c : in) {
        if (T[c] == -1) break;
        val = (val << 6) + T[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back(char((val>>valb)&0xFF));
            valb -= 8;
        }
    }
    return out;
}

${code}

int main() {
    std::string encoded_input = "${encodedInput}";
    std::string decoded_input = base64_decode(encoded_input);
    
    try {
        nlohmann::json input_json = nlohmann::json::parse(decoded_input);
        // solution() function needs to be able to handle nlohmann::json
        // This is a simplification. The user might need to adapt their solution signature.
        solution(input_json);
    } catch (const std::exception& e) {
        std::cerr << e.what() << std::endl;
        return 1;
    }
    return 0;
}`;
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
    const parsedJson = JSON.parse(candidate) as unknown;
    if(isRecord(parsedJson) && 'result' in parsedJson) {
        return { parsed: parsedJson.result };
    }
    return { parsed: parsedJson };
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
  let source = '';
  let pistonLanguage = '';

  switch (language) {
    case "javascript":
      source = makeJavascriptWrapper(code, input);
      pistonLanguage = 'javascript';
      break;
    case "python":
      source = makePythonWrapper(code, input);
      pistonLanguage = 'python';
      break;
    case "java":
      source = makeJavaWrapper(code, input);
      pistonLanguage = 'java';
      break;
    case "cpp":
      source = makeCppWrapper(code, input);
      pistonLanguage = 'cpp';
      break;
  }

  const payload = {
    language: pistonLanguage,
    version: "10.2.0", // for cpp, can be adapted for others
    files: [{ content: source }],
  };
  
  if (language === 'java') {
      payload.version = '15.0.2';
  } else if (language === 'python') {
      payload.version = '3.10.0';
  } else if (language === 'javascript') {
      payload.version = '18.15.0';
  }


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
