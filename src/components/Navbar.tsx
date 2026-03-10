"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { usePathname, useRouter } from "next/navigation";
import { getErrorMessage } from "@/src/utils/errors";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setError(null);
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to logout right now."));
    }
  };

  const linkClassName = (href: string) =>
    `${pathname === href ? "text-white" : "muted hover:text-white"} transition-colors`;

  const isAuthenticated = Boolean(user);

  if (!isAuthenticated) {
    return (
      <nav className="flex justify-between items-center p-4 border-b border-white/10">
        <Link href="/" className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>
          DSA Verse
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className={linkClassName("/login")}>
            Login
          </Link>
          <Link href="/signup" className={linkClassName("/signup")}>
            Signup
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-white/10 p-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-2xl font-extrabold"
            style={{ color: "var(--accent)" }}
          >
            <span className="blink-slow px-2 rounded">DSA Verse</span>
          </Link>
          <span className="muted text-sm">Practice and Learn</span>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Link href="/problems" className={linkClassName("/problems")}>
            Problems
          </Link>
          <Link href="/submissions" className={linkClassName("/submissions")}>
            Submissions
          </Link>
          <Link href="/dashboard" className={linkClassName("/dashboard")}>
            Dashboard
          </Link>

          <button onClick={handleLogout} className="btn-accent px-3 py-1 rounded">
            Logout
          </button>
        </div>
      </div>

      {user?.email && <p className="muted text-xs mt-2">Signed in as {user.email}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </nav>
  );
}
