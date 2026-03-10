import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DSA Verse - Practice Coding Problems",
  description: "A coding practice platform for data structures and algorithms",
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
