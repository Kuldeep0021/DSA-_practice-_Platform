"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/src/firebase/firebase";
import Navbar from "@/src/components/Navbar";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import MonacoCodeEditor, { type MonacoLanguage } from "@/src/components/MonacoCodeEditor";
import DifficultyBadge from "@/src/components/ui/DifficultyBadge";
import StatusBadge from "@/src/components/ui/StatusBadge";
import SurfaceCard from "@/src/components/ui/SurfaceCard";
import type {
  Problem,
  RunResult,
  SubmissionStatus,
  SupportedLanguage,
} from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";

const DEFAULT_STARTER_CODE: Record<SupportedLanguage, string> = {
  javascript: `function solution(...args) {
  // Write your solution here.
  return null;
}`,
  python: `def solution(*args):
    # Write your solution here.
    return None`,
};

const LANGUAGE_OPTIONS: Array<{ value: SupportedLanguage; label: string }> = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRunResult(value: unknown): value is RunResult {
  if (!isRecord(value)) return false;
  return typeof value.passedAll === "boolean" && Array.isArray(value.results);
}

function getProblemIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params.id;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw[0];
  return "";
}

function getLanguageStorageKey(problemId: string): string {
  return `editor_language_${problemId}`;
}

function getCodeStorageKey(problemId: string, language: SupportedLanguage): string {
  return `editor_code_${problemId}_${language}`;
}

