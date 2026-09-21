"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Shield, ShieldCheck, UserCog } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminPageShell, { AdminSection, useAdminToast } from "@/components/admin/AdminPageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/components/SessionProvider";
import { adminRoleOverride, recordOp, useAdminOps } from "@/lib/adminOpsStore";
import { adminAccounts as staticAdminAccounts, type AdminRole } from "@/lib/data/adminData";

const ROLES: AdminRole[] = ["super", "verifikator", "keuangan", "dukungan"];

function lastActiveLabel(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/** Kelola akun admin dan role-nya. Hanya super admin yang boleh mengubah role. */
export default function AdminAdminsPage() {
  const t = useTranslations("admin.admins");
  const locale = useLocale();
  const { show } = useAdminToast();
  const { user } = useSession();
  const ops = useAdminOps();
  const [adminList, setAdminList] = useState(staticAdminAccounts);
  const [editing, setEditing] = useState<(typeof staticAdminAccounts)[number] | null>(null);
  const [pendingRole, setPendingRole] = useState<AdminRole | null>(null);

  const myEmail = user?.email;

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const adminsFromDb = json.data.filter((u: any) => u.role === "ADMIN");
          if (adminsFromDb.length > 0) {
            const mapped = adminsFromDb.map((u: any, idx: number) => ({
              id: u.id,
              name: u.fullName || u.email.split("@")[0],
              email: u.email,
              role: (idx === 0 ? "super" : "verifikator") as AdminRole,
              lastActive: u.lastSeenAt || u.createdAt || new Date().toISOString(),
              status: (u.status === "ACTIVE" ? "aktif" : "nonaktif") as "aktif" | "nonaktif",
            }));
            setAdminList(mapped);
          }
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    if (!editing || !pendingRole) return;
    const roleLabel = t(`role${pendingRole.charAt(0).toUpperCase()}${pendingRole.slice(1)}`);
    recordOp(editing.email, "set-role", myEmail, roleLabel);

    if (editing.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editing.id)) {
      try {
        await fetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN" }),
        });
      } catch {
        // ops store fallback already handled
      }
    }

    show(t("toastRole", { name: editing.name, role: roleLabel }));
    setEditing(null);
    setPendingRole(null);
  };

  return (
    <AdminPageShell title={t("title")}>
      <AdminSection title={t("listTitle")} bodyClass="overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("colAdmin")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colRole")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colLastActive")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminList.map((a) => {
                const role = adminRoleOverride(ops, a.email) ?? a.role;
                const isMe = a.email === (myEmail ?? "bayu.pratama@ngekost.id");
                return (
                  <TableRow key={a.id} className="border-b border-nk-border last:border-b-0">
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-nk-warm text-xs font-semibold text-nk-text-muted">
                            {a.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-nk-text">
                            {a.name}
                            {isMe && <span className="ml-1.5 text-xs font-normal text-nk-text-muted">({t("you")})</span>}
                          </p>
                          <p className="truncate text-xs text-nk-text-muted">{a.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge color={role === "super" ? "blue" : "gray"}>
                        <span className="flex items-center gap-1">
                          {role === "super" ? <Shield className="size-3" aria-hidden="true" /> : <ShieldCheck className="size-3" aria-hidden="true" />}
                          {t(`role${role.charAt(0).toUpperCase()}${role.slice(1)}`)}
                        </span>
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted">{lastActiveLabel(a.lastActive, locale)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge color={a.status === "aktif" ? "green" : "gray"}>
                        {a.status === "aktif" ? t("stActive") : t("stInactive")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditing(a)}
                        className="flex h-11 items-center gap-1.5 rounded-md border border-nk-border px-3 text-xs text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent md:h-9"
                      >
                        <UserCog className="size-3.5" aria-hidden="true" />
                        {t("actChangeRole")}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </AdminSection>

      <p className="mt-4 text-xs text-nk-text-muted">{t("roleHint")}</p>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} key={editing?.id ?? "none"}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle", { name: editing?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("dialogBody")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {ROLES.map((r) => {
              const active = (adminRoleOverride(ops, editing?.email ?? "") ?? editing?.role) === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPendingRole(r)}
                  aria-pressed={active || pendingRole === r}
                  className={
                    active || pendingRole === r
                      ? "flex items-center justify-between rounded-lg border border-nk-accent bg-nk-warm px-3 py-2.5 text-left text-sm text-nk-text focus-visible:outline-2 focus-visible:outline-nk-accent"
                      : "flex items-center justify-between rounded-lg border border-nk-border px-3 py-2.5 text-left text-sm text-nk-text transition-colors hover:bg-nk-accent-subtle focus-visible:outline-2 focus-visible:outline-nk-accent"
                  }
                >
                  <span className="font-medium">{t(`role${r.charAt(0).toUpperCase()}${r.slice(1)}`)}</span>
                  <span className="text-xs text-nk-text-muted">{t(`roleDesc${r.charAt(0).toUpperCase()}${r.slice(1)}`)}</span>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-9 rounded-md border border-nk-border px-4 text-sm text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
            >
              {t("cancel")}
            </button>
            <Button disabled={!pendingRole} onClick={save} className="h-9 bg-nk-accent text-nk-text-inverse hover:bg-nk-accent-dark">
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
