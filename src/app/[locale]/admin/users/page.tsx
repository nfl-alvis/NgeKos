"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ban, CheckCircle2, Ellipsis, Search, ShieldCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminPageShell, { AdminSection, AdminStat, useAdminToast } from "@/components/admin/AdminPageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/components/SessionProvider";
import { formatReviewDate } from "@/lib/adminReviewStore";
import { recordOp, seekerStatus, useAdminOps } from "@/lib/adminOpsStore";
import { seekerAccounts } from "@/lib/data/adminData";

/** Kelola akun pencari kos: blokir / pulihkan. */
export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const locale = useLocale();
  const { show } = useAdminToast();
  const { user } = useSession();
  const ops = useAdminOps();
  const [search, setSearch] = useState("");
  const [usersList, setUsersList] = useState<any[]>(seekerAccounts);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map((u: any) => ({
            id: u.id,
            name: u.fullName || u.email.split("@")[0],
            email: u.email,
            phone: u.phone || "-",
            city:
              u.role === "SEEKER"
                ? "Pencari Kos"
                : u.role === "OWNER"
                  ? "Pemilik Kos"
                  : "Admin",
            status: u.status === "ACTIVE" ? "aktif" : "diblokir",
            joinedAt:
              typeof u.createdAt === "string"
                ? u.createdAt.slice(0, 10)
                : "2026-09-01",
          }));
          setUsersList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usersList
      .map((u) => ({ u, st: seekerStatus(ops, u.id, u.status) }))
      .filter((r) =>
        q
          ? `${r.u.name} ${r.u.email} ${r.u.city}`.toLowerCase().includes(q)
          : true
      );
  }, [ops, search, usersList]);

  const blocked = rows.filter((r) => r.st === "diblokir").length;

  const toggle = async (id: string, name: string, next: "ban" | "unban") => {
    recordOp(id, next, user?.email, name);
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: next === "ban" ? "diblokir" : "aktif" } : u
      )
    );
    show(
      next === "ban"
        ? t("toastBlocked", { name })
        : t("toastUnblocked", { name })
    );

    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next === "ban" ? "SUSPENDED" : "ACTIVE",
        }),
      });
    } catch {}
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStat label={t("statTotal")} value={String(seekerAccounts.length)} icon={Users} tint={{ card: "bg-nk-section", icon: "bg-nk-warm text-nk-text-muted" }} note={t("statTotalNote")} />
        <AdminStat label={t("statActive")} value={String(seekerAccounts.length - blocked)} icon={CheckCircle2} tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }} />
        <AdminStat label={t("statBlocked")} value={String(blocked)} icon={Ban} tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }} />
      </div>

      <AdminSection
        title={t("listTitle")}
        right={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nk-text-muted" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 pl-9 md:h-9 md:w-64"
            />
          </div>
        }
        bodyClass="overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("colUser")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colCity")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colBookings")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colJoined")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                <TableHead className="w-10 px-2 py-3"><span className="sr-only">{t("colAction")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ u, st }) => (
                <TableRow key={u.id} className="border-b border-nk-border last:border-b-0">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-nk-warm text-xs font-semibold text-nk-text-muted">
                          {u.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-nk-text">{u.name}</p>
                        <p className="truncate text-xs text-nk-text-muted">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-nk-text-muted">{u.city}</TableCell>
                  <TableCell className="px-4 py-3 tabular-nums text-nk-text">{u.bookingCount}</TableCell>
                  <TableCell className="px-4 py-3 text-nk-text-muted">{formatReviewDate(u.joinedAt, locale)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge color={st === "aktif" ? "green" : "red"}>
                      {st === "aktif" ? t("stActive") : t("stBlocked")}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="px-2 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={t("colAction")}
                        className="flex size-8 items-center justify-center rounded-md text-nk-text-muted transition-colors hover:bg-nk-accent-subtle hover:text-nk-text focus-visible:outline-2 focus-visible:outline-nk-accent"
                      >
                        <Ellipsis className="size-4" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {st === "aktif" ? (
                          <DropdownMenuItem className="flex items-center gap-2 text-[#9C3B32] focus:bg-[#FAEAE8] focus:text-[#9C3B32]" onSelect={() => toggle(u.id, u.name, "ban")}>
                            <Ban className="size-4" aria-hidden="true" />
                            {t("actBlock")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="flex items-center gap-2" onSelect={() => toggle(u.id, u.name, "unban")}>
                            <ShieldCheck className="size-4" aria-hidden="true" />
                            {t("actUnblock")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && <p className="p-5 text-sm text-nk-text-muted">{t("empty")}</p>}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}
