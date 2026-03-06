"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/src/firebase/firebase";
import Link from "next/link";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleReset = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      setStatus("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      setStatus(err.message || "Error sending reset email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-8 rounded-lg w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-4 rounded bg-gray-800"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleReset}
          className="w-full bg-blue-600 p-2 rounded hover:bg-blue-700"
        >
          Send Reset Email
        </button>

        {status && <p className="mt-4 text-sm text-gray-300">{status}</p>}

        <p className="text-sm mt-4 text-center">
          Remembered? <Link href="/login" className="text-green-400">Login</Link>
        </p>
      </div>
    </div>
  );
}
