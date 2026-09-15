"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, Search, TrendingUp, Wallet } from "lucide-react";
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
import AdminPageShell, { AdminSection, AdminStat } from "@/components/admin/AdminPageShell";
import { StatusBadge, type StatusColor } from "@/components/StatusBadge";
import { formatIDR } from "@/lib/utils";
import { platformTransactions, type TxStatus } from "@/lib/data/adminData";

const TX_COLOR: Record<TxStatus, StatusColor> = {
  settlement: "green",
  pending: "yellow",
  expired: "gray",
  cancel: "gray",
  refund: "red",
};

const METHOD_LABEL: Record<string, string> = {
  "va-bca": "BCA VA",
  "va-bni": "BNI VA",
  qris: "QRIS",
  gopay: "GoPay",
};

function TxStatusBadge({ status }: { status: TxStatus }) {
  const t = useTranslations("admin.payments");
  const camel = status.charAt(0).toUpperCase() + status.slice(1);
  return <StatusBadge color={TX_COLOR[status]}>{t(`st${camel}`)}</StatusBadge>;
}

/** Pantau transaksi pembayaran Midtrans. */
export default function AdminPaymentsPage() {
  const t = useTranslations("admin.payments");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | TxStatus>("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return platformTransactions
      .filter((x) => (status === "all" ? true : x.status === status))
      .filter((x) =>
        q ? `${x.id} ${x.bookingId} ${x.payer} ${x.propertyName}`.toLowerCase().includes(q) : true
      );
  }, [search, status]);

  const settled = platformTransactions.filter((x) => x.status === "settlement");
  const gross = settled.reduce((a, x) => a + x.amount, 0);
  const fee = settled.reduce((a, x) => a + x.fee, 0);

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStat label={t("statSettled")} value={String(settled.length)} icon={TrendingUp} tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }} note={t("statSettledNote")} />
        <AdminStat label={t("statGross")} value={formatIDR(gross)} icon={Wallet} tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }} note={t("statGrossNote", { fee: formatIDR(fee) })} />
        <AdminStat label={t("statPending")} value={String(platformTransactions.filter((x) => x.status === "pending").length)} icon={CreditCard} tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }} note={t("statPendingNote")} />
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
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-11 w-44 md:h-9" aria-label={t("filterLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {(Object.keys(TX_COLOR) as TxStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{t(`st${s.charAt(0).toUpperCase()}${s.slice(1)}`)}</SelectItem>
                ))}
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
                <TableHead className="px-4 py-3 font-medium">{t("colTxId")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colPayer")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colMethod")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colAmount")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colFee")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colTime")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((x) => (
                <TableRow key={x.id} className="border-b border-nk-border last:border-b-0">
                  <TableCell className="px-4 py-3 font-mono text-xs text-nk-text-muted">{x.id}</TableCell>
                  <TableCell className="px-4 py-3 text-nk-text">{x.payer}</TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="truncate text-nk-text">{x.propertyName}</p>
                    <p className="truncate font-mono text-[10px] text-nk-text-muted">{x.bookingId}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-nk-text-muted">{METHOD_LABEL[x.method]}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text">{formatIDR(x.amount)}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text-muted">{formatIDR(x.fee)}</TableCell>
                  <TableCell className="px-4 py-3"><TxStatusBadge status={x.status} /></TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted">
                    {new Date(x.at).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short" })}{" "}
                    {new Date(x.at).toLocaleTimeString(locale === "id" ? "id-ID" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
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
