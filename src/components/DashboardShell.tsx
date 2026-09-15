"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Building2,
  CalendarCheck,
  CreditCard,
  DoorOpen,
  Flag,
  History,
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
import { cn } from "@/lib/utils";

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

const TENANT_ITEMS: Item[] = [
  { href: "/tenant", label: "dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "bookings", icon: CalendarCheck },
  { href: "/kost", label: "explore", icon: Building2 },
];

export default function DashboardShell({
  role,
  children,
}: {
  role: "owner" | "admin" | "tenant";
  children: React.ReactNode;
}) {
  const t = useTranslations(role === "owner" ? "owner.nav" : role === "admin" ? "admin.nav" : "tenant.nav");
  const navT = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // NOTE: guard sesi/admin untuk sementara DILEPAS atas permintaan user —
  // halaman dashboard bisa diakses langsung via URL tanpa login.
  // (useEffect redirect role + skeleton gate dihapus; lihat git history 3cfa87d)

  const items = role === "owner" ? OWNER_ITEMS : role === "admin" ? ADMIN_ITEMS : TENANT_ITEMS;
  const isActive = (href: string) =>
    href === "/owner" || href === "/admin" || href === "/admin/verification" || href === "/tenant"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const userName =
    user?.name ??
    (role === "owner" ? "Ratri Wulandari" : role === "admin" ? "Bayu Pratama" : "I made Sudiarta");
  const initial = userName.trim().charAt(0).toUpperCase();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleLabel =
    role === "owner" ? navT("dashboard") : role === "admin" ? navT("adminPanel") : navT("tenantPanel");

  // breadcrumb: halaman aktif = item nav dengan prefix paling spesifik
  const currentItem = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
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
          {role === "admin" ? (
            ADMIN_GROUPS.map((g, gi) => (
              <SidebarGroup key={g.groupKey ?? `g-${gi}`}>
                {g.groupKey && (
                  <SidebarGroupLabel>{navT(`adminGroups.${g.groupKey}`)}</SidebarGroupLabel>
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
            ))
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

            {/* bell notifikasi — owner & tenant (dataset milik owner; tenant fallback link /tenant) */}
            {role !== "admin" && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="relative flex size-9 items-center justify-center rounded-full border border-nk-border bg-nk-surface text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-accent"
                aria-label={navT("notifications")}
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#9C3B32] font-mono text-[9px] font-semibold leading-none text-white">
                    {unreadCount}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
                  <span>{navT("notifications")}</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-nk-warm px-1.5 py-0.5 font-mono text-[10px] text-nk-text-muted">
                      {unreadCount}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="m-0" />
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 6).map((n) => (
                    <DropdownMenuItem key={n.id} asChild className="cursor-pointer p-0 focus:bg-nk-warm">
                      <Link
                        href={n.linkUrl ?? (role === "tenant" ? "/tenant" : "/owner")}
                        className="flex w-full flex-col items-start gap-0.5 border-b border-nk-border px-3 py-2.5 last:border-b-0"
                      >
                        <span className="flex w-full items-center gap-2">
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              n.read ? "bg-nk-border" : "bg-[#2F6B3C]"
                            )}
                          />
                          <span
                            className={cn(
                              "truncate text-sm",
                              n.read ? "text-nk-text-muted" : "font-medium text-nk-text"
                            )}
                          >
                            {n.title}
                          </span>
                        </span>
                        <span className="line-clamp-1 pl-3.5 text-xs text-nk-text-muted">{n.body}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator className="m-0" />
                <DropdownMenuItem asChild className="cursor-pointer focus:bg-nk-warm">
                  <Link href="/owner/notifications" className="w-full py-2.5 text-center text-sm text-nk-accent">
                    {navT("notifications")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}

            {/* avatar menu (shadcn Avatar) */}
            <div className="relative">
              <button
                type="button"
                aria-label={userName}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                <Avatar size="sm">
                  <AvatarImage
                    src={`https://picsum.photos/seed/user-${(user?.email ?? "admin").split("@")[0]}/64/64`}
                    alt=""
                  />
                  <AvatarFallback className="bg-nk-accent font-medium text-nk-text-inverse">
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
