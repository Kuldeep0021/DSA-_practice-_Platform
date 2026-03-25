"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import Navbar from "@/src/components/Navbar";
import type { Difficulty, Problem } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";
import DifficultyBadge from "@/src/components/ui/DifficultyBadge";
import SurfaceCard from "@/src/components/ui/SurfaceCard";

type ProblemListItem = Omit<Problem, "testCases">;
type DifficultyFilter = Difficulty | "";

function toDifficultyFilter(value: string): DifficultyFilter {
  if (value === "Easy" || value === "Medium" || value === "Hard") {
    return value;
  }
  return "";
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
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
        setProblems(Array.isArray(payload.problems) ? payload.problems : []);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Failed to load problems."));
      } finally {
        setLoading(false);
      }
    };

    loadProblems();
  }, []);

  const allTags = Array.from(
    new Set(problems.flatMap((problem) => problem.tags || []))
  ).sort((a, b) => a.localeCompare(b));

  const normalizedQuery = queryText.trim().toLowerCase();
  const visibleProblems = problems.filter((problem) => {
    const title = problem.title.toLowerCase();
    const tags = (problem.tags || []).join(" ").toLowerCase();

    if (normalizedQuery && !title.includes(normalizedQuery) && !tags.includes(normalizedQuery)) {
      return false;
    }

    if (difficultyFilter && problem.difficulty !== difficultyFilter) {
      return false;
    }

    if (selectedTag && !(problem.tags || []).includes(selectedTag)) {
      return false;
    }

    return true;
  });

  const stats = problems.reduce(
    (acc, problem) => {
      acc.total += 1;
      acc[problem.difficulty] += 1;
      return acc;
    },
    { total: 0, Easy: 0, Medium: 0, Hard: 0 } as Record<"total" | "Easy" | "Medium" | "Hard", number>
  );

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

  const sortedProblems = [...visibleProblems].sort((a, b) => {
    const order = { Easy: 1, Medium: 2, Hard: 3 };
    const aOrder = order[a.difficulty];
    const bOrder = order[b.difficulty];
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.title.localeCompare(b.title);
  });

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
                Filter by difficulty and tags with a focused problem-list workflow.
              </p>
            </div>

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
              {error && <p className="text-rose-300">{error}</p>}

              {!loading && !error && sortedProblems.length === 0 && (
                <p className="text-slate-300">No problems match your filters.</p>
              )}

              {!loading && !error && sortedProblems.length > 0 && (
                <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#131822]">
                  {sortedProblems.map((problem, index) => (
                    <Link
                      key={problem.id}
                      href={`/problems/${problem.id}`}
                      className="block px-4 py-4 transition hover:bg-[#1a2130]"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="text-slate-500 text-sm mt-0.5 w-6">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-base font-semibold text-slate-100">{problem.title}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <DifficultyBadge difficulty={problem.difficulty} />
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

                        <span className="inline-flex items-center text-amber-300 text-sm font-medium">
                          Solve
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </SurfaceCard>

            {!loading && !error && (
              <div className="text-xs text-slate-500">
                Showing {sortedProblems.length} of {problems.length} problems
              </div>
            )}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
