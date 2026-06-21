import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command",
  description: "Your personal dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
