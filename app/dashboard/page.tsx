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

const DIFFICULTY_STYLES: Record<
  Difficulty,
  { containerClassName: string; labelClassName: string }
> = {
  Easy: {
    containerClassName: "bg-emerald-500/10 border border-emerald-400/30",
    labelClassName: "text-emerald-400",
  },
  Medium: {
    containerClassName: "bg-amber-500/10 border border-amber-400/30",
    labelClassName: "text-amber-400",
  },
  Hard: {
    containerClassName: "bg-rose-500/10 border border-rose-400/30",
    labelClassName: "text-rose-400",
  },
};

interface DashboardQuickLink {
  href: string;
  title: string;
  description: string;
  requiresAdmin?: boolean;
}

const DASHBOARD_QUICK_LINKS: DashboardQuickLink[] = [
  {
    href: "/problems",
    title: "Solve Problems",
    description: "Browse the full problem list and start coding.",
  },
  {
    href: "/submissions",
    title: "Submission History",
    description: "Review your accepted and failed submissions.",
  },
  {
    href: "/admin/problems",
    title: "Admin Problems",
    description: "Create and manage problems if you are an admin.",
    requiresAdmin: true,
  },
];

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
    let isActive = true;
    let requestVersion = 0;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      requestVersion += 1;
      const currentRequestVersion = requestVersion;

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

          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }

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

          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }

          const parsedSubmissions = parseSubmissionList(submissionsPayload.submissions);
          const parsedProblems = parseProblemList(problemsPayload.problems);
          setStats(buildDashboardStats(parsedSubmissions, parsedProblems));
        } catch (error: unknown) {
          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }
          setStats(EMPTY_STATS);
          setStatsError(getErrorMessage(error, "Failed to load dashboard stats."));
        } finally {
          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }
          setStatsLoading(false);
        }
      })();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase();
  const normalizedUserEmail = (userEmail || "").trim().toLowerCase();
  const canAdmin = normalizedUserEmail.length > 0 && normalizedUserEmail === adminEmail;

  const visibleQuickLinks = DASHBOARD_QUICK_LINKS.filter(
    (link) => !link.requiresAdmin || canAdmin
  );

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
        <div className="min-h-screen bg-black text-white px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to DSA Verse</h1>
          <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 break-all">
            Logged in as: {userEmail}
          </p>

          <div className="surface rounded-xl p-5 sm:p-6 interactive-card mb-8 border border-gray-800 bg-gray-900/50">
            <div className="grid lg:grid-cols-3 items-center gap-6">
              <div className="lg:col-span-2">
                <h2 className="font-semibold text-xl mb-4">Progress Snapshot</h2>
                <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10">
                  <div>
                    <p className="text-4xl sm:text-5xl font-bold">{totalSolvedLabel}</p>
                    <p className="text-sm text-gray-400">Total Solved</p>
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl">Streak {dayStreakLabel}</p>
                    <p className="text-sm text-gray-400">Day Streak</p>
                  </div>
                </div>
                {statsError && (
                  <p className="mt-3 text-sm text-rose-300" role="status" aria-live="polite">
                    {statsError}
                  </p>
                )}
              </div>

              <div className="mt-2 lg:mt-0">
                <div className="flex flex-col space-y-2">
                  {(["Easy", "Medium", "Hard"] as Difficulty[]).map((difficulty) => {
                    const style = DIFFICULTY_STYLES[difficulty];
                    return (
                      <div
                        key={difficulty}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-lg flex justify-between items-center ${style.containerClassName}`}
                      >
                        <span className={style.labelClassName}>{difficulty}</span>
                        <span className="text-gray-300">
                          {statsLoading ? "--" : stats.difficultySolved[difficulty]} Solved
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleQuickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="surface rounded-lg p-4 sm:p-5 interactive-card"
              >
                <h2 className="font-semibold mb-2">{link.title}</h2>
                <p className="text-sm muted">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
