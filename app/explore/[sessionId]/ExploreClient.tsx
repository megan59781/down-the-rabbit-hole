"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { RabbitLoader } from "@/components/branding/RabbitGuide";

// Sessions live in localStorage, so the explorer renders on the client only.
const FallView = dynamic(
  () => import("@/components/fall/FallView").then((m) => m.FallView),
  { ssr: false, loading: () => <RabbitLoader message="Finding the hole…" /> },
);

export function ExploreClient() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <FallView key={sessionId} sessionId={sessionId} />;
}
