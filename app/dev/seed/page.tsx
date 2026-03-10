"use client";

import { useState } from "react";
import Navbar from "@/src/components/Navbar";
import { getErrorMessage } from "@/src/utils/errors";

export default function SeedPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    setStatus("Seeding problems...");

    try {
      const response = await fetch("/api/seed", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        created?: number;
        skipped?: number;
        totalSamples?: number;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Failed to seed problems.");
      }

      const message = payload.message || "Seeding complete.";
      if (
        typeof payload.created === "number" &&
        typeof payload.skipped === "number" &&
        typeof payload.totalSamples === "number"
      ) {
        setStatus(
          `${message} Added ${payload.created}, skipped ${payload.skipped}, total samples ${payload.totalSamples}.`
        );
      } else {
        setStatus(message);
      }
    } catch (err: unknown) {
      setStatus(getErrorMessage(err, "Failed to seed problems."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Dev Seed - Firestore</h1>
        <p className="mb-4 text-gray-400">
          Seed sample problems from the server using Firebase Admin credentials.
        </p>

        <button
          type="button"
          onClick={handleSeed}
          disabled={loading}
          className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 disabled:opacity-70"
        >
          {loading ? "Seeding..." : "Seed Problems"}
        </button>

        {status && <p className="mt-4 text-sm text-gray-300">{status}</p>}
      </div>
    </>
  );
}
