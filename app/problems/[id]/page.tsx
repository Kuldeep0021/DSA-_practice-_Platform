"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import Navbar from "../../../src/components/Navbar";
import ProtectedRoute from "../../../src/components/ProtectedRoute";
import { auth } from "../../../src/firebase/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "../../../src/firebase/firebase";

// likes collection: documents with { userEmail, problemId, type: 'like'|'dislike', createdAt }


export default function ProblemDetail() {
  const params = useParams();
  const { id } = params;

  const [code, setCode] = useState("// Write your code here");
  const [output, setOutput] = useState("");
  const [problem, setProblem] = useState<any>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [starred, setStarred] = useState(false);
  const [favDocId, setFavDocId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [userVote, setUserVote] = useState<string | null>(null);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const d = await getDoc(doc(firestore, "problems", id as string));
        if (d.exists()) {
          const raw = d.data() as any;
          // some seeds store test cases as JSON string (testCasesJson)
          if (!raw.testCases && raw.testCasesJson && typeof raw.testCasesJson === 'string') {
            try {
              raw.testCases = JSON.parse(raw.testCasesJson);
            } catch (e) {
              raw.testCases = [];
            }
          }
          setProblem({ id: d.id, ...raw });
        } else {
          // fallback to basic sample if not found
          setProblem({ id, title: "Unknown Problem", description: "No description available." });
        }

        // fetch all problem ids to compute prev/next
        const snap = await getDocs(collection(firestore, "problems"));
        const ids: string[] = [];
        snap.forEach((doc) => ids.push(doc.id));
        const idx = ids.indexOf(id as string);
        if (idx !== -1) {
          setPrevId(ids[idx - 1] ?? null);
          setNextId(ids[idx + 1] ?? null);
        }

        // check favorite
        const user = auth.currentUser;
        if (user) {
          const q = query(
            collection(firestore, "favorites"),
            where("userEmail", "==", user.email),
            where("problemId", "==", id)
          );

          const favSnap = await getDocs(q);
          if (!favSnap.empty) {
            const first = favSnap.docs[0];
            setStarred(true);
            setFavDocId(first.id);
          }
        }
      } catch (err) {
        setProblem({ id, title: "Unknown Problem", description: "No description available." });
      }
    };

    fetchProblem();
  }, [id]);

  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const snap = await getDocs(collection(firestore, "likes"));
        let cnt = 0;
        let uv: string | null = null;
        snap.forEach((d) => {
          const data = d.data() as any;
          if (data.problemId !== id) return;
          if (data.type === "like") cnt++;
          if (auth.currentUser && data.userEmail === auth.currentUser.email) {
            uv = data.type;
          }
        });

        setLikesCount(cnt);
        setUserVote(uv);
      } catch (err) {
        // ignore
      }
    };

    fetchLikes();
  }, [id]);

  const handleRun = async () => {
    // Run user code against test cases (client-side)
    setOutput("Running tests...");

    const cases = (problem?.testCases as any[]) || [];
    if (cases.length === 0) {
      setOutput("No test cases defined for this problem.");
      return;
    }

    // Save code to localStorage
    try {
      localStorage.setItem(`code_problem_${id}`, code);
    } catch (e) {
      // ignore
    }

    // Evaluate
    const results: { passed: boolean; expected: any; actual: any; input: any }[] = [];
    for (const tc of cases) {
      try {
        // We expect user to define a function named `solution` in their code.
        const wrapped = `${code}\n;return typeof solution === 'function' ? solution(...INPUT) : (typeof module !== 'undefined' && module.exports ? module.exports : null)`;

        // Create a function that injects INPUT and runs the code
        const fn = new Function('INPUT', wrapped);
        const actual = fn(tc.input);
        const passed = JSON.stringify(actual) === JSON.stringify(tc.output);
        results.push({ passed, expected: tc.output, actual, input: tc.input });
      } catch (err) {
        results.push({ passed: false, expected: tc.output, actual: String(err), input: tc.input });
      }
    }

    const passedAll = results.every((r) => r.passed);
    setOutput(JSON.stringify({ passedAll, results }, null, 2));

    // Save a run submission record (not a final submit)
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(firestore, "submissions"), {
        userEmail: user.email,
        problemId: id,
        code: code,
        result: { passedAll, results },
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving submission:", error);
    }
  };

  useEffect(() => {
    // Load saved code from localStorage
    try {
      const saved = localStorage.getItem(`code_problem_${id}`);
      if (saved) setCode(saved);
    } catch (e) {}
  }, [id]);

  const toggleStar = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login to star problems");
      return;
    }

    try {
      if (starred && favDocId) {
        await deleteDoc(doc(firestore, "favorites", favDocId));
        setStarred(false);
        setFavDocId(null);
      } else {
        const ref = await addDoc(collection(firestore, "favorites"), {
          userEmail: user.email,
          problemId: id,
          createdAt: serverTimestamp(),
        });
        setStarred(true);
        setFavDocId(ref.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleLike = async (type: "like" | "dislike") => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login to vote");
      return;
    }

    try {
      // check existing
      const q = query(
        collection(firestore, "likes"),
        where("userEmail", "==", user.email),
        where("problemId", "==", id)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const first = snap.docs[0];
        const data = first.data() as any;
        if (data.type === type) {
          // undo
          await deleteDoc(first.ref);
          setUserVote(null);
        } else {
          // change: delete and add new
          await deleteDoc(first.ref);
          await addDoc(collection(firestore, "likes"), {
            userEmail: user.email,
            problemId: id,
            type,
            createdAt: serverTimestamp(),
          });
          setUserVote(type);
        }
      } else {
        await addDoc(collection(firestore, "likes"), {
          userEmail: user.email,
          problemId: id,
          type,
          createdAt: serverTimestamp(),
        });
        setUserVote(type);
      }

      // refresh counts
      const all = await getDocs(collection(firestore, "likes"));
      let cnt = 0;
      all.forEach((d) => {
        const data = d.data() as any;
        if (data.problemId === id && data.type === "like") cnt++;
      });
      setLikesCount(cnt);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-4">{problem?.title}</h1>
              <p className="mb-6 text-gray-400">{problem?.description}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                onClick={toggleStar}
                className={`px-3 py-1 rounded ${starred ? 'bg-yellow-500 text-black' : 'bg-gray-700'}`}>
                {starred ? '★ Starred' : '☆ Star'}
              </button>

              <div className="flex gap-2">
                {prevId && (
                  <a href={`/problems/${prevId}`} className="bg-gray-700 px-3 py-1 rounded">Previous</a>
                )}
                {nextId && (
                  <a href={`/problems/${nextId}`} className="bg-gray-700 px-3 py-1 rounded">Next</a>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <CodeMirror
              value={code}
              height="300px"
              theme="dark"
              extensions={[javascript()]}
              onChange={(value) => setCode(value)}
            />
          </div>

          <button
            onClick={handleRun}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 mb-4"
          >
            Run Code
          </button>

          {output && (
            <div className="bg-gray-900 p-4 rounded">
              <h2 className="font-semibold mb-2">Output:</h2>
              <pre>{output}</pre>
            </div>
          )}
        </div>
      </>
    </ProtectedRoute>
  );
}