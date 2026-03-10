import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <section className="max-w-3xl w-full surface rounded-xl p-10">
        <p className="text-sm uppercase tracking-wider text-cyan-300 mb-3">DSA Verse</p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          Practice coding interview problems with live execution.
        </h1>
        <p className="text-gray-300 mb-8">
          Signup, solve problems in a Monaco editor, run tests instantly, and track submission history.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="btn-accent px-4 py-2 rounded">
            Get Started
          </Link>
          <Link href="/login" className="px-4 py-2 rounded border border-white/20 hover:border-white/40">
            Login
          </Link>
          <Link href="/problems" className="px-4 py-2 rounded border border-white/20 hover:border-white/40">
            Browse Problems
          </Link>
        </div>
      </section>
    </main>
  );
}
