"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { RabbitLoader } from "@/components/branding/RabbitGuide";

// Sessions live in localStorage, so the explorer renders on the client only.
const ExploreView = dynamic(
  () => import("@/components/exploration/ExploreView").then((m) => m.ExploreView),
  { ssr: false, loading: () => <RabbitLoader message="Finding your trail…" /> },
);

export function ExploreClient() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <ExploreView key={sessionId} sessionId={sessionId} />;
}
