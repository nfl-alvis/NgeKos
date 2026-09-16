"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import { useSession } from "@/components/SessionProvider";
import AuthPopupForm from "@/components/AuthPopupForm";

export default function Navbar() {
  const t = useTranslations("nav");
  const loginT = useTranslations("login");
  const { user, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [roleOpen, setRoleOpen] = useState(false);
  const [authRole, setAuthRole] = useState<"seeker" | "owner" | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const initial = user ? user.name.trim().charAt(0).toUpperCase() : "";

  const handleLogout = () => {
    setAvatarOpen(false);
    logout();
    router.push("/");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navLinks = [
    { href: "/kost", label: t("listings") },
    { href: "/about", label: t("about") },
  ];

  const goRole = (role: "seeker" | "owner") => setAuthRole(role);

  const closeRole = () => {
    setRoleOpen(false);
    setAuthRole(null);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-nk-border bg-nk-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Logo className="h-8 w-auto text-nk-text" href="/" />

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                isActive(l.href)
                  ? "text-sm font-medium text-nk-text"
                  : "text-sm text-nk-text-muted transition-colors hover:text-nk-text"
              }
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <LanguageSwitcher />
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarOpen((v) => !v)}
                aria-label={user.name}
                aria-expanded={avatarOpen}
                className="flex size-9 items-center justify-center rounded-full bg-nk-accent text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90"
              >
                {initial}
              </button>
              {avatarOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAvatarOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-nk-border bg-nk-surface py-1 shadow-xl">
                    <div className="border-b border-nk-border px-4 py-3">
                      <p className="truncate text-sm font-medium text-nk-text">{user.name}</p>
                      <p className="truncate text-xs text-nk-text-muted">{user.email}</p>
                    </div>
                    <Link
                      href={
                        user.role === "owner"
                          ? "/owner"
                          : user.role === "admin"
                            ? "/admin"
                            : "/dashboard"
                      }
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2.5 text-sm text-nk-text transition-colors hover:bg-nk-warm"
                    >
                      {user.role === "owner"
                        ? t("dashboard")
                        : user.role === "admin"
                          ? t("adminPanel")
                          : t("userPanel")}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full px-4 py-2.5 text-left text-sm text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-nk-text"
                    >
                      {t("logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
          <button
            type="button"
            onClick={() => {
              setAuthRole(null);
              setRoleOpen(true);
            }}
            className="inline-flex items-center bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            {t("login")}
          </button>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            aria-label={t("menu")}
            className="flex flex-col gap-1.5 p-2"
          >
            <span className="h-[2px] w-5 rounded-full bg-nk-text-muted"></span>
            <span className="h-[2px] w-5 rounded-full bg-nk-text-muted"></span>
            <span className="h-[2px] w-5 rounded-full bg-nk-text-muted"></span>
          </button>
        </div>
      </div>

      </nav>

      {/* Role picker modal — must live OUTSIDE <nav>: backdrop-filter on the
          nav creates a containing block that breaks position:fixed, pinning
          the modal to the nav's box (top of page) instead of the viewport. */}
      {roleOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-nk-dark/40 p-4 backdrop-blur-sm"
          onClick={closeRole}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-nk-border bg-nk-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-medium tracking-tight text-nk-text">
                {authRole ? loginT("title") : loginT("roleTitle")}
              </h2>
              <button
                type="button"
                aria-label={loginT("cancel")}
                onClick={closeRole}
                className="text-nk-text-muted transition-colors hover:text-nk-text"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {authRole ? (
              <div className="mt-4">
                <AuthPopupForm
                  role={authRole}
                  onClose={closeRole}
                  onSuccess={() => {
                    const dest = authRole === "owner" ? "/owner" : "/dashboard";
                    closeRole();
                    router.push(dest);
                  }}
                />
              </div>
            ) : (
            <>
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => goRole("seeker")}
                className="group flex w-full items-center gap-3 rounded-lg border border-nk-border bg-nk-bg px-4 py-4 text-left transition-colors hover:border-nk-accent"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nk-accent/10 text-nk-accent">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-nk-text">
                    {loginT("roleSeeker")}
                  </span>
                  <span className="text-xs text-nk-text-muted">
                    {loginT("roleSeekerDesc")}
                  </span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-nk-text-muted transition-colors group-hover:text-nk-accent" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => goRole("owner")}
                className="group flex w-full items-center gap-3 rounded-lg border border-nk-border bg-nk-bg px-4 py-4 text-left transition-colors hover:border-nk-accent"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nk-accent/10 text-nk-accent">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-nk-text">
                    {loginT("roleOwner")}
                  </span>
                  <span className="text-xs text-nk-text-muted">
                    {loginT("roleOwnerDesc")}
                  </span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-nk-text-muted transition-colors group-hover:text-nk-accent" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={closeRole}
              className="mt-4 w-full text-center text-sm text-nk-text-muted transition-colors hover:text-nk-text"
            >
              {loginT("cancel")}
            </button>
            </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
