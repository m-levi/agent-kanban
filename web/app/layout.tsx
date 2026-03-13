import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Kanban",
  description: "AI-powered task board with agent chat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
