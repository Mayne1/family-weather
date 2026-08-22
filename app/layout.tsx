import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Weather — Plan Around What Matters",
  description:
    "Choose the best time for your event, understand the weather risks and keep everyone informed.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
