"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import Navbar from "@/src/components/Navbar";
import { auth } from "@/src/firebase/firebase";
import type { Difficulty, Problem, Submission } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";
import DifficultyBadge from "@/src/components/ui/DifficultyBadge";
import SurfaceCard from "@/src/components/ui/SurfaceCard";
import ProblemProgressBadge, {
  type ProblemProgressStatus,
} from "@/src/components/ui/ProblemProgressBadge";

type ProblemListItem = Omit<Problem, "testCases">;
type DifficultyFilter = Difficulty | "";
type StatusFilter = ProblemProgressStatus | "";

interface SubmissionSummary {
  problemId: string;
  status: Submission["status"];
}

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

function toDifficultyFilter(value: string): DifficultyFilter {
  if (value === "Easy" || value === "Medium" || value === "Hard") {
    return value;
  }
  return "";
}

function toStatusFilter(value: string): StatusFilter {
  if (value === "solved" || value === "attempted" || value === "unseen") {
    return value;
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
    }))
    .filter((item) => item.problemId.length > 0);
}

function parseProblemIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function buildProblemStatusById(
  submissions: SubmissionSummary[]
): Record<string, ProblemProgressStatus> {
  const statusById: Record<string, ProblemProgressStatus> = {};

  for (const submission of submissions) {
    if (submission.status === "accepted") {
      statusById[submission.problemId] = "solved";
      continue;
    }

    if (!statusById[submission.problemId]) {
      statusById[submission.problemId] = "attempted";
    }
  }

  return statusById;
}

