import type { Metadata } from "next";
import { PracticeClient } from "@/components/practice/PracticeClient";

export const metadata: Metadata = { title: "Practice" };

// Metadata cannot come from a Client Component: this stays a thin Server
// Component so /practice keeps its static prerender (check:static).
export default function PracticePage() {
  return <PracticeClient />;
}
