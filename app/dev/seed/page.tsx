"use client";

import { useState } from "react";
import { addDoc, collection, getDocs, query } from "firebase/firestore";
import { firestore } from "@/src/firebase/firebase";
import Navbar from "@/src/components/Navbar";

export default function SeedPage() {
  const [status, setStatus] = useState<string | null>(null);

  const samples = [
    {
      title: "Two Sum",
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      difficulty: "Easy",
      tags: ["array", "hashmap"],
    },
    {
      title: "Reverse String",
      description: "Write a function that reverses a string.",
      difficulty: "Easy",
      tags: ["string"],
    },
    {
      title: "Palindrome Number",
      description: "Given an integer x, return true if x is a palindrome.",
      difficulty: "Easy",
      tags: ["math"],
    },
    {
      title: "Merge Two Sorted Lists",
      description: "Merge two sorted linked lists and return it as a sorted list.",
      difficulty: "Easy",
      tags: ["linked-list"],
    },
  ];

  const handleSeed = async () => {
    setStatus("Seeding...");
    try {
      const existing = await getDocs(query(collection(firestore, "problems")));
      if (!existing.empty) {
        setStatus("Collection already has documents — aborting to avoid duplicates.");
        return;
      }

      for (const s of samples) {
        await addDoc(collection(firestore, "problems"), {
          ...s,
          createdAt: new Date().toISOString(),
        });
      }

      setStatus("Seeding complete — problems added to Firestore.");
    } catch (err: any) {
      setStatus("Error: " + err.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Dev Seed — Firestore</h1>
        <p className="mb-4 text-gray-400">Use this page in development to seed sample problems into Firestore.</p>

        <button
          onClick={handleSeed}
          className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
        >
          Seed Problems
        </button>

        {status && <p className="mt-4 text-sm text-gray-300">{status}</p>}
      </div>
    </>
  );
}
