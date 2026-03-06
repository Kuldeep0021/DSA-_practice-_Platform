"use client";

import { useEffect, useState } from "react";
import { auth } from "../../src/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "../../src/components/Navbar";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setUserEmail(user.email);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Checking authentication...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">
          Welcome to Dashboard 🚀
        </h1>
        <p>Logged in as: {userEmail}</p>
      </div>
    </>
  );
}