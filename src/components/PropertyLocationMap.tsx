"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { PropertyLocationMapProps } from "./PropertyLocationMapInner";

const PropertyLocationMapInner = dynamic(
  () => import("./PropertyLocationMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] sm:h-[320px] w-full items-center justify-center border border-nk-border bg-stone-50 text-xs text-nk-text-muted">
        <MapPin className="size-4 animate-bounce text-nk-accent mr-2" />
        <span>Memuat peta lokasi...</span>
      </div>
    ),
  }
);

export default function PropertyLocationMap(props: PropertyLocationMapProps) {
  return <PropertyLocationMapInner {...props} />;
}
