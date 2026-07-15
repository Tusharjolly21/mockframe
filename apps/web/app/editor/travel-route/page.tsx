"use client";

import dynamic from "next/dynamic";

const TravelRouteEditor = dynamic(
  () => import("@/features/travel-route/components/TravelRouteEditor"),
  { ssr: false }
);

export default function TravelRoutePage() {
  return <TravelRouteEditor />;
}
