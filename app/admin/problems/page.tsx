"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import Navbar from "@/src/components/Navbar";
import { auth, firestore } from "@/src/firebase/firebase";
import type { Difficulty, Problem, ProblemExample, TestCase } from "@/src/types/domain";
import { getErrorMessage } from "@/src/utils/errors";

type ProblemListItem = Omit<Problem, "testCases">;

interface ProblemFormState {
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string;
  constraints: string;
  examplesJson: string;
  testCasesJson: string;
  starterCodeJavascript: string;
  starterCodePython: string;
}

const DEFAULT_FORM_STATE: ProblemFormState = {
  title: "",
  description: "",
  difficulty: "Easy",
  tags: "",
  constraints: "",
  examplesJson: "[]",
  testCasesJson: "[]",
  starterCodeJavascript: "function solution(...args) {\n  return null;\n}",
  starterCodePython: "def solution(*args):\n    return None",
};

function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function parseConstraints(constraints: string): string[] {
  return constraints
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseExamples(text: string): ProblemExample[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Examples must be a JSON array.");
  }

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      input: typeof item.input === "string" ? item.input : "",
      output: typeof item.output === "string" ? item.output : "",
      explanation:
        typeof item.explanation === "string" && item.explanation.length > 0
          ? item.explanation
          : undefined,
    }));
}

function parseTestCases(text: string): TestCase[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Test cases must be a JSON array.");
  }

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      input: Array.isArray(item.input) ? item.input : [],
      output: item.output,
    }));
}

