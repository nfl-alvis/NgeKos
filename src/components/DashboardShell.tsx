"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  DoorClosed,
  DoorOpen,
  FileText,
  Flag,
  Heart,
  History,
  Home,
  Images,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  TrendingUp,
  Undo2,
  User,
  UserCog,
  Users,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSession } from "@/components/SessionProvider";
import { notifications } from "@/lib/data/entities";
import type { NotificationItem } from "@/lib/data/types";
import { cn } from "@/lib/utils";

function formatNotifTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}j lalu`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays}h lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

type Item = { href: string; label: string; icon: React.ComponentType };

const OWNER_ITEMS: Item[] = [
  { href: "/owner", label: "dashboard", icon: LayoutDashboard },
  { href: "/owner/properties", label: "properties", icon: Building2 },
  { href: "/owner/bookings", label: "bookings", icon: CalendarCheck },
  { href: "/owner/tenants", label: "tenants", icon: Users },
  { href: "/owner/invoices", label: "invoices", icon: Receipt },
  { href: "/owner/messages", label: "messages", icon: MessageSquare },
  { href: "/owner/notifications", label: "notifications", icon: Bell },
  { href: "/owner/subscription", label: "subscription", icon: CreditCard },
  { href: "/owner/settings", label: "settings", icon: Settings },
];

const ADMIN_GROUPS: { groupKey?: string; items: Item[] }[] = [
  { items: [
    { href: "/admin", label: "dashboard", icon: LayoutDashboard },
  ]},
  { groupKey: "operations", items: [
    { href: "/admin/verification", label: "verification", icon: ShieldCheck },
    { href: "/admin/verification/history", label: "history", icon: History },
    { href: "/admin/properties", label: "properties", icon: Building2 },
    { href: "/admin/rooms", label: "rooms", icon: DoorOpen },
  ]},
  { groupKey: "people", items: [
    { href: "/admin/owners", label: "owners", icon: UserCog },
    { href: "/admin/users", label: "users", icon: Users },
  ]},
  { groupKey: "money", items: [
    { href: "/admin/bookings", label: "bookings", icon: CalendarCheck },
    { href: "/admin/payments", label: "payments", icon: CreditCard },
    { href: "/admin/refunds", label: "refunds", icon: Undo2 },
    { href: "/admin/finance", label: "finance", icon: TrendingUp },
  ]},
  { groupKey: "moderation", items: [
    { href: "/admin/reports", label: "reports", icon: Flag },
    { href: "/admin/reviews", label: "reviews", icon: Star },
  ]},
  { groupKey: "platform", items: [
    { href: "/admin/content", label: "content", icon: Images },
    { href: "/admin/notices", label: "notices", icon: Megaphone },
    { href: "/admin/admins", label: "admins", icon: Shield },
    { href: "/admin/audit", label: "audit", icon: History },
  ]},
];

const ADMIN_ITEMS: Item[] = ADMIN_GROUPS.flatMap((g) => g.items);

/* ===== user biasa (pencari/penyewa kos) - aktivitas mencari & booking ===== */

const USER_GROUPS: { groupKey?: string; items: Item[] }[] = [
  { items: [
    { href: "/dashboard", label: "dashboard", icon: LayoutDashboard },
  ]},
  { groupKey: "booking", items: [
    { href: "/dashboard/bookings", label: "bookings", icon: CalendarCheck },
    { href: "/dashboard/messages", label: "messages", icon: MessageSquare },
    { href: "/dashboard/payments", label: "payments", icon: CreditCard },
    { href: "/dashboard/favorites", label: "favorites", icon: Heart },
    { href: "/dashboard/reviews", label: "reviews", icon: Star },
  ]},
  { groupKey: "account", items: [
    { href: "/dashboard/profile", label: "profile", icon: User },
    { href: "/dashboard/settings", label: "settings", icon: Settings },
  ]},
];

const USER_ITEMS: Item[] = USER_GROUPS.flatMap((g) => g.items);

/* ===== tenant - aktivitas selama tinggal di kos ===== */

const TENANT_GROUPS: { groupKey?: string; items: Item[] }[] = [
  { items: [
    { href: "/tenant/dashboard", label: "dashboard", icon: LayoutDashboard },
  ]},
  { groupKey: "myKost", items: [
    { href: "/tenant/property", label: "property", icon: Building2 },
    { href: "/tenant/room", label: "room", icon: DoorClosed },
    { href: "/tenant/contract", label: "contract", icon: FileText },
  ]},
  { groupKey: "billing", items: [
    { href: "/tenant/bills", label: "bills", icon: Receipt },
    { href: "/tenant/payments", label: "payments", icon: CreditCard },
  ]},
  { groupKey: "staying", items: [
    { href: "/tenant/complaints", label: "complaints", icon: ClipboardList },
    { href: "/tenant/announcements", label: "announcements", icon: Megaphone },
  ]},
  { groupKey: "account", items: [
    // akun tetap punya dashboard user biasa (booking, favorit, dsb.)
    { href: "/dashboard", label: "account", icon: Home },
  ]},
];

const TENANT_ITEMS: Item[] = TENANT_GROUPS.flatMap((g) => g.items);

export default function DashboardShell({
  role,
  children,
}: {
  role: "owner" | "admin" | "tenant" | "user";
  children: React.ReactNode;
}) {
  const t = useTranslations(
    role === "owner"
      ? "owner.nav"
      : role === "admin"
        ? "admin.nav"
        : role === "user"
          ? "userDash.nav"
          : "tenant.nav"
  );
  const navT = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // NOTE: guard sesi/admin untuk sementara DILEPAS atas permintaan user -
  // halaman dashboard bisa diakses langsung via URL tanpa login.
  // (useEffect redirect role + skeleton gate dihapus; lihat git history 3cfa87d)

  const items =
    role === "owner"
      ? OWNER_ITEMS
      : role === "admin"
        ? ADMIN_ITEMS
        : role === "user"
          ? USER_ITEMS
          : TENANT_ITEMS;

  // Halaman aktif = item nav dengan prefix paling spesifik (mencegah tabrakan seperti /admin/verification dan /admin/verification/history)
  const currentItem = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => {
      if (i.href === "/owner" || i.href === "/admin" || i.href === "/tenant/dashboard" || i.href === "/dashboard") {
        return pathname === i.href;
      }
      return pathname === i.href || pathname.startsWith(i.href + "/");
    });
  const isActive = (href: string) => currentItem?.href === href;

  const userName =
    user?.name ??
    (role === "owner"
      ? "Ratri Wulandari"
      : role === "admin"
        ? "Bayu Pratama"
        : "I made Sudiarta");
  const initial = userName.trim().charAt(0).toUpperCase();

  const [notifs, setNotifs] = useState<NotificationItem[]>(notifications);
  const [unreadCount, setUnreadCount] = useState<number>(() =>
    notifications.filter((n) => !n.read).length
  );

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.data) && json.data.length > 0) {
          const mapped: NotificationItem[] = json.data.map((n: any) => ({
            id: n.id,
            type: n.type || "system",
            title: n.title,
            body: n.body,
            linkUrl: n.linkUrl || (role === "admin" ? "/admin" : role === "user" ? "/dashboard" : "/owner"),
            read: Boolean(n.read),
            at: n.at || n.createdAt || new Date().toISOString(),
          }));
          setNotifs(mapped);
          setUnreadCount(mapped.filter((m) => !m.read).length);
        }
      }
    } catch {}
  }, [role]);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
  };

  const handleMarkSingleRead = (id: string, targetUrl: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
    router.push(targetUrl);
  };

  const roleLabel =
    role === "owner"
      ? navT("dashboard")
      : role === "admin"
        ? navT("adminPanel")
        : role === "user"
          ? navT("userPanel")
          : navT("tenantPanel");

  const pageTitle = currentItem ? t(currentItem.label) : null;

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/");
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
            <span className="group-data-[collapsible=icon]:hidden">
              <Logo className="h-7 w-auto text-nk-text" />
            </span>
            <span className="hidden size-8 items-center justify-center rounded-lg bg-nk-accent text-sm font-semibold text-nk-text-inverse group-data-[collapsible=icon]:flex">
              N
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {role !== "owner" ? (
            (role === "admin" ? ADMIN_GROUPS : role === "user" ? USER_GROUPS : TENANT_GROUPS).map(
              (g, gi) => (
                <SidebarGroup key={g.groupKey ?? `g-${gi}`}>
                  {g.groupKey && (
                    <SidebarGroupLabel>
                      {role === "admin"
                        ? navT(`adminGroups.${g.groupKey}`)
                        : t(`groups.${g.groupKey}`)}
                    </SidebarGroupLabel>
                  )}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {g.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(item.href)}
                            tooltip={t(item.label)}
                            className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span>{t(item.label)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )
            )
          ) : (
          <SidebarGroup>
            <SidebarGroupLabel>{roleLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={t(item.label)}
                      className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.label)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* header ala shadcn-admin: trigger + breadcrumb + switcher + avatar menu */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 rounded-t-xl border-b border-nk-border bg-nk-bg/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          {/* breadcrumb (shadcn Breadcrumb) */}
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="min-w-0">
              <BreadcrumbItem>
                <span className="text-nk-text-muted">{roleLabel}</span>
              </BreadcrumbItem>
              {pageTitle && pageTitle !== roleLabel && (
                <>
                  <BreadcrumbSeparator className="hidden sm:flex" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate font-medium text-nk-text">
                      {pageTitle}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />

            {/* bell notifikasi untuk semua role (admin, owner, tenant, user) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-nk-border bg-nk-surface text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-accent"
                aria-label={navT("notifications")}
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#9C3B32] font-mono text-[9px] font-semibold leading-none text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border border-nk-border">
                <DropdownMenuLabel className="flex items-center justify-between px-3.5 py-2.5 border-b border-nk-border bg-nk-warm/30">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-nk-text">{navT("notifications")}</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-nk-accent/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-nk-accent">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs font-medium text-nk-accent hover:underline cursor-pointer"
                    >
                      Tandai semua dibaca
                    </button>
                  )}
                </DropdownMenuLabel>
                <div className="max-h-80 overflow-y-auto divide-y divide-nk-border">
                  {notifs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-nk-text-muted">
                      Tidak ada notifikasi saat ini
                    </div>
                  ) : (
                    notifs.slice(0, 8).map((n) => {
                      const targetUrl =
                        n.linkUrl ??
                        (role === "admin"
                          ? "/admin"
                          : role === "tenant"
                          ? "/tenant/dashboard"
                          : role === "user"
                          ? "/dashboard"
                          : "/owner");

                      return (
                        <DropdownMenuItem
                          key={n.id}
                          asChild
                          className="cursor-pointer p-0 focus:bg-nk-warm"
                          onClick={() => handleMarkSingleRead(n.id, targetUrl)}
                        >
                          <Link
                            href={targetUrl}
                            className={cn(
                              "flex w-full flex-col items-start gap-1 p-3 transition-colors",
                              !n.read ? "bg-nk-warm/40 hover:bg-nk-warm/70" : "hover:bg-nk-warm/40"
                            )}
                          >
                            <div className="flex w-full items-center justify-between gap-2">
                              <span className="flex items-center gap-2 min-w-0">
                                <span
                                  className={cn(
                                    "size-2 shrink-0 rounded-full",
                                    n.read ? "bg-nk-border" : "bg-[#2F6B3C]"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "truncate text-xs",
                                    n.read ? "text-nk-text-muted font-normal" : "font-semibold text-nk-text"
                                  )}
                                >
                                  {n.title}
                                </span>
                              </span>
                              <span className="shrink-0 text-[10px] text-nk-text-muted">
                                {formatNotifTime(n.at)}
                              </span>
                            </div>
                            <span className="line-clamp-2 pl-4 text-[11px] leading-relaxed text-nk-text-muted">
                              {n.body}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </div>
                <DropdownMenuSeparator className="m-0" />
                <DropdownMenuItem asChild className="cursor-pointer focus:bg-nk-warm p-0">
                  <Link
                    href={
                      role === "owner"
                        ? "/owner/notifications"
                        : role === "admin"
                        ? "/admin/notices"
                        : role === "tenant"
                        ? "/tenant/dashboard"
                        : "/dashboard"
                    }
                    className="block w-full py-2.5 text-center text-xs font-medium text-nk-accent hover:underline"
                  >
                    Lihat Semua Notifikasi
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* avatar menu (shadcn Avatar) - ukuran & posisi persis serasi dengan bell notifikasi */}
            <div className="relative flex items-center">
              <button
                type="button"
                aria-label={userName}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-nk-border bg-nk-surface transition-transform hover:scale-105 hover:border-nk-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-accent overflow-hidden"
              >
                <Avatar className="size-full">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=024936&textColor=ffffff`}
                    alt={userName}
                    className="size-full object-cover"
                  />
                  <AvatarFallback className="bg-nk-accent text-xs font-semibold text-nk-text-inverse">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </button>

              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup menu"
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-30 cursor-default"
                  />
                  <div className="absolute right-0 top-10 z-40 w-56 rounded-lg border border-nk-border bg-nk-surface p-1 shadow-lg">
                    <div className="border-b border-nk-border px-3 py-2">
                      <p className="truncate text-sm font-medium text-nk-text">{userName}</p>
                      <p className="text-xs text-nk-text-muted">{roleLabel}</p>
                    </div>
                    <div className="p-1">
                      <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm text-nk-text transition-colors hover:bg-nk-warm"
                      >
                        {navT("home")}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#9C3B32] transition-colors hover:bg-[#FAEAE8]"
                      >
                        {navT("logout")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 lg:px-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
