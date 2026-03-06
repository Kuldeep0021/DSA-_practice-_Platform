"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import Navbar from "@/src/components/Navbar";
import { auth } from "@/src/firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "@/src/firebase/firebase";

export default function AdminProblems() {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [tags, setTags] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isAdminEmail = typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(firestore, "problems"));
        const arr: any[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
        setProblems(arr);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const canAdmin = auth.currentUser && auth.currentUser.email === isAdminEmail;

  const handleCreate = async () => {
    try {
      const t = tags.split(",").map((s) => s.trim()).filter(Boolean);
      await addDoc(collection(firestore, "problems"), {
        title,
        description,
        difficulty,
        tags: t,
        createdAt: new Date().toISOString(),
      });
      // refresh
      const snap = await getDocs(collection(firestore, "problems"));
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setProblems(arr);
      setTitle(""); setDescription(""); setTags(""); setDifficulty("Easy");
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this problem?")) return;
    try {
      await deleteDoc(doc(firestore, "problems", id));
      setProblems((p) => p.filter((x) => x.id !== id));
    } catch (err) { console.error(err); }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setTitle(p.title || "");
    setDescription(p.description || "");
    setDifficulty(p.difficulty || "Easy");
    setTags((p.tags || []).join(", "));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateDoc(doc(firestore, "problems", editingId), {
        title, description, difficulty, tags: tags.split(',').map(s => s.trim()).filter(Boolean)
      });
      const snap = await getDocs(collection(firestore, "problems"));
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setProblems(arr);
      setEditingId(null); setTitle(""); setDescription(""); setTags("");
    } catch (err) { console.error(err); }
  };

  if (!auth.currentUser) {
    return (
      <ProtectedRoute>
        <>
          <Navbar />
          <div className="min-h-screen bg-black text-white p-8">Please login as admin to manage problems.</div>
        </>
      </ProtectedRoute>
    );
  }

  if (!canAdmin) {
    return (
      <ProtectedRoute>
        <>
          <Navbar />
          <div className="min-h-screen bg-black text-white p-8">You are not authorized to access the admin panel.</div>
        </>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white p-8">
          <h1 className="text-2xl font-bold mb-4">Admin — Problems</h1>

          <div className="bg-gray-900 p-4 rounded mb-6">
            <h2 className="font-semibold mb-2">Create / Edit</h2>
            <input className="w-full p-2 mb-2 bg-gray-800 rounded" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="w-full p-2 mb-2 bg-gray-800 rounded" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className="w-full p-2 mb-2 bg-gray-800 rounded" placeholder="Tags (comma)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <div className="flex gap-2">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="p-2 bg-gray-800 rounded">
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              {editingId ? (
                <button onClick={saveEdit} className="bg-green-600 px-3 py-1 rounded">Save</button>
              ) : (
                <button onClick={handleCreate} className="bg-blue-600 px-3 py-1 rounded">Create</button>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            {loading ? <div>Loading...</div> : problems.map((p) => (
              <div key={p.id} className="bg-gray-900 p-3 rounded flex justify-between items-center">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-gray-400">{p.difficulty} • {(p.tags || []).join(', ')}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(p)} className="bg-yellow-600 px-3 py-1 rounded">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="bg-red-600 px-3 py-1 rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
