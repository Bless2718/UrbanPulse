import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UrbanPulse",
  description: "Urban accident risk intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
