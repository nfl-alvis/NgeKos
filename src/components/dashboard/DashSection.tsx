"use client";

/** wrapper band-card untuk section /dashboard* (pola sama dgn AdminSection) */
export function DashSection({
  title,
  right,
  tint = "bg-nk-section",
  bodyClass = "p-0",
  id,
  children,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  tint?: string;
  bodyClass?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 ${tint}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
        <h2 className="text-sm font-semibold text-nk-text">{title}</h2>
        {right}
      </div>
      <div className={`flex-1 rounded-lg bg-nk-surface ring-1 ring-foreground/10 ${bodyClass}`}>
        {children}
      </div>
    </section>
  );
}
