"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ban, Building2, CheckCircle2, Ellipsis, RotateCcw, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminPageShell, { AdminStat, AdminSection, useAdminToast } from "@/components/admin/AdminPageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatIDR } from "@/lib/utils";
import { recordOp, propertyStatus, useAdminOps } from "@/lib/adminOpsStore";
import { useSession } from "@/components/SessionProvider";
import { getKosImage } from "@/lib/kosImages";
import { properties } from "@/lib/data/properties";
import type { Property } from "@/lib/data/types";

type FilterStatus = "all" | "aktif" | "nonaktif" | "dihapus";

export default function AdminPropertiesPage() {
  const t = useTranslations("admin.properties");
  const locale = useLocale();
  const { show } = useAdminToast();
  const { user } = useSession();
  const ops = useAdminOps();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [propertiesList, setPropertiesList] = useState<Property[]>(properties);

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: Property[] = json.data.map((dto: any) => ({
            id: dto.id,
            slug: dto.slug,
            name: dto.name,
            tagline: dto.tagline ?? "",
            description: dto.description,
            city: dto.city,
            district: dto.district,
            address: dto.address,
            gender: dto.gender ? dto.gender.toLowerCase() : "mixed",
            verified: dto.status === "VERIFIED",
            active: dto.status === "VERIFIED",
            rating: dto.rating ?? 0,
            reviewCount: dto.reviewCount ?? 0,
            imageSeed: dto.slug,
            facilities: (dto.facilities || []).map((f: any) => f.key || f),
            minPrice: dto.minPrice ?? 0,
            distanceToCampusM: dto.distanceToCampusM ?? 0,
            depositInfo: dto.depositAmount
              ? `DP Rp ${dto.depositAmount.toLocaleString("id-ID")}`
              : "Tanpa deposit",
            depositAmount: dto.depositAmount,
            verificationStatus:
              dto.status === "VERIFIED"
                ? "verified"
                : dto.status === "REJECTED"
                  ? "rejected"
                  : "pending",
            verificationNote: dto.rejectionNote ?? undefined,
            roomTypes: (dto.roomTypes || []).map((rt: any) => ({
              id: rt.id,
              name: rt.name,
              pricePerMonth: rt.pricePerMonth,
              available: rt.available ?? 0,
              total: rt.total ?? 0,
              sizeM2: rt.sizeM2 ?? 12,
            })),
          }));
          setPropertiesList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return propertiesList
      .map((p) => ({ p, st: propertyStatus(ops, p.slug, p.active) }))
      .filter((r) => (status === "all" ? r.st !== "dihapus" : r.st === status))
      .filter((r) =>
        q ? `${r.p.name} ${r.p.city} ${r.p.slug}`.toLowerCase().includes(q) : true
      );
  }, [ops, search, status, propertiesList]);

  const counts = useMemo(() => {
    const all = propertiesList.map((p) => propertyStatus(ops, p.slug, p.active));
    return {
      aktif: all.filter((s) => s === "aktif").length,
      nonaktif: all.filter((s) => s === "nonaktif").length,
      dihapus: all.filter((s) => s === "dihapus").length,
    };
  }, [ops, propertiesList]);

  const toggle = async (p: Property, next: "enable" | "disable") => {
    recordOp(p.slug, next, user?.email);
    show(next === "disable" ? t("toastDisabled", { name: p.name }) : t("toastEnabled", { name: p.name }));
    setPropertiesList((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, active: next === "enable", verified: next === "enable" } : item))
    );

    try {
      await fetch(`/api/properties/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next === "disable" ? "INACTIVE" : "VERIFIED",
        }),
      });
    } catch {
      // fallback
    }
  };

  const confirmDelete = async () => {
    if (!deleting || reason.trim().length < 10) {
      setReasonError(true);
      return;
    }
    const target = deleting;
    recordOp(target.slug, "delete", user?.email, reason.trim());
    show(t("toastDeleted", { name: target.name }));
    setPropertiesList((prev) => prev.filter((item) => item.id !== target.id));
    setDeleting(null);
    setReason("");
    setReasonError(false);

    try {
      await fetch(`/api/properties/${target.id}`, {
        method: "DELETE",
      });
    } catch {
      // fallback
    }
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStat label={t("statActive")} value={String(counts.aktif)} icon={CheckCircle2} tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }} note={t("statActiveNote")} />
        <AdminStat label={t("statDisabled")} value={String(counts.nonaktif)} icon={Ban} tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }} note={t("statDisabledNote")} />
        <AdminStat label={t("statDeleted")} value={String(counts.dihapus)} icon={Trash2} tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }} note={t("statDeletedNote")} />
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
                className="h-11 pl-9 md:h-9 md:w-64"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as FilterStatus)}>
              <SelectTrigger className="h-11 w-44 md:h-9" aria-label={t("filterLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                <SelectItem value="aktif">{t("filterActive")}</SelectItem>
                <SelectItem value="nonaktif">{t("filterDisabled")}</SelectItem>
                <SelectItem value="dihapus">{t("filterDeleted")}</SelectItem>
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
                <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colCity")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colRooms")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colPrice")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                <TableHead className="w-10 px-2 py-3"><span className="sr-only">{t("colAction")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ p, st }) => {
                const totalRooms = p.roomTypes.reduce((a, r) => a + r.total, 0);
                return (
                  <TableRow key={p.slug} className="border-b border-nk-border last:border-b-0">
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Image
                          src={getKosImage(p.slug || p.imageSeed, "main")}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 shrink-0 rounded-md object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-nk-text">{p.name}</p>
                          <p className="truncate font-mono text-[10px] text-nk-text-muted">{p.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-nk-text-muted">{p.city}</TableCell>
                    <TableCell className="px-4 py-3 tabular-nums text-nk-text">{totalRooms}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text">{formatIDR(p.minPrice)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge color={st === "aktif" ? "green" : st === "nonaktif" ? "yellow" : "red"}>
                        {t(`st${st === "aktif" ? "Active" : st === "nonaktif" ? "Disabled" : "Deleted"}`)}
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
                          <DropdownMenuItem asChild>
                            <Link href={`/kost/${p.slug}`} className="flex items-center gap-2">
                              <Building2 className="size-4" aria-hidden="true" />
                              {t("actView")}
                            </Link>
                          </DropdownMenuItem>
                          {st === "aktif" && (
                            <DropdownMenuItem className="flex items-center gap-2" onSelect={() => toggle(p, "disable")}>
                              <Ban className="size-4" aria-hidden="true" />
                              {t("actDisable")}
                            </DropdownMenuItem>
                          )}
                          {st === "nonaktif" && (
                            <DropdownMenuItem className="flex items-center gap-2" onSelect={() => toggle(p, "enable")}>
                              <RotateCcw className="size-4" aria-hidden="true" />
                              {t("actEnable")}
                            </DropdownMenuItem>
                          )}
                          {st !== "dihapus" && (
                            <DropdownMenuItem
                              className="flex items-center gap-2 text-[#9C3B32] focus:bg-[#FAEAE8] focus:text-[#9C3B32]"
                              onSelect={() => setDeleting(p)}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                              {t("actDelete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="p-5 text-sm text-nk-text-muted">{t("empty")}</p>
          )}
        </div>
      </AdminSection>

      {/* konfirmasi hapus - alasan wajib */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md" key={deleting?.slug ?? "none"}>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteBody", { name: deleting?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="del-reason">{t("deleteReason")}</Label>
            <Textarea
              id="del-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(false);
              }}
              placeholder={t("deleteReasonPlaceholder")}
              rows={3}
              aria-invalid={reasonError}
            />
            {reasonError && <p className="text-xs text-[#9C3B32]">{t("deleteReasonRequired")}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>{t("cancel")}</Button>
            <Button
              className="bg-[#9C3B32] text-white hover:bg-[#7f2f28]"
              onClick={confirmDelete}
            >
              {t("deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
