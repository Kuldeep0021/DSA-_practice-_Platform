"use client";

import ProtectedRoute from "@/src/components/ProtectedRoute";
import Navbar from "@/src/components/Navbar";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "@/src/firebase/firebase";
import { auth } from "@/src/firebase/firebase";

type Problem = {
  id: string;
  title: string;
  difficulty?: string;
  tags?: string[];
};

export default function Problems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [queryText, setQueryText] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const fetchLikes = async (userEmail?: string) => {
    try {
      const snap = await getDocs(collection(firestore, "likes"));
      const cnts: Record<string, number> = {};
      const userMap: Record<string, string> = {};
      snap.forEach((d) => {
        const data = d.data() as any;
        const pid = data.problemId;
        const t = data.type || "like";
        if (!cnts[pid]) cnts[pid] = 0;
        if (t === "like") cnts[pid]++;
        if (userEmail && data.userEmail === userEmail) {
          userMap[pid] = t;
        }
      });

      setCounts(cnts);
      // map user's likes to local starred UI
      if (userEmail) {
        const next: Record<string, boolean> = { ...likes };
        Object.keys(userMap).forEach((pid) => {
          next[pid] = userMap[pid] === "like";
        });
        setLikes(next);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("problem_likes");
    if (stored) setLikes(JSON.parse(stored));

    const fetchProblems = async () => {
      try {
        // Try server-side API (uses Admin SDK) first — useful if Firestore rules restrict client reads
        const res = await fetch('/api/problems');
        if (res.ok) {
          const payload = await res.json();
          if (Array.isArray(payload)) {
            setProblems(payload.map((d: any) => ({ id: d.id, title: d.title || d.name, difficulty: d.difficulty, tags: d.tags })));
            fetchLikes(auth.currentUser?.email ?? undefined);
            return;
          }
        }

        // Fallback to client Firestore read
        const snapshot = await getDocs(collection(firestore, 'problems'));
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setProblems(docs);
        fetchLikes(auth.currentUser?.email ?? undefined);
        return;
      } catch (err) {
        console.error(err);
      }
    };

    fetchProblems();
  }, []);

  // derive tags and visible problems for the older list UI
  const allTags = Array.from(new Set((problems || []).flatMap((p:any) => p.tags || [])));

  const visible = (problems || []).filter((p:any) => {
    if (queryText && !(p.title || "").toLowerCase().includes(queryText.toLowerCase()) && !((p.tags||[]).join(' ').toLowerCase().includes(queryText.toLowerCase()))) return false;
    if (difficultyFilter && p.difficulty !== difficultyFilter) return false;
    if (selectedTag && !(p.tags || []).includes(selectedTag)) return false;
    return true;
  });

  const toggleLike = async (pid: string) => {
    const me = auth.currentUser?.email || 'anon';
    const currently = !!likes[pid];
    const nextLikes = { ...likes, [pid]: !currently };
    setLikes(nextLikes);
    localStorage.setItem('problem_likes', JSON.stringify(nextLikes));

    try {
      if (!currently) {
        await addDoc(collection(firestore, 'likes'), { problemId: pid, userEmail: me, type: 'like', createdAt: new Date().toISOString() });
      } else {
        const q = query(collection(firestore, 'likes'), where('problemId', '==', pid), where('userEmail', '==', me));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }
      // refresh counts
      fetchLikes(me);
    } catch (e) {
      // ignore write failures
    }
  };

  const handleLike = (pid: string) => {
    toggleLike(pid);
  };

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <div className="bg-black text-white min-h-screen p-8">
          <h1 className="text-3xl font-bold mb-6">Problems 🚀</h1>

          <div className="bg-gray-900 p-4 rounded">
              <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <input
                    placeholder="Search problems or tags"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    className="p-2 rounded bg-gray-800 text-white w-64"
                  />

                  <select
                    value={difficultyFilter ?? ""}
                    onChange={(e) => setDifficultyFilter(e.target.value || null)}
                    className="p-2 rounded bg-gray-800 text-white"
                  >
                    <option value="">All difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-400">Tags:</span>
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-2 py-1 rounded ${selectedTag === null ? 'bg-green-600' : 'bg-gray-700'}`}>
                    All
                  </button>
                  {allTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(t)}
                      className={`px-2 py-1 rounded ${selectedTag === t ? 'bg-green-600' : 'bg-gray-700'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {problems.length === 0 ? (
                <p>Loading problems...</p>
              ) : (
                <div className="grid gap-4">
                  {visible.map((p) => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-black/40 rounded">
                      <div>
                        <Link href={`/problems/${p.id}`} className="text-lg font-semibold text-green-300">
                          {p.title}
                        </Link>
                        <div className="text-sm text-gray-400 flex gap-2 items-center">
                          <span className="px-2 py-0.5 bg-gray-800 rounded">{p.difficulty}</span>
                          {(p.tags || []).map((t) => (
                            <span key={t} className="text-xs px-2 py-0.5 bg-gray-800 rounded">{t}</span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-300">{counts[p.id] ?? 0} ★</div>
                        <button
                          onClick={() => toggleLike(p.id)}
                          className={`px-3 py-1 rounded ${likes[p.id] ? 'bg-yellow-500 text-black' : 'bg-gray-700'}`}>
                          {likes[p.id] ? '★ Starred' : '☆ Star'}
                        </button>
                        <Link href={`/problems/${p.id}`} className="bg-green-600 px-3 py-1 rounded">Solve</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}