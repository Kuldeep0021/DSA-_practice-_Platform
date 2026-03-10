"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getErrorMessage } from "@/src/utils/errors";
import SurfaceCard from "@/src/components/ui/SurfaceCard";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to login. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-center">
          <p className="text-amber-400 text-sm font-semibold tracking-[0.24em] uppercase">
            DSA Verse
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">
            Prepare for coding interviews with a structured practice workflow.
          </h1>
          <p className="mt-4 text-slate-400 max-w-md">
            Solve curated problems, run code instantly, and track submissions in one place.
          </p>
        </div>

        <SurfaceCard className="p-8 md:p-10">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Welcome back</h2>
              <p className="text-sm text-slate-400 mt-1">
                Login to continue practicing.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm text-slate-300" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-700 bg-[#11151d] px-3 py-2.5 text-slate-100 outline-none focus:border-amber-400/80"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm text-slate-300" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-lg border border-slate-700 bg-[#11151d] px-3 py-2.5 text-slate-100 outline-none focus:border-amber-400/80"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-400 px-4 py-2.5 text-slate-900 font-semibold hover:bg-amber-300 disabled:opacity-70"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {error && (
              <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between text-sm">
              <Link href="/reset-password" className="text-amber-300 hover:text-amber-200">
                Forgot password?
              </Link>
              <Link href="/signup" className="text-slate-300 hover:text-slate-100">
                Create account
              </Link>
            </div>
          </form>
        </SurfaceCard>
      </div>
    </div>
  );
}
