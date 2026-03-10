import type {
  Difficulty,
  Problem,
  ProblemExample,
  SupportedLanguage,
  TestCase,
} from "@/src/types/domain";
import { SAMPLE_PROBLEMS } from "@/lib/problemSamples";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["javascript", "python"];
const SAMPLE_TEST_CASES_BY_TITLE = new Map(
  SAMPLE_PROBLEMS.map((problem) => [problem.title.toLowerCase(), problem.testCases])
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseExamples(value: unknown): ProblemExample[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => ({
      input: toString(item.input),
      output: toString(item.output),
      explanation: toString(item.explanation),
    }))
    .filter((item) => item.input.length > 0 || item.output.length > 0);
}

function parseStarterCode(
  value: unknown
): Partial<Record<SupportedLanguage, string>> {
  if (!isRecord(value)) return {};

  const starter: Partial<Record<SupportedLanguage, string>> = {};
  for (const language of SUPPORTED_LANGUAGES) {
    const raw = value[language];
    if (typeof raw === "string" && raw.length > 0) {
      starter[language] = raw;
    }
  }

  return starter;
}

export function parseTestCases(value: unknown): TestCase[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => {
      const input = Array.isArray(item.input) ? item.input : [];
      return {
        input,
        output: item.output,
      };
    })
    .filter((item) => item.input.length > 0 || item.output !== undefined);
}

function parseDifficulty(value: unknown): Difficulty {
  if (typeof value === "string" && DIFFICULTIES.includes(value as Difficulty)) {
    return value as Difficulty;
  }
  return "Easy";
}

function parseTestCasesFromDocument(doc: Record<string, unknown>): TestCase[] {
  const direct = parseTestCases(doc.testCases);
  if (direct.length > 0) return direct;

  if (typeof doc.testCasesJson === "string") {
    try {
      const parsed = JSON.parse(doc.testCasesJson) as unknown;
      return parseTestCases(parsed);
    } catch {
      // Continue to fallback test cases for legacy seeded problems.
    }
  }

  const title = typeof doc.title === "string" ? doc.title.trim().toLowerCase() : "";
  const fallback = SAMPLE_TEST_CASES_BY_TITLE.get(title);
  if (fallback) {
    return fallback.map((testCase) => ({
      input: [...testCase.input],
      output: testCase.output,
    }));
  }

  return [];
}

export function mapProblemDocument(
  id: string,
  data: Record<string, unknown>
): Problem {
  return {
    id,
    title: toString(data.title, "Untitled Problem"),
    description: toString(data.description, "No description available."),
    difficulty: parseDifficulty(data.difficulty),
    tags: toStringArray(data.tags),
    examples: parseExamples(data.examples),
    constraints: toStringArray(data.constraints),
    starterCode: parseStarterCode(data.starterCode),
    testCases: parseTestCasesFromDocument(data),
    createdAt: data.createdAt,
  };
}

export function toProblemListItem(problem: Problem): Omit<Problem, "testCases"> {
  return {
    id: problem.id,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    tags: problem.tags,
    examples: problem.examples,
    constraints: problem.constraints,
    starterCode: problem.starterCode,
    createdAt: problem.createdAt,
  };
}