export default function AdminProblemsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProblemFormState>(DEFAULT_FORM_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase();
  const currentUserEmail = (userEmail || "").trim().toLowerCase();
  const canAdmin = currentUserEmail.length > 0 && currentUserEmail === adminEmail;

  const resetForm = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
  };

  const loadProblems = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/problems");
      const payload = (await response.json().catch(() => ({}))) as {
        problems?: ProblemListItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load problems.");
      }

      setProblems(Array.isArray(payload.problems) ? payload.problems : []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load problems."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? null);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authChecked || !canAdmin) return;
    loadProblems();
  }, [authChecked, canAdmin]);

  const updateFormField = <K extends keyof ProblemFormState>(
    key: K,
    value: ProblemFormState[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveProblem = async () => {
    setStatus(null);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        tags: parseTags(form.tags),
        constraints: parseConstraints(form.constraints),
        examples: parseExamples(form.examplesJson),
        testCases: parseTestCases(form.testCasesJson),
        starterCode: {
          javascript: form.starterCodeJavascript,
          python: form.starterCodePython,
        },
        createdAt: new Date().toISOString(),
      };

      if (!payload.title || !payload.description) {
        throw new Error("Title and description are required.");
      }

      if (editingId) {
        await updateDoc(doc(firestore, "problems", editingId), payload);
        setStatus("Problem updated.");
      } else {
        await addDoc(collection(firestore, "problems"), payload);
        setStatus("Problem created.");
      }

      resetForm();
      await loadProblems();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save problem."));
    }
  };

  const editProblem = async (problemId: string) => {
    setError(null);
    setStatus(null);

    try {
      const problemDoc = await getDoc(doc(firestore, "problems", problemId));
      if (!problemDoc.exists()) {
        throw new Error("Problem not found.");
      }

      const data = problemDoc.data() as Record<string, unknown>;
      const tags = Array.isArray(data.tags) ? data.tags.filter((item): item is string => typeof item === "string") : [];
      const constraints = Array.isArray(data.constraints)
        ? data.constraints.filter((item): item is string => typeof item === "string")
        : [];

      setEditingId(problemId);
      setForm({
        title: typeof data.title === "string" ? data.title : "",
        description: typeof data.description === "string" ? data.description : "",
        difficulty:
          data.difficulty === "Easy" || data.difficulty === "Medium" || data.difficulty === "Hard"
            ? data.difficulty
            : "Easy",
        tags: tags.join(", "),
        constraints: constraints.join("\n"),
        examplesJson: JSON.stringify(data.examples || [], null, 2),
        testCasesJson: JSON.stringify(data.testCases || [], null, 2),
        starterCodeJavascript:
          typeof data.starterCode === "object" &&
          data.starterCode !== null &&
          typeof (data.starterCode as Record<string, unknown>).javascript === "string"
            ? ((data.starterCode as Record<string, unknown>).javascript as string)
            : DEFAULT_FORM_STATE.starterCodeJavascript,
        starterCodePython:
          typeof data.starterCode === "object" &&
          data.starterCode !== null &&
          typeof (data.starterCode as Record<string, unknown>).python === "string"
            ? ((data.starterCode as Record<string, unknown>).python as string)
            : DEFAULT_FORM_STATE.starterCodePython,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load problem for editing."));
    }
  };

  const removeProblem = async (problemId: string) => {
    if (!confirm("Delete this problem?")) return;

    setError(null);
    setStatus(null);
    try {
      await deleteDoc(doc(firestore, "problems", problemId));
      setStatus("Problem deleted.");
      setProblems((current) => current.filter((problem) => problem.id !== problemId));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete problem."));
    }
  };

  if (!authChecked) {
    return (
      <ProtectedRoute>
        <>
          <Navbar />
          <div className="min-h-screen bg-black text-white p-8">Checking authentication...</div>
        </>
      </ProtectedRoute>
    );
  }

  if (!canAdmin) {
    return (
      <ProtectedRoute>
        <>
          <Navbar />
          <div className="min-h-screen bg-black text-white p-8">
            You are not authorized to access the admin panel.
            <p className="text-sm text-gray-400 mt-2">Signed in: {userEmail || "unknown"}</p>
          </div>
        </>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white p-8 space-y-6">
          <h1 className="text-2xl font-bold">Admin Problem Manager</h1>

          <div className="surface rounded p-4 space-y-3">
            <h2 className="font-semibold">{editingId ? "Edit Problem" : "Create Problem"}</h2>

            <input
              className="w-full p-2 bg-gray-800 rounded"
              placeholder="Title"
              value={form.title}
              onChange={(event) => updateFormField("title", event.target.value)}
            />
            <textarea
              className="w-full p-2 bg-gray-800 rounded min-h-[100px]"
              placeholder="Description"
              value={form.description}
              onChange={(event) => updateFormField("description", event.target.value)}
            />
            <select
              value={form.difficulty}
              onChange={(event) =>
                updateFormField("difficulty", event.target.value as Difficulty)
              }
              className="p-2 bg-gray-800 rounded"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <input
              className="w-full p-2 bg-gray-800 rounded"
              placeholder="Tags separated by commas"
              value={form.tags}
              onChange={(event) => updateFormField("tags", event.target.value)}
            />
            <textarea
              className="w-full p-2 bg-gray-800 rounded min-h-[80px]"
              placeholder="Constraints (one per line)"
              value={form.constraints}
              onChange={(event) => updateFormField("constraints", event.target.value)}
            />
            <textarea
              className="w-full p-2 bg-gray-800 rounded min-h-[120px] font-mono text-sm"
              placeholder='Examples JSON. Example: [{"input":"nums=[2,7], target=9","output":"[0,1]"}]'
              value={form.examplesJson}
              onChange={(event) => updateFormField("examplesJson", event.target.value)}
            />
            <textarea
              className="w-full p-2 bg-gray-800 rounded min-h-[120px] font-mono text-sm"
              placeholder='Test cases JSON. Example: [{"input":[[2,7,11,15],9],"output":[0,1]}]'
              value={form.testCasesJson}
              onChange={(event) => updateFormField("testCasesJson", event.target.value)}
            />
            <textarea
              className="w-full p-2 bg-gray-800 rounded min-h-[120px] font-mono text-sm"
              placeholder="Starter code (JavaScript)"
              value={form.starterCodeJavascript}
              onChange={(event) =>
                updateFormField("starterCodeJavascript", event.target.value)
              }
            />
            <textarea
              className="w-full p-2 bg-gray-800 rounded min-h-[120px] font-mono text-sm"
              placeholder="Starter code (Python)"
              value={form.starterCodePython}
              onChange={(event) => updateFormField("starterCodePython", event.target.value)}
            />

            <div className="flex gap-2">
              <button onClick={saveProblem} className="btn-accent px-3 py-1 rounded">
                {editingId ? "Update Problem" : "Create Problem"}
              </button>
              {editingId && (
                <button onClick={resetForm} className="bg-gray-700 px-3 py-1 rounded">
                  Cancel Edit
                </button>
              )}
            </div>

            {status && <p className="text-green-400 text-sm">{status}</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Existing Problems</h2>
            {loading && <p>Loading problems...</p>}
            {!loading &&
              problems.map((problem) => (
                <div
                  key={problem.id}
                  className="surface rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{problem.title}</p>
                    <p className="text-sm muted">
                      {problem.difficulty} - {(problem.tags || []).join(", ")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => editProblem(problem.id)}
                      className="bg-yellow-600 px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeProblem(problem.id)}
                      className="bg-red-600 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