interface SubmitResponse {
  ok?: boolean;
  submissionId?: string;
  status?: SubmissionStatus;
  result?: RunResult;
  error?: string;
}

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = getProblemIdFromParams(params);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingProblem, setLoadingProblem] = useState(true);
  const [problemError, setProblemError] = useState<string | null>(null);

  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [code, setCode] = useState(DEFAULT_STARTER_CODE.javascript);

  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmissionStatus | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadProblem = async () => {
      if (!problemId) {
        setLoadingProblem(false);
        setProblemError("Invalid problem id.");
        return;
      }

      setLoadingProblem(true);
      setProblemError(null);

      try {
        const response = await fetch(`/api/problems/${problemId}`);
        const payload = (await response.json().catch(() => ({}))) as {
          problem?: Problem;
          error?: string;
        };

        if (!response.ok || !payload.problem) {
          throw new Error(payload.error || "Failed to load problem.");
        }

        setProblem(payload.problem);

        const savedLanguage = localStorage.getItem(getLanguageStorageKey(problemId));
        const selectedLanguage =
          savedLanguage === "python" || savedLanguage === "javascript"
            ? savedLanguage
            : "javascript";

        const savedCode = localStorage.getItem(
          getCodeStorageKey(problemId, selectedLanguage)
        );
        const starter =
          payload.problem.starterCode[selectedLanguage] ||
          DEFAULT_STARTER_CODE[selectedLanguage];

        setLanguage(selectedLanguage);
        setCode(savedCode || starter);
      } catch (err: unknown) {
        setProblemError(getErrorMessage(err, "Failed to load problem."));
      } finally {
        setLoadingProblem(false);
      }
    };

    loadProblem();
  }, [problemId]);

  useEffect(() => {
    if (!problemId) return;
    localStorage.setItem(getLanguageStorageKey(problemId), language);
  }, [problemId, language]);

  useEffect(() => {
    if (!problemId) return;
    localStorage.setItem(getCodeStorageKey(problemId, language), code);
  }, [problemId, language, code]);

  const handleLanguageChange = (nextLanguage: SupportedLanguage) => {
    setLanguage(nextLanguage);
    if (!problem) {
      setCode(DEFAULT_STARTER_CODE[nextLanguage]);
      return;
    }

    const saved = localStorage.getItem(getCodeStorageKey(problem.id, nextLanguage));
    const starter = problem.starterCode[nextLanguage] || DEFAULT_STARTER_CODE[nextLanguage];
    setCode(saved || starter);
  };

  const handleRun = async () => {
    if (!problem) return;

    setRunError(null);
    setSubmitError(null);
    setSubmitMessage(null);
    setIsRunning(true);

    if (problem.testCases.length === 0) {
      setRunError("This problem does not have test cases yet.");
      setIsRunning(false);
      return;
    }

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          testCases: problem.testCases,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        passedAll?: boolean;
        results?: unknown[];
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to run code.");
      }

      if (!isRunResult(payload)) {
        throw new Error("Invalid run response from server.");
      }

      setRunResult(payload);
    } catch (err: unknown) {
      setRunError(getErrorMessage(err, "Failed to run code."));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem) return;

    setSubmitError(null);
    setSubmitMessage(null);
    setIsSubmitting(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      const token = await currentUser.getIdToken();
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          code,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as SubmitResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to submit solution.");
      }

      if (!payload.status) {
        throw new Error("Submission response did not include a status.");
      }

      setSubmitStatus(payload.status);
      setSubmitMessage(
        payload.status === "accepted"
          ? "Submission accepted."
          : "Submission saved with failed test cases."
      );

      if (payload.result && isRunResult(payload.result)) {
        setRunResult(payload.result);
      }
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, "Failed to submit solution."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProblem) {
    return (
      <ProtectedRoute>
        <>
          <Navbar />
          <div className="min-h-screen bg-[#0f1117] text-slate-100 p-8">Loading problem...</div>
        </>
      </ProtectedRoute>
    );
  }

  if (!problem || problemError) {
    return (
      <ProtectedRoute>
        <>
          <Navbar />
          <div className="min-h-screen bg-[#0f1117] text-slate-100 p-8">
            <p className="text-rose-300 mb-4">{problemError || "Problem not found."}</p>
            <Link
              href="/problems"
              className="inline-flex rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-900"
            >
              Back to Problems
            </Link>
          </div>
        </>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <div className="min-h-screen bg-[#0f1117] text-slate-100 px-4 py-8 md:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <SurfaceCard className="p-5 md:p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Problem
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold">{problem.title}</h1>
                  <p className="text-slate-300 leading-relaxed">{problem.description}</p>
                </div>

                {problem.examples.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-100">Examples</h2>
                    {problem.examples.map((example, index) => (
                      <div
                        key={`${example.input}-${index}`}
                        className="rounded-lg border border-slate-700 bg-[#131822] p-4"
                      >
                        <p className="text-sm text-slate-200">
                          <span className="font-semibold text-slate-100">Input:</span>{" "}
                          {example.input}
                        </p>
                        <p className="text-sm text-slate-200 mt-1">
                          <span className="font-semibold text-slate-100">Output:</span>{" "}
                          {example.output}
                        </p>
                        {example.explanation && (
                          <p className="text-sm text-slate-400 mt-2">{example.explanation}</p>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {problem.constraints.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-100">Constraints</h2>
                    <ul className="space-y-1.5 text-sm text-slate-300">
                      {problem.constraints.map((constraint) => (
                        <li key={constraint} className="flex gap-2">
                          <span className="text-slate-500">-</span>
                          <span>{constraint}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </SurfaceCard>

              <div className="space-y-4 xl:sticky xl:top-6 h-fit">
                <SurfaceCard className="p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Editor</p>
                      <p className="text-sm text-slate-300">Language and actions</p>
                    </div>
                    <select
                      value={language}
                      onChange={(event) => handleLanguageChange(event.target.value as SupportedLanguage)}
                      className="rounded-lg border border-slate-700 bg-[#11151d] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400/80"
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <MonacoCodeEditor
                    value={code}
                    language={language as MonacoLanguage}
                    onChange={setCode}
                    height={390}
                  />

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleRun();
                      }}
                      disabled={isRunning}
                      className="rounded-lg border border-slate-700 bg-[#1b2330] px-4 py-2 text-sm font-medium text-slate-200 hover:bg-[#263247] disabled:opacity-60"
                    >
                      {isRunning ? "Running..." : "Run"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleSubmit();
                      }}
                      disabled={isSubmitting}
                      className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-70"
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </SurfaceCard>

                {(runError || submitError) && (
                  <SurfaceCard className="p-4">
                    {runError && <p className="text-sm text-rose-300">{runError}</p>}
                    {submitError && <p className="text-sm text-rose-300 mt-2">{submitError}</p>}
                  </SurfaceCard>
                )}

                {submitMessage && submitStatus && (
                  <SurfaceCard className="p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="font-medium text-slate-100">{submitMessage}</p>
                      <StatusBadge status={submitStatus} />
                    </div>
                    <Link
                      href="/submissions"
                      className="inline-flex mt-3 text-sm text-amber-300 hover:text-amber-200"
                    >
                      View submission history
                    </Link>
                  </SurfaceCard>
                )}
              </div>
            </div>

            {runResult && (
              <SurfaceCard className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <h2 className="text-lg font-semibold">Run Results</h2>
                  <StatusBadge status={runResult.passedAll ? "accepted" : "wrong_answer"} />
                </div>

                <div className="space-y-3">
                  {runResult.results.map((result, index) => (
                    <div
                      key={`case-${index}`}
                      className="rounded-lg border border-slate-700 bg-[#131822] p-4"
                    >
                      <p
                        className={`text-sm font-semibold ${
                          result.passed ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        Test Case {index + 1}: {result.passed ? "Passed" : "Failed"}
                      </p>
                      <div className="grid gap-1 text-sm text-slate-300 mt-2">
                        <p>Input: {JSON.stringify(result.input)}</p>
                        <p>Expected: {JSON.stringify(result.expected)}</p>
                        <p>Actual: {JSON.stringify(result.actual)}</p>
                      </div>
                      {result.error && (
                        <p className="mt-2 text-sm text-amber-300">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            )}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
