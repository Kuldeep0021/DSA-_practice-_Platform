import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBB509ao795Kc5mveycGaIVYMeiSPXAPbI",
  authDomain: "dsa-verse-28fd7.firebaseapp.com",
  projectId: "dsa-verse-28fd7",
  storageBucket: "dsa-verse-28fd7.firebasestorage.app",
  messagingSenderId: "374871157654",
  appId: "1:374871157654:web:5b76b7535812cb4fe80bb7",
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

export const auth = getAuth(app);
export const firestore = getFirestore(app);