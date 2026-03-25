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

  const getLinkClassName = (href: string, isButton: boolean = false) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    if (isButton) {
      if (isActive) {
        return "px-4 py-2 rounded font-semibold border border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.35)]";
      }
      return "btn-accent px-4 py-2 rounded font-semibold border border-transparent";
    }
    return `${
      isActive ? "text-white" : "muted"
    } text-glow-cyan transition-all duration-300`;
  };

  const isAuthenticated = Boolean(user);

  if (!isAuthenticated) {
    return (
      <nav className="flex flex-wrap justify-between items-center p-4 gap-3 border-b border-white/10">
        <Link
          href="/"
          className="text-2xl sm:text-3xl font-extrabold text-glow-cyan"
          style={{ color: "var(--accent-2)" }}
        >
          DSA Verse
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="px-4 py-2 rounded border border-white/20 hover:border-white/40"
          >
            Login
          </Link>
          <Link href="/signup" className="btn-accent px-4 py-2 rounded font-semibold">
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
            className="text-2xl sm:text-3xl font-extrabold text-glow-cyan"
            style={{ color: "var(--accent-2)" }}
          >
            DSA Verse
          </Link>
          <span className="muted text-sm hidden sm:inline">Practice and Learn</span>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-end">
          <Link href="/problems" className={getLinkClassName("/problems", true)}>
            Problems
          </Link>
          <Link href="/submissions" className={getLinkClassName("/submissions", true)}>
            Submissions
          </Link>
          <Link href="/my-list" className={getLinkClassName("/my-list", true)}>
            My List
          </Link>
          <Link href="/dashboard" className={getLinkClassName("/dashboard", true)}>
            Dashboard
          </Link>

          <button
            onClick={handleLogout}
            className="btn-accent px-4 py-2 rounded font-semibold border border-transparent"
          >
            Logout
          </button>
        </div>
      </div>

      {user?.email && (
        <p className="muted text-xs mt-2 break-all">Signed in as {user.email}</p>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </nav>
  );
}