function getProblemStatus(
  problemId: string,
  statusById: Record<string, ProblemProgressStatus>
): ProblemProgressStatus {
  return statusById[problemId] ?? "unseen";
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queryText, setQueryText] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);

  const [problemStatusById, setProblemStatusById] = useState<
    Record<string, ProblemProgressStatus>
  >({});
  const [bookmarkedProblemIds, setBookmarkedProblemIds] = useState<Record<string, true>>({});
  const [bookmarkBusyById, setBookmarkBusyById] = useState<Record<string, true>>({});
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadProblems = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/problems");
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Failed to load problems.");
        }

        const payload = (await response.json()) as { problems?: ProblemListItem[] };
        if (!isActive) return;
        setProblems(Array.isArray(payload.problems) ? payload.problems : []);
      } catch (err: unknown) {
        if (!isActive) return;
        setError(getErrorMessage(err, "Failed to load problems."));
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    };

    void loadProblems();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    let requestVersion = 0;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      requestVersion += 1;
      const currentRequestVersion = requestVersion;

      if (!user) {
        setProblemStatusById({});
        setBookmarkedProblemIds({});
        setMetadataLoading(false);
        return;
      }

      void (async () => {
        setMetadataLoading(true);
        setActionError(null);

        try {
          const token = await user.getIdToken();

          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }

          const [submissionsResponse, bookmarksResponse] = await Promise.all([
            fetch("/api/submissions", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("/api/bookmarks", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const submissionsPayload = (await submissionsResponse
            .json()
            .catch(() => ({}))) as { submissions?: unknown; error?: string };
          const bookmarksPayload = (await bookmarksResponse
            .json()
            .catch(() => ({}))) as { problemIds?: unknown; error?: string };

          if (!submissionsResponse.ok) {
            throw new Error(submissionsPayload.error || "Failed to load progress status.");
          }
          if (!bookmarksResponse.ok) {
            throw new Error(bookmarksPayload.error || "Failed to load bookmarks.");
          }

          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }

          const submissions = parseSubmissionList(submissionsPayload.submissions);
          const parsedBookmarks = parseProblemIds(bookmarksPayload.problemIds);

          setProblemStatusById(buildProblemStatusById(submissions));
          setBookmarkedProblemIds(
            parsedBookmarks.reduce<Record<string, true>>((acc, problemId) => {
              acc[problemId] = true;
              return acc;
            }, {})
          );
        } catch (err: unknown) {
          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }
          setActionError(getErrorMessage(err, "Failed to load personalized problem data."));
        } finally {
          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }
          setMetadataLoading(false);
        }
      })();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const allTags = Array.from(
    new Set(problems.flatMap((problem) => problem.tags || []))
  ).sort((a, b) => a.localeCompare(b));

  const progressStats = useMemo(() => {
    return problems.reduce(
      (acc, problem) => {
        const status = getProblemStatus(problem.id, problemStatusById);
        acc[status] += 1;
        return acc;
      },
      { solved: 0, attempted: 0, unseen: 0 } as Record<ProblemProgressStatus, number>
    );
  }, [problems, problemStatusById]);

  const stats = problems.reduce(
    (acc, problem) => {
      acc.total += 1;
      acc[problem.difficulty] += 1;
      return acc;
    },
    {
      total: 0,
      Easy: 0,
      Medium: 0,
      Hard: 0,
    } as Record<"total" | "Easy" | "Medium" | "Hard", number>
  );

  const bookmarkedCount = Object.keys(bookmarkedProblemIds).length;

  const recommendations = useMemo(() => {
    if (problems.length === 0) return [] as Array<{ problem: ProblemListItem; reason: string }>;

    const solvedByDifficulty: Record<Difficulty, number> = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };
    const totalByDifficulty: Record<Difficulty, number> = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };
    const attemptedTagCounts = new Map<string, number>();

    for (const problem of problems) {
      const status = getProblemStatus(problem.id, problemStatusById);
      totalByDifficulty[problem.difficulty] += 1;

      if (status === "solved") {
        solvedByDifficulty[problem.difficulty] += 1;
      }

      if (status === "attempted") {
        for (const tag of problem.tags || []) {
          attemptedTagCounts.set(tag, (attemptedTagCounts.get(tag) || 0) + 1);
        }
      }
    }

    const weakDifficulty = (Object.keys(totalByDifficulty) as Difficulty[])
      .filter((difficulty) => totalByDifficulty[difficulty] > 0)
      .sort((a, b) => {
        const solveRateA = solvedByDifficulty[a] / totalByDifficulty[a];
        const solveRateB = solvedByDifficulty[b] / totalByDifficulty[b];
        if (solveRateA !== solveRateB) return solveRateA - solveRateB;
        return totalByDifficulty[b] - totalByDifficulty[a];
      })[0] || null;

    const weakTags = Array.from(attemptedTagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
    const weakTagSet = new Set(weakTags);

    return problems
      .filter((problem) => getProblemStatus(problem.id, problemStatusById) !== "solved")
      .map((problem) => {
        let score = 0;
        const reasons: string[] = [];
        const status = getProblemStatus(problem.id, problemStatusById);

        if (weakDifficulty && problem.difficulty === weakDifficulty) {
          score += 3;
          reasons.push(`${weakDifficulty} is your current focus`);
        }

        const matchingTags = (problem.tags || []).filter((tag) => weakTagSet.has(tag));
        if (matchingTags.length > 0) {
          score += matchingTags.length * 2;
          reasons.push(`Tag focus: ${matchingTags.slice(0, 2).join(", ")}`);
        }

        if (status === "unseen") {
          score += 1;
          reasons.push("Fresh unsolved problem");
        }

        return {
          problem,
          score,
          reason: reasons.join(" - ") || "Solid next practice pick",
        };
      })
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        const difficultyDelta =
          DIFFICULTY_RANK[a.problem.difficulty] - DIFFICULTY_RANK[b.problem.difficulty];
        if (difficultyDelta !== 0) return difficultyDelta;
        return a.problem.title.localeCompare(b.problem.title);
      })
      .slice(0, 3)
      .map(({ problem, reason }) => ({ problem, reason }));
  }, [problems, problemStatusById]);

  const normalizedQuery = queryText.trim().toLowerCase();
  const visibleProblems = problems.filter((problem) => {
    const title = problem.title.toLowerCase();
    const tags = (problem.tags || []).join(" ").toLowerCase();
    const progressStatus = getProblemStatus(problem.id, problemStatusById);

    if (normalizedQuery && !title.includes(normalizedQuery) && !tags.includes(normalizedQuery)) {
      return false;
    }

    if (difficultyFilter && problem.difficulty !== difficultyFilter) {
      return false;
    }

    if (statusFilter && progressStatus !== statusFilter) {
      return false;
    }

    if (selectedTag && !(problem.tags || []).includes(selectedTag)) {
      return false;
    }

    if (bookmarksOnly && !bookmarkedProblemIds[problem.id]) {
      return false;
    }

    return true;
  });

  const sortedProblems = [...visibleProblems].sort((a, b) => {
    const aOrder = DIFFICULTY_RANK[a.difficulty];
    const bOrder = DIFFICULTY_RANK[b.difficulty];
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.title.localeCompare(b.title);
  });

  const difficultySummaryCards: Array<{
    value: DifficultyFilter;
    label: "Total" | Difficulty;
    count: number;
    labelClassName: string;
  }> = [
    {
      value: "",
      label: "Total",
      count: stats.total,
      labelClassName: "text-slate-400",
    },
    {
      value: "Easy",
      label: "Easy",
      count: stats.Easy,
      labelClassName: "text-emerald-300",
    },
    {
      value: "Medium",
      label: "Medium",
      count: stats.Medium,
      labelClassName: "text-amber-300",
    },
    {
      value: "Hard",
      label: "Hard",
      count: stats.Hard,
      labelClassName: "text-rose-300",
    },
  ];

  const statusSummaryCards: Array<{
    value: StatusFilter;
    label: "All" | "Solved" | "Attempted" | "Unseen";
    count: number;
    className: string;
  }> = [
    {
      value: "",
      label: "All",
      count: stats.total,
      className: "text-slate-300",
    },
    {
      value: "solved",
      label: "Solved",
      count: progressStats.solved,
      className: "text-emerald-300",
    },
    {
      value: "attempted",
      label: "Attempted",
      count: progressStats.attempted,
      className: "text-amber-300",
    },
    {
      value: "unseen",
      label: "Unseen",
      count: progressStats.unseen,
      className: "text-slate-300",
    },
  ];

  const toggleBookmark = async (problemId: string) => {
    if (bookmarkBusyById[problemId]) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setActionError("Please sign in to manage bookmarks.");
      return;
    }

    setActionError(null);
    setBookmarkBusyById((current) => ({ ...current, [problemId]: true }));

    const currentlyBookmarked = Boolean(bookmarkedProblemIds[problemId]);

    try {
      const token = await currentUser.getIdToken();

      if (currentlyBookmarked) {
        const response = await fetch(
          `/api/bookmarks?problemId=${encodeURIComponent(problemId)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to remove bookmark.");
        }

        setBookmarkedProblemIds((current) => {
          const next = { ...current };
          delete next[problemId];
          return next;
        });
      } else {
        const response = await fetch("/api/bookmarks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ problemId }),
        });

        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to save bookmark.");
        }

        setBookmarkedProblemIds((current) => ({ ...current, [problemId]: true }));
      }
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update bookmark."));
    } finally {
      setBookmarkBusyById((current) => {
        const next = { ...current };
        delete next[problemId];
        return next;
      });
    }
  };

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <div className="min-h-screen bg-[#0f1117] text-slate-100 px-4 py-8 md:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-amber-400 tracking-[0.2em] uppercase font-semibold">
                Problem Set
              </p>
              <h1 className="text-3xl md:text-4xl font-bold">Practice Problems</h1>
              <p className="text-slate-400 text-sm md:text-base">
                Filter by difficulty, progress, tags, and bookmarks with personalized picks.
              </p>
            </div>

            {!loading && !metadataLoading && recommendations.length > 0 && (
              <SurfaceCard className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <h2 className="text-lg font-semibold text-slate-100">Recommended Next</h2>
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Based on your progress
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {recommendations.map((item) => (
                    <Link
                      key={item.problem.id}
                      href={`/problems/${item.problem.id}`}
                      className="rounded-lg border border-slate-700 bg-[#131822] p-3 transition hover:bg-[#1a2130]"
                    >
                      <p className="font-semibold text-slate-100">{item.problem.title}</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <DifficultyBadge difficulty={item.problem.difficulty} />
                        <ProblemProgressBadge
                          status={getProblemStatus(item.problem.id, problemStatusById)}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{item.reason}</p>
                    </Link>
                  ))}
                </div>
              </SurfaceCard>
            )}

            <div className="grid gap-3 md:grid-cols-4">
              {difficultySummaryCards.map((card) => {
                const isActive = difficultyFilter === card.value;
                return (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => setDifficultyFilter(card.value)}
                    aria-pressed={isActive}
                    className="text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  >
                    <SurfaceCard
                      className={`p-4 transition ${
                        isActive
                          ? "border-cyan-300/70 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
                          : "hover:border-slate-600"
                      }`}
                    >
                      <p className={`text-xs uppercase tracking-wide ${card.labelClassName}`}>
                        {card.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{card.count}</p>
                    </SurfaceCard>
                  </button>
                );
              })}
            </div>

            <SurfaceCard className="p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {statusSummaryCards.map((card) => {
                  const isActive = statusFilter === card.value;
                  return (
                    <button
                      key={card.label}
                      type="button"
                      onClick={() => setStatusFilter(card.value)}
                      className={`rounded-full px-3 py-1 text-xs border transition ${
                        isActive
                          ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-200"
                          : "border-slate-700 bg-[#121721] text-slate-300"
                      }`}
                    >
                      <span className={card.className}>{card.label}</span>
                      <span className="ml-1 text-slate-400">{card.count}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setBookmarksOnly((current) => !current)}
                  className={`rounded-full px-3 py-1 text-xs border transition ${
                    bookmarksOnly
                      ? "border-amber-400/70 bg-amber-400/15 text-amber-300"
                      : "border-slate-700 bg-[#121721] text-slate-300"
                  }`}
                >
                  Bookmarks only ({bookmarkedCount})
                </button>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    placeholder="Search by title or tag"
                    value={queryText}
                    onChange={(event) => setQueryText(event.target.value)}
                    className="w-full md:w-72 rounded-lg border border-slate-700 bg-[#11151d] px-3 py-2 text-slate-100 outline-none focus:border-amber-400/80"
                  />

                  <select
                    value={difficultyFilter}
                    onChange={(event) => setDifficultyFilter(toDifficultyFilter(event.target.value))}
                    className="rounded-lg border border-slate-700 bg-[#11151d] px-3 py-2 text-slate-100 outline-none focus:border-amber-400/80"
                  >
                    <option value="">All difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(toStatusFilter(event.target.value))}
                    className="rounded-lg border border-slate-700 bg-[#11151d] px-3 py-2 text-slate-100 outline-none focus:border-amber-400/80"
                  >
                    <option value="">All progress</option>
                    <option value="solved">Solved</option>
                    <option value="attempted">Attempted</option>
                    <option value="unseen">Unseen</option>
                  </select>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-sm text-slate-400">Tags:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className={`rounded-full px-3 py-1 text-xs border ${
                      selectedTag === null
                        ? "border-amber-400/70 bg-amber-400/15 text-amber-300"
                        : "border-slate-700 bg-[#121721] text-slate-300"
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`rounded-full px-3 py-1 text-xs border ${
                        selectedTag === tag
                          ? "border-amber-400/70 bg-amber-400/15 text-amber-300"
                          : "border-slate-700 bg-[#121721] text-slate-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {loading && <p className="text-slate-300">Loading problems...</p>}
              {metadataLoading && !loading && (
                <p className="text-slate-400 text-sm mb-3">Syncing your progress...</p>
              )}
              {error && <p className="text-rose-300">{error}</p>}
              {actionError && <p className="text-rose-300 text-sm mb-3">{actionError}</p>}

              {!loading && !error && sortedProblems.length === 0 && (
                <p className="text-slate-300">No problems match your filters.</p>
              )}

              {!loading && !error && sortedProblems.length > 0 && (
                <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#131822]">
                  {sortedProblems.map((problem, index) => {
                    const problemStatus = getProblemStatus(problem.id, problemStatusById);
                    const isBookmarked = Boolean(bookmarkedProblemIds[problem.id]);
                    const isBookmarkBusy = Boolean(bookmarkBusyById[problem.id]);

                    return (
                      <Link
                        key={problem.id}
                        href={`/problems/${problem.id}`}
                        className="block px-4 py-4 transition hover:bg-[#1a2130]"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="text-slate-500 text-sm mt-0.5 w-6">{index + 1}</span>
                            <div>
                              <p className="text-base font-semibold text-slate-100">
                                {problem.title}
                              </p>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                <DifficultyBadge difficulty={problem.difficulty} />
                                <ProblemProgressBadge status={problemStatus} />
                                {(problem.tags || []).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex rounded-full border border-slate-700 bg-[#11151d] px-2.5 py-1 text-xs text-slate-300"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={isBookmarkBusy}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void toggleBookmark(problem.id);
                              }}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                isBookmarked
                                  ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
                                  : "border-slate-600 bg-[#11151d] text-slate-300 hover:border-amber-400/60"
                              } disabled:opacity-60`}
                            >
                              {isBookmarkBusy
                                ? "Saving..."
                                : isBookmarked
                                  ? "Bookmarked"
                                  : "Bookmark"}
                            </button>

                            <span className="inline-flex items-center text-amber-300 text-sm font-medium">
                              Solve
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </SurfaceCard>

            {!loading && !error && (
              <div className="text-xs text-slate-500">
                Showing {sortedProblems.length} of {problems.length} problems - Bookmarks: {bookmarkedCount}
              </div>
            )}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
