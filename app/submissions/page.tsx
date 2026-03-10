"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "@/src/components/Navbar";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import { auth } from "@/src/firebase/firebase";
import type { Submission } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";
import StatusBadge from "@/src/components/ui/StatusBadge";
import SurfaceCard from "@/src/components/ui/SurfaceCard";

interface SubmissionListItem extends Submission {
  problemTitle?: string;
}

function toReadableDate(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = value.toDate;
    if (typeof toDate === "function") {
      return toDate.call(value).toLocaleString();
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }

  return "Unknown time";
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Submission["status"] | "">("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/submissions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => ({}))) as {
          submissions?: SubmissionListItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load submissions.");
        }

        setSubmissions(Array.isArray(payload.submissions) ? payload.submissions : []);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Failed to load submissions."));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const visibleSubmissions = submissions.filter((submission) => {
    if (statusFilter && submission.status !== statusFilter) {
      return false;
    }

    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return true;

    const title = (submission.problemTitle || "").toLowerCase();
    const id = submission.problemId.toLowerCase();
    const language = submission.language.toLowerCase();
    return title.includes(normalized) || id.includes(normalized) || language.includes(normalized);
  });

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <div className="min-h-screen bg-[#0f1117] text-slate-100 px-4 py-8 md:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-amber-400 tracking-[0.2em] uppercase font-semibold">
                History
              </p>
              <h1 className="text-3xl md:text-4xl font-bold">My Submissions</h1>
            </div>

            <SurfaceCard className="p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by problem, id, or language"
                  className="w-full md:w-80 rounded-lg border border-slate-700 bg-[#11151d] px-3 py-2 text-slate-100 outline-none focus:border-amber-400/80"
                />
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as Submission["status"] | "")
                  }
                  className="rounded-lg border border-slate-700 bg-[#11151d] px-3 py-2 text-slate-100 outline-none focus:border-amber-400/80"
                >
                  <option value="">All statuses</option>
                  <option value="accepted">Accepted</option>
                  <option value="wrong_answer">Wrong Answer</option>
                  <option value="runtime_error">Runtime Error</option>
                </select>
              </div>
            </SurfaceCard>

            {loading && <p className="text-slate-300">Loading submissions...</p>}
            {error && <p className="text-rose-300">{error}</p>}

            {!loading && !error && visibleSubmissions.length === 0 && (
              <SurfaceCard className="p-5">
                <p className="text-slate-300">No submissions found.</p>
              </SurfaceCard>
            )}

            {!loading &&
              !error &&
              visibleSubmissions.map((submission) => (
                <SurfaceCard key={submission.id} className="p-4 md:p-5">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-100">
                        {submission.problemTitle || "Problem"} ({submission.problemId})
                      </p>
                      <p className="text-sm text-slate-400">
                        {toReadableDate(submission.createdAt)}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Language: {submission.language}
                      </p>
                    </div>

                    <StatusBadge status={submission.status} />
                  </div>

                  <details className="mt-3 rounded-lg border border-slate-700 bg-[#131822] p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-200">
                      View Result
                    </summary>
                    <pre className="mt-3 text-xs overflow-auto max-h-64 text-slate-300">
                      {JSON.stringify(submission.result, null, 2)}
                    </pre>
                  </details>

                  <details className="mt-3 rounded-lg border border-slate-700 bg-[#131822] p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-200">
                      View Code
                    </summary>
                    <pre className="mt-3 text-xs overflow-auto max-h-64 text-slate-300">
                      {submission.code}
                    </pre>
                  </details>
                </SurfaceCard>
              ))}

            {!loading && !error && submissions.length > 0 && (
              <div className="text-xs text-slate-500">
                Showing {visibleSubmissions.length} of {submissions.length} submissions
              </div>
            )}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
