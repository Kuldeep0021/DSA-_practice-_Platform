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

const NEON_CYAN = "#22d3ee";

const DIFFICULTY_THEME: Record<
  Difficulty,
  { color: string; bg: string; border: string }
> = {
  Easy: {
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.45)",
  },
  Medium: {
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.45)",
  },
  Hard: {
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.45)",
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

function DifficultyDoughnutChart({
  difficultySolved,
  loading,
}: {
  difficultySolved: Record<Difficulty, number>;
  loading: boolean;
}) {
  const chartData = (["Easy", "Medium", "Hard"] as Difficulty[]).map((difficulty) => ({
    difficulty,
    value: difficultySolved[difficulty],
    color: DIFFICULTY_THEME[difficulty].color,
  }));

  const totalSolved = chartData.reduce((sum, item) => sum + item.value, 0);
  const size = 190;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  const segments = chartData.map((item) => {
    const ratio = totalSolved > 0 ? item.value / totalSolved : 0;
    const dashLength = ratio * circumference;
    const segment = {
      ...item,
      dashLength,
      dashOffset: -accumulated,
    };
    accumulated += dashLength;
    return segment;
  });

  return (
    <div className="w-full">
      <div className="relative mx-auto w-[190px] h-[190px]">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(34, 211, 238, 0.22)"
              strokeWidth={strokeWidth}
            />

            {segments.map((segment) =>
              segment.dashLength > 0 ? (
                <circle
                  key={segment.difficulty}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segment.dashLength} ${circumference - segment.dashLength}`}
                  strokeDashoffset={segment.dashOffset}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 7px ${segment.color})`,
                  }}
                />
              ) : null
            )}
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <p
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "rgba(34, 211, 238, 0.86)" }}
          >
            Solved Mix
          </p>
          <p className="text-3xl font-bold" style={{ color: NEON_CYAN }}>
            {loading ? "--" : totalSolved}
          </p>
          <p className="text-xs text-slate-400">Accepted</p>
        </div>
      </div>
    </div>
  );
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
                <DifficultyDoughnutChart
                  difficultySolved={stats.difficultySolved}
                  loading={statsLoading}
                />
                <div className="flex flex-col space-y-2 mt-4">
                  {(["Easy", "Medium", "Hard"] as Difficulty[]).map((difficulty) => {
                    const theme = DIFFICULTY_THEME[difficulty];
                    return (
                      <div
                        key={difficulty}
                        className="px-3 py-1.5 text-sm font-semibold rounded-lg flex justify-between items-center"
                        style={{
                          backgroundColor: theme.bg,
                          border: `1px solid ${theme.border}`,
                          boxShadow: `0 0 12px ${theme.color}22`,
                        }}
                      >
                        <span style={{ color: theme.color }}>{difficulty}</span>
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
