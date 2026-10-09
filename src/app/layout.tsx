import type { Metadata } from "next";
import { bodoniModa, instrumentSans, unbounded } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s · Impromptu", default: "Impromptu" },
  description: "Creative practice challenges",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${bodoniModa.variable} ${unbounded.variable} ${instrumentSans.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
