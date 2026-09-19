"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { toggleFavorite as toggleStoreFavorite, useUserOps } from "@/lib/userOpsStore";
import { cn } from "@/lib/utils";
import SeekerAuthModal from "@/components/SeekerAuthModal";

interface FavoriteButtonProps {
  propertySlug: string;
  propertyId?: string;
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function FavoriteButton({
  propertySlug,
  propertyId,
  className,
  showText = false,
  size = "md",
}: FavoriteButtonProps) {
  const { user } = useSession();
  const ops = useUserOps();
  const isFav = ops.favorites.includes(propertySlug);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setAuthOpen(true);
      return;
    }

    if (loading) return;
    setLoading(true);

    const willFavorite = !isFav;
    // Optimistic store update
    toggleStoreFavorite(propertySlug);

    try {
      const targetId = propertyId || propertySlug;
      if (willFavorite) {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: targetId }),
        });
      } else {
        await fetch(`/api/favorites/${targetId}`, {
          method: "DELETE",
        });
      }
    } catch {
      // Revert if network failed
      toggleStoreFavorite(propertySlug);
    } finally {
      setLoading(false);
    }
  };

  const iconSizes = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isFav ? "Hapus dari favorit" : "Simpan ke favorit"}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full transition-all duration-200 active:scale-95",
          showText
            ? "border border-nk-border bg-nk-surface px-3.5 py-1.5 text-xs font-medium text-nk-text hover:border-nk-accent hover:text-nk-accent"
            : "size-9 bg-white/90 text-nk-text shadow-sm backdrop-blur-sm hover:bg-white hover:text-red-500",
          isFav && !showText && "text-red-500 hover:text-red-600",
          isFav && showText && "border-red-200 bg-red-50 text-red-600 hover:border-red-300",
          className
        )}
      >
        <Heart
          className={cn(
            iconSizes[size],
            "transition-colors duration-200",
            isFav ? "fill-red-500 text-red-500" : "text-current"
          )}
        />
        {showText && (
          <span>{isFav ? "Tersimpan" : "Simpan"}</span>
        )}
      </button>

      <SeekerAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => setAuthOpen(false)}
      />
    </>
  );
}
