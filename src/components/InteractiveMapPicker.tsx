"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface InteractiveMapPickerProps {
  lat: number;
  lon: number;
  onChangeLocation: (lat: number, lon: number) => void;
  className?: string;
}

const customMarkerIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `
    <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -100%); cursor: grab;">
      <div style="position: absolute; bottom: 0; left: 50%; width: 14px; height: 5px; background: rgba(0,0,0,0.35); border-radius: 50%; transform: translateX(-50%); filter: blur(1.5px);"></div>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3A2618" stroke="#ffffff" stroke-width="1.8"/>
        <circle cx="12" cy="9" r="3" fill="#ffffff"/>
      </svg>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

export default function InteractiveMapPicker({
  lat,
  lon,
  onChangeLocation,
  className = "h-full w-full",
}: InteractiveMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeLocationRef = useRef(onChangeLocation);
  onChangeLocationRef.current = onChangeLocation;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 16,
      zoomControl: false,
    });

    // Zoom control at bottom-left so it does not collide with search or target button
    L.control.zoom({ position: "bottomleft" }).addTo(map);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([lat, lon], {
      icon: customMarkerIcon,
      draggable: true,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      onChangeLocationRef.current(clickLat, clickLng);
    });

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChangeLocationRef.current(pos.lat, pos.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const currentPos = marker.getLatLng();
    if (
      Math.abs(currentPos.lat - lat) > 0.00001 ||
      Math.abs(currentPos.lng - lon) > 0.00001
    ) {
      marker.setLatLng([lat, lon]);
      map.setView([lat, lon], map.getZoom(), { animate: true });
    }
  }, [lat, lon]);

  return <div ref={mapContainerRef} className={className} />;
}
