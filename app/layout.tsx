import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./sidebar";

export const metadata: Metadata = {
  title: "Farm Intelligence",
  description: "Cloud-based farm management and analytics platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">
      <Sidebar />
<main className="p-4 pt-16 md:mr-56 md:p-6">{children}</main>
      </body>
    </html>
  );
}
