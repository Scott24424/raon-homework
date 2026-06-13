import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raon Kwon's Homework",
  description: "Weekly homework tracker for Raon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
