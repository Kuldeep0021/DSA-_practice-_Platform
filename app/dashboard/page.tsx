"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import Navbar from "@/src/components/Navbar";
import { auth } from "@/src/firebase/firebase";
import type { Difficulty, Submission } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";

interface SubmissionSummary {
  problemId: string;
  status: Submission["status"];
  createdAt?: unknown;
}

interface ProblemSummary {
  id: string;
  difficulty: Difficulty;
}

interface DashboardStats {
  totalSolved: number;
  totalProblems: number;
  dayStreak: number;
  difficultySolved: Record<Difficulty, number>;
}

const EMPTY_STATS: DashboardStats = {
  totalSolved: 0,
  totalProblems: 0,
  dayStreak: 0,
  difficultySolved: {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDifficulty(value: unknown): Difficulty | null {
  if (value === "Easy" || value === "Medium" || value === "Hard") {
    return value;
  }
  return null;
}

function toSubmissionStatus(value: unknown): Submission["status"] {
  if (value === "accepted" || value === "wrong_answer" || value === "runtime_error") {
    return value;
  }
  return "wrong_answer";
}

function parseSubmissionList(value: unknown): SubmissionSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => ({
      problemId: typeof item.problemId === "string" ? item.problemId : "",
      status: toSubmissionStatus(item.status),
      createdAt: item.createdAt,
    }));
}

function parseProblemList(value: unknown): ProblemSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      difficulty: normalizeDifficulty(item.difficulty),
    }))
    .filter(
      (item): item is { id: string; difficulty: Difficulty } =>
        item.id.length > 0 && item.difficulty !== null
    );
}

