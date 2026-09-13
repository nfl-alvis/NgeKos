"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type BookingRoom = {
  id: string;
  name: string;
  pricePerMonth: number;
  sizeM2: number;
  available: number;
};

export type BookingFlow = {
  slug: string;
  roomId: string;
  roomName: string;
  pricePerMonth: number;
  dpAmount: number;
  months: number;
  date: string; // ISO yyyy-mm-dd
};

type Ctx = {
  flow: BookingFlow | null;
  setFlow: (f: BookingFlow | null) => void;
};

const BookingFlowContext = createContext<Ctx | null>(null);

/**
 * Berbagi state "pengajuan dipilih di popup" antara BookingCta (tombol
 * Sewa Sekarang / Pilih Kamar) dan panel ringkasan di sidebar, tanpa
 * pindah halaman.
 */
export function BookingFlowProvider({ children }: { children: ReactNode }) {
  const [flow, setFlow] = useState<BookingFlow | null>(null);
  return (
    <BookingFlowContext.Provider value={{ flow, setFlow }}>
      {children}
    </BookingFlowContext.Provider>
  );
}

export function useBookingFlow() {
  const ctx = useContext(BookingFlowContext);
  if (!ctx) throw new Error("useBookingFlow must be used inside BookingFlowProvider");
  return ctx;
}
