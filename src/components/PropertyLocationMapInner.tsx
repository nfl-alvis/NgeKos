"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink } from "lucide-react";

export interface PropertyLocationMapProps {
  lat?: number | null;
  lng?: number | null;
  propertyName: string;
  address: string;
  city?: string;
  district?: string;
  className?: string;
}

const customMarkerIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `
    <div style="position: relative; width: 34px; height: 34px; transform: translate(-50%, -100%); cursor: pointer;">
      <div style="position: absolute; bottom: 0; left: 50%; width: 14px; height: 5px; background: rgba(0,0,0,0.3); border-radius: 50%; transform: translateX(-50%); filter: blur(1px);"></div>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3A2618" stroke="#ffffff" stroke-width="1.8"/>
        <circle cx="12" cy="9" r="3" fill="#ffffff"/>
      </svg>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

export default function PropertyLocationMapInner({
  lat,
  lng,
  propertyName,
  address,
  city = "Malang",
  district = "",
  className = "h-[280px] sm:h-[320px] w-full",
}: PropertyLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const resolvedLat = typeof lat === "number" && lat !== 0 ? lat : /surabaya/i.test(city) ? -7.2575 : -7.9806;
  const resolvedLng = typeof lng === "number" && lng !== 0 ? lng : /surabaya/i.test(city) ? 112.7521 : 112.6189;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${propertyName}, ${address}`
  )}`;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [resolvedLat, resolvedLng],
      zoom: 16,
      zoomControl: false,
      scrollWheelZoom: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([resolvedLat, resolvedLng], {
      icon: customMarkerIcon,
    }).addTo(map);

    const popupContent = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
        <strong style="color: #1c1917; font-size: 13px; display: block; margin-bottom: 2px;">${propertyName}</strong>
        <span style="color: #78716c; font-size: 11px;">${address}</span>
      </div>
    `;
    marker.bindPopup(popupContent);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [resolvedLat, resolvedLng, propertyName, address]);

  return (
    <div className="relative overflow-hidden border border-nk-border bg-stone-100">
      <div ref={mapContainerRef} className={className} />

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 z-[1000] inline-flex items-center gap-1.5 border border-nk-border/80 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-nk-text shadow-sm backdrop-blur transition-colors hover:border-nk-accent hover:text-nk-accent"
      >
        <span>Buka di Google Maps</span>
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
