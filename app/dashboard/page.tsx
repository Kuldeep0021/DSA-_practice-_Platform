"use client";

import { useEffect, useState } from "react";
import { auth } from "../../src/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../../src/components/Navbar";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import Link from "next/link";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? user?.uid ?? null);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

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
        <div className="min-h-screen bg-black text-white px-8 py-12">
          <h1 className="text-3xl font-bold mb-3">Welcome to DSA Verse</h1>
          <p className="text-gray-300 mb-8">Logged in as: {userEmail}</p>

          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/problems" className="surface rounded p-4 interactive-card">
              <h2 className="font-semibold mb-2">Solve Problems</h2>
              <p className="text-sm muted">Browse the full problem list and start coding.</p>
            </Link>

            <Link href="/submissions" className="surface rounded p-4 interactive-card">
              <h2 className="font-semibold mb-2">Submission History</h2>
              <p className="text-sm muted">Review your accepted and failed submissions.</p>
            </Link>

            <Link href="/admin/problems" className="surface rounded p-4 interactive-card">
              <h2 className="font-semibold mb-2">Admin Problems</h2>
              <p className="text-sm muted">Create and manage problems if you are an admin.</p>
            </Link>
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
