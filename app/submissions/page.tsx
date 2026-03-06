"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { auth, firestore } from "../../src/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "../../src/components/Navbar";

export default function Submissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const q = query(
        collection(firestore, "submissions"),
        where("userEmail", "==", user.email),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const data: any[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data() as any;
        data.push({ id: doc.id, ...d, createdAtRaw: d.createdAt });
      });

      setSubmissions(data);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold mb-6">
          My Submissions 📜
        </h1>

        {submissions.length === 0 ? (
          <p>No submissions yet.</p>
        ) : (
          submissions.map((sub) => (
            <div key={sub.id} className="bg-gray-900 p-4 rounded mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Problem ID: {sub.problemId}</p>
                  <p className="text-sm text-gray-400">{sub.createdAtRaw?.toDate ? sub.createdAtRaw.toDate().toString() : String(sub.createdAtRaw)}</p>
                </div>

                <div className="text-right">
                  {sub.result ? (
                    <div>
                      <div className={`inline-block px-3 py-1 rounded ${sub.result.passedAll ? 'bg-green-600' : 'bg-red-600'}`}>{sub.result.passedAll ? 'All Passed' : 'Some Failed'}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">No result</div>
                  )}
                </div>
              </div>

              {sub.result && (
                <details className="mt-2 bg-black/20 p-2 rounded">
                  <summary className="cursor-pointer">View Results</summary>
                  <pre className="mt-2 text-sm overflow-auto max-h-60">{JSON.stringify(sub.result, null, 2)}</pre>
                </details>
              )}

              {sub.code && (
                <details className="mt-2 bg-black/20 p-2 rounded">
                  <summary className="cursor-pointer">View Code</summary>
                  <pre className="mt-2 text-sm overflow-auto max-h-60">{sub.code}</pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}