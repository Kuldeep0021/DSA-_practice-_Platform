"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import Navbar from "@/src/components/Navbar";
import { auth } from "@/src/firebase/firebase";
import type { Difficulty, Problem, Submission } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";
import SurfaceCard from "@/src/components/ui/SurfaceCard";
import DifficultyBadge from "@/src/components/ui/DifficultyBadge";
import ProblemProgressBadge, {
  type ProblemProgressStatus,
} from "@/src/components/ui/ProblemProgressBadge";

type ProblemListItem = Omit<Problem, "testCases">;

interface SubmissionSummary {
  problemId: string;
  status: Submission["status"];
}

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

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

export default function MyListPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [bookmarkedProblemIds, setBookmarkedProblemIds] = useState<Record<string, true>>({});
  const [problemStatusById, setProblemStatusById] = useState<
    Record<string, ProblemProgressStatus>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingById, setRemovingById] = useState<Record<string, true>>({});

  useEffect(() => {
    let isActive = true;
    let requestVersion = 0;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      requestVersion += 1;
      const currentRequestVersion = requestVersion;

      if (!user) {
        setProblems([]);
        setBookmarkedProblemIds({});
        setProblemStatusById({});
        setLoading(false);
        return;
      }

      void (async () => {
        setLoading(true);
        setError(null);
        setActionError(null);

        try {
          const token = await user.getIdToken();

          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }

          const [problemsResponse, submissionsResponse, bookmarksResponse] = await Promise.all([
            fetch("/api/problems"),
            fetch("/api/submissions", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("/api/bookmarks", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const problemsPayload = (await problemsResponse.json().catch(() => ({}))) as {
            problems?: ProblemListItem[];
            error?: string;
          };
          const submissionsPayload = (await submissionsResponse
            .json()
            .catch(() => ({}))) as { submissions?: unknown; error?: string };
          const bookmarksPayload = (await bookmarksResponse
            .json()
            .catch(() => ({}))) as { problemIds?: unknown; error?: string };

          if (!problemsResponse.ok) {
            throw new Error(problemsPayload.error || "Failed to load problems.");
          }
          if (!submissionsResponse.ok) {
            throw new Error(submissionsPayload.error || "Failed to load submissions.");
          }
          if (!bookmarksResponse.ok) {
            throw new Error(bookmarksPayload.error || "Failed to load bookmarks.");
          }

          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }

          const parsedProblems = Array.isArray(problemsPayload.problems)
            ? problemsPayload.problems
            : [];
          const parsedSubmissions = parseSubmissionList(submissionsPayload.submissions);
          const parsedBookmarks = parseProblemIds(bookmarksPayload.problemIds);

          setProblems(parsedProblems);
          setProblemStatusById(buildProblemStatusById(parsedSubmissions));
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
          setError(getErrorMessage(err, "Failed to load your bookmarked problems."));
        } finally {
          if (!isActive || currentRequestVersion !== requestVersion) {
            return;
          }
          setLoading(false);
        }
      })();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const bookmarkedProblems = useMemo(() => {
    return problems
      .filter((problem) => bookmarkedProblemIds[problem.id])
      .sort((a, b) => {
        const difficultyDelta = DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty];
        if (difficultyDelta !== 0) return difficultyDelta;
        return a.title.localeCompare(b.title);
      });
  }, [problems, bookmarkedProblemIds]);

  const removeBookmark = async (problemId: string) => {
    if (removingById[problemId]) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setActionError("Please sign in to update bookmarks.");
      return;
    }

    setActionError(null);
    setRemovingById((current) => ({ ...current, [problemId]: true }));

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/bookmarks?problemId=${encodeURIComponent(problemId)}`,
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
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update bookmark."));
    } finally {
      setRemovingById((current) => {
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
                My List
              </p>
              <h1 className="text-3xl md:text-4xl font-bold">Bookmarked Problems</h1>
              <p className="text-slate-400 text-sm md:text-base">
                Your saved problems for focused practice sessions.
              </p>
            </div>

            {loading && <p className="text-slate-300">Loading your bookmarked problems...</p>}
            {error && <p className="text-rose-300">{error}</p>}
            {actionError && <p className="text-rose-300 text-sm">{actionError}</p>}

            {!loading && !error && bookmarkedProblems.length === 0 && (
              <SurfaceCard className="p-5">
                <p className="text-slate-300">You have no bookmarked problems yet.</p>
                <Link
                  href="/problems"
                  className="inline-flex mt-3 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-900"
                >
                  Browse Problems
                </Link>
              </SurfaceCard>
            )}

            {!loading && !error && bookmarkedProblems.length > 0 && (
              <SurfaceCard className="p-0 overflow-hidden">
                <div className="divide-y divide-slate-800">
                  {bookmarkedProblems.map((problem) => {
                    const problemStatus = getProblemStatus(problem.id, problemStatusById);
                    const isRemoving = Boolean(removingById[problem.id]);

                    return (
                      <Link
                        key={problem.id}
                        href={`/problems/${problem.id}`}
                        className="block px-4 py-4 transition hover:bg-[#1a2130]"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-100">{problem.title}</p>
                            <div className="mt-2 flex gap-2 flex-wrap">
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

                          <button
                            type="button"
                            disabled={isRemoving}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void removeBookmark(problem.id);
                            }}
                            className="rounded-lg border border-amber-400/60 bg-amber-400/15 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-60"
                          >
                            {isRemoving ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </SurfaceCard>
            )}

            {!loading && !error && bookmarkedProblems.length > 0 && (
              <p className="text-xs text-slate-500">{bookmarkedProblems.length} bookmarked problems</p>
            )}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
