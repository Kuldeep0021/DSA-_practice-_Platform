export type Difficulty = "Easy" | "Medium" | "Hard";

export type SupportedLanguage = "javascript" | "python";

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: unknown[];
  output: unknown;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  examples: ProblemExample[];
  constraints: string[];
  starterCode: Partial<Record<SupportedLanguage, string>>;
  testCases: TestCase[];
  createdAt?: unknown;
}

export interface RunCaseResult {
  input: unknown[];
  expected: unknown;
  actual: unknown;
  passed: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface RunResult {
  passedAll: boolean;
  results: RunCaseResult[];
}

export type SubmissionStatus = "accepted" | "wrong_answer" | "runtime_error";

export interface Submission {
  id: string;
  userId: string;
  userEmail: string | null;
  problemId: string;
  language: SupportedLanguage;
  code: string;
  status: SubmissionStatus;
  result: RunResult;
  createdAt?: unknown;
}
