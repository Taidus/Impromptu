import type { Metadata } from "next";
import { StagePage } from "@/components/stage/StagePage";

export const metadata: Metadata = { title: "Challenge" };

// The Challenge Stage (Story 3.9): a dedicated lilac page with no global
// navigation, footer, setup controls, or signup (FR-30, FR-32). All
// behavior lives in the client component -- this stays a server component
// so it can export `metadata`.
export default function Page() {
  return <StagePage />;
}
