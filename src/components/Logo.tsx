import Image from "next/image";
import { Link } from "@/i18n/navigation";

/**
 * Wordmark NgeKos (logo gambar). Varian putih dipakai di footer gelap.
 */
export default function Logo({
  className = "",
  href = "/",
  variant = "dark",
}: {
  className?: string;
  href?: string;
  variant?: "dark" | "white";
}) {
  return (
    <Link href={href} className={className} aria-label="NgeKos">
      <Image
        src={variant === "white" ? "/assets/logo-white.png" : "/assets/logo.png"}
        alt="NgeKos"
        width={581}
        height={240}
        priority
        className="h-full w-auto"
      />
    </Link>
  );
}
