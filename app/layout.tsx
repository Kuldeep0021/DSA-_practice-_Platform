import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DSA Verse - Practice Coding Problems",
  description: "A LeetCode-style platform for practicing data structures and algorithms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
