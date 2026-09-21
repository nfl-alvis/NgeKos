"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ban, CheckCircle2, Clock, Search, UserCog } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ellipsis } from "lucide-react";
import AdminPageShell, { AdminSection, AdminStat, useAdminToast } from "@/components/admin/AdminPageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/components/SessionProvider";
import { formatReviewDate } from "@/lib/adminReviewStore";
import { ownerStatus, recordOp, useAdminOps } from "@/lib/adminOpsStore";
import { ownerAccounts } from "@/lib/data/adminData";

type Filter = "all" | "aktif" | "ditangguhkan" | "menunggu";

/** Kelola akun pemilik kos: tangguhkan / aktifkan kembali. */
export default function AdminOwnersPage() {
  const t = useTranslations("admin.owners");
  const locale = useLocale();
  const { show } = useAdminToast();
  const { user } = useSession();
  const ops = useAdminOps();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [ownersList, setOwnersList] = useState<any[]>(ownerAccounts);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          const owners = json.data
            .filter((u: any) => u.role === "OWNER")
            .map((u: any) => ({
              id: u.id,
              name: u.fullName || u.email.split("@")[0],
              email: u.email,
              phone: u.phone || "-",
              city: "Indonesia",
              propertyCount: u._count?.properties ?? 0,
              status: u.status === "ACTIVE" ? "aktif" : u.status === "SUSPENDED" ? "ditangguhkan" : "menunggu",
              joinedAt: typeof u.createdAt === "string" ? u.createdAt.slice(0, 10) : "2026-09-01",
            }));
          if (owners.length > 0) {
            setOwnersList(owners);
          }
        }
      })
      .catch(() => {});
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ownersList
      .map((o) => ({ o, st: ownerStatus(ops, o.id, o.status) }))
      .filter((r) => (filter === "all" ? true : r.st === filter))
      .filter((r) =>
        q ? `${r.o.name} ${r.o.email} ${r.o.city}`.toLowerCase().includes(q) : true
      );
  }, [ops, search, filter, ownersList]);

  const counts = useMemo(() => {
    const all = ownersList.map((o) => ownerStatus(ops, o.id, o.status));
    return {
      aktif: all.filter((s) => s === "aktif").length,
      ditangguhkan: all.filter((s) => s === "ditangguhkan").length,
      menunggu: all.filter((s) => s === "menunggu").length,
    };
  }, [ops, ownersList]);

  const toggle = async (id: string, name: string, next: "suspend" | "reactivate") => {
    recordOp(id, next, user?.email, name);
    show(next === "suspend" ? t("toastSuspended", { name }) : t("toastReactivated", { name }));
    setOwnersList((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: next === "suspend" ? "ditangguhkan" : "aktif" } : o))
    );

    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next === "suspend" ? "SUSPENDED" : "ACTIVE",
        }),
      });
    } catch {
      // fallback
    }
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStat label={t("statActive")} value={String(counts.aktif)} icon={CheckCircle2} tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }} note={t("statActiveNote")} />
        <AdminStat label={t("statSuspended")} value={String(counts.ditangguhkan)} icon={Ban} tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }} note={t("statSuspendedNote")} />
        <AdminStat label={t("statPending")} value={String(counts.menunggu)} icon={Clock} tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }} note={t("statPendingNote")} />
      </div>

      <AdminSection
        title={t("listTitle")}
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nk-text-muted" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 pl-9 md:h-9 md:w-60"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="h-11 w-44 md:h-9" aria-label={t("filterLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                <SelectItem value="aktif">{t("filterActive")}</SelectItem>
                <SelectItem value="ditangguhkan">{t("filterSuspended")}</SelectItem>
                <SelectItem value="menunggu">{t("filterPending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        bodyClass="overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("colOwner")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colCity")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colProperties")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colTier")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colJoined")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                <TableHead className="w-10 px-2 py-3"><span className="sr-only">{t("colAction")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ o, st }) => (
                <TableRow key={o.id} className="border-b border-nk-border last:border-b-0">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-nk-warm text-xs font-semibold text-nk-text-muted">
                          {o.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-nk-text">{o.name}</p>
                        <p className="truncate text-xs text-nk-text-muted">{o.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-nk-text-muted">{o.city}</TableCell>
                  <TableCell className="px-4 py-3 tabular-nums text-nk-text">{o.propertyCount}</TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge color={o.tier === "premium" ? "blue" : "gray"}>{t(`tier${o.tier.charAt(0).toUpperCase()}${o.tier.slice(1)}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-nk-text-muted">{formatReviewDate(o.joinedAt, locale)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge color={st === "aktif" ? "green" : st === "ditangguhkan" ? "red" : "yellow"}>
                      {t(`st${st === "aktif" ? "Active" : st === "ditangguhkan" ? "Suspended" : "Pending"}`)}
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
                        {st !== "ditangguhkan" ? (
                          <DropdownMenuItem className="flex items-center gap-2 text-[#9C3B32] focus:bg-[#FAEAE8] focus:text-[#9C3B32]" onSelect={() => toggle(o.id, o.name, "suspend")}>
                            <Ban className="size-4" aria-hidden="true" />
                            {t("actSuspend")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="flex items-center gap-2" onSelect={() => toggle(o.id, o.name, "reactivate")}>
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            {t("actReactivate")}
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

      <p className="mt-4 flex items-center gap-2 text-xs text-nk-text-muted">
        <UserCog className="size-3.5" aria-hidden="true" />
        {t("suspendHint")}
      </p>
    </AdminPageShell>
  );
}
