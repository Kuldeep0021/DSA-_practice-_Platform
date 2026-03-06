"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <nav className="flex justify-between items-center p-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-2xl font-extrabold" style={{color:'var(--accent)'}}>
          <span className="blink-slow px-2 rounded">DSA Verse 🚀</span>
        </Link>
        <span className="muted text-sm">Practice & Learn</span>
      </div>

      <div className="flex gap-6 items-center">
        <Link href="/problems" className="muted hover:text-white">Problems</Link>
        <Link href="/submissions" className="muted hover:text-white">Submissions</Link>
        <Link href="/dashboard" className="muted hover:text-white">Dashboard</Link>

        <button
          onClick={handleLogout}
          className="btn-accent px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}