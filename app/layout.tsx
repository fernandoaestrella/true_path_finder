import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "True Path Finder - Goal Achievement Through Community Wisdom",
  description: "Discover what works by trying methods, sharing honest reviews, and connecting through structured events. 21 minutes daily keeps you focused on doing.",
  keywords: ["goals", "productivity", "self-improvement", "community", "reviews", "methods"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