function toMillis(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (isRecord(value)) {
    const toMillisMethod = value.toMillis;
    if (typeof toMillisMethod === "function") {
      try {
        return Number(toMillisMethod.call(value));
      } catch {
        return 0;
      }
    }

    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds;
    if (typeof seconds === "number") {
      const nanos = typeof nanoseconds === "number" ? nanoseconds : 0;
      return seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
  }

  return 0;
}

function toLocalDayKey(timestampMillis: number): string {
  const date = new Date(timestampMillis);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateDayStreak(activeDayKeys: Set<string>): number {
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = toLocalDayKey(cursor.getTime());
    if (!activeDayKeys.has(key)) break;

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildDashboardStats(
  submissions: SubmissionSummary[],
  problems: ProblemSummary[]
): DashboardStats {
  const acceptedProblemIds = new Set<string>();
  const activeDayKeys = new Set<string>();

  for (const submission of submissions) {
    if (submission.status === "accepted" && submission.problemId.length > 0) {
      acceptedProblemIds.add(submission.problemId);
    }

    const timestampMillis = toMillis(submission.createdAt);
    if (timestampMillis > 0) {
      activeDayKeys.add(toLocalDayKey(timestampMillis));
    }
  }

  const difficultyByProblemId = new Map<string, Difficulty>();
  for (const problem of problems) {
    difficultyByProblemId.set(problem.id, problem.difficulty);
  }

  const difficultySolved: Record<Difficulty, number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };

  for (const problemId of acceptedProblemIds) {
    const difficulty = difficultyByProblemId.get(problemId);
    if (difficulty) {
      difficultySolved[difficulty] += 1;
    }
  }

  return {
    totalSolved: acceptedProblemIds.size,
    totalProblems: problems.length,
    dayStreak: calculateDayStreak(activeDayKeys),
    difficultySolved,
  };
}

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? user?.uid ?? null);
      setAuthReady(true);

      if (!user) {
        setStats(EMPTY_STATS);
        setStatsError(null);
        setStatsLoading(false);
        return;
      }

      void (async () => {
        setStatsLoading(true);
        setStatsError(null);

        try {
          const token = await user.getIdToken();
          const [submissionsResponse, problemsResponse] = await Promise.all([
            fetch("/api/submissions", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("/api/problems"),
          ]);

          const submissionsPayload = (await submissionsResponse
            .json()
            .catch(() => ({}))) as {
            submissions?: unknown;
            error?: string;
          };
          const problemsPayload = (await problemsResponse.json().catch(() => ({}))) as {
            problems?: unknown;
            error?: string;
          };

          if (!submissionsResponse.ok) {
            throw new Error(submissionsPayload.error || "Failed to load submissions.");
          }
          if (!problemsResponse.ok) {
            throw new Error(problemsPayload.error || "Failed to load problems.");
          }

          const parsedSubmissions = parseSubmissionList(submissionsPayload.submissions);
          const parsedProblems = parseProblemList(problemsPayload.problems);
          setStats(buildDashboardStats(parsedSubmissions, parsedProblems));
        } catch (error: unknown) {
          setStats(EMPTY_STATS);
          setStatsError(getErrorMessage(error, "Failed to load dashboard stats."));
        } finally {
          setStatsLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  const totalSolvedLabel = statsLoading
    ? "-- / --"
    : `${stats.totalSolved} / ${stats.totalProblems}`;
  const dayStreakLabel = statsLoading ? "--" : String(stats.dayStreak);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Checking authentication...
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white px-8 py-12">
          <h1 className="text-3xl font-bold mb-3">Welcome to DSA Verse</h1>
          <p className="text-gray-300 mb-8">Logged in as: {userEmail}</p>

          <div className="surface rounded-lg p-6 interactive-card mb-8 border border-gray-800 bg-gray-900/50">
            <div className="grid md:grid-cols-3 items-center gap-8">
              <div className="md:col-span-2">
                <h2 className="font-semibold text-xl mb-4">Progress Snapshot</h2>
                <div className="flex items-baseline space-x-8">
                  <div>
                    <p className="text-5xl font-bold">{totalSolvedLabel}</p>
                    <p className="text-sm text-gray-400">Total Solved</p>
                  </div>
                  <div>
                    <p className="text-4xl">Streak {dayStreakLabel}</p>
                    <p className="text-sm text-gray-400">Day Streak</p>
                  </div>
                </div>
                {statsError && <p className="mt-3 text-sm text-rose-300">{statsError}</p>}
              </div>

              <div className="mt-6 md:mt-0">
                <div className="flex flex-col space-y-2">
                  <div
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg flex justify-between items-center"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                  >
                    <span style={{ color: "#22c55e" }}>Easy</span>
                    <span className="text-gray-300">
                      {statsLoading ? "--" : stats.difficultySolved.Easy} Solved
                    </span>
                  </div>
                  <div
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg flex justify-between items-center"
                    style={{
                      backgroundColor: "rgba(234, 179, 8, 0.1)",
                      border: "1px solid rgba(234, 179, 8, 0.3)",
                    }}
                  >
                    <span style={{ color: "#eab308" }}>Medium</span>
                    <span className="text-gray-300">
                      {statsLoading ? "--" : stats.difficultySolved.Medium} Solved
                    </span>
                  </div>
                  <div
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg flex justify-between items-center"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                    }}
                  >
                    <span style={{ color: "#ef4444" }}>Hard</span>
                    <span className="text-gray-300">
                      {statsLoading ? "--" : stats.difficultySolved.Hard} Solved
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/problems" className="surface rounded p-4 interactive-card">
              <h2 className="font-semibold mb-2">Solve Problems</h2>
              <p className="text-sm muted">Browse the full problem list and start coding.</p>
            </Link>

            <Link href="/submissions" className="surface rounded p-4 interactive-card">
              <h2 className="font-semibold mb-2">Submission History</h2>
              <p className="text-sm muted">Review your accepted and failed submissions.</p>
            </Link>

            <Link href="/admin/problems" className="surface rounded p-4 interactive-card">
              <h2 className="font-semibold mb-2">Admin Problems</h2>
              <p className="text-sm muted">Create and manage problems if you are an admin.</p>
            </Link>
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
