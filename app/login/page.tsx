"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../src/firebase/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-8 rounded-lg w-80">
        <h1 className="text-2xl font-bold mb-4 text-center">Login 🚀</h1>

        <input
          type="email"
          placeholder="Email"
          className="mb-3 p-2 w-full bg-gray-800 border border-gray-600 rounded text-white"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-4 p-2 w-full bg-gray-800 border border-gray-600 rounded text-white"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="bg-green-600 w-full py-2 rounded hover:bg-green-700"
        >
          Login
        </button>

        <p className="text-sm text-center mt-4">
          Don't have account?{" "}
          <Link href="/signup" className="text-green-400">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}