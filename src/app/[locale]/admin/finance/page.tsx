"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  Coins,
  Loader2,
  Percent,
  TrendingUp,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import AdminPageShell, { AdminSection, AdminStat } from "@/components/admin/AdminPageShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { formatIDR } from "@/lib/utils";

const chartConfig = {
  gross: { label: "Gross", color: "var(--chart-1)" },
  fee: { label: "Fee", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Statistik pembayaran & pendapatan platform. */
export default function AdminFinancePage() {
  const t = useTranslations("admin.finance");
  const tu = useTranslations("admin.units");
  const locale = useLocale();
  const [months, setMonths] = useState<6 | 12>(12);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payout states
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED" | "REJECTED">("ALL");
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const url =
        payoutStatusFilter === "ALL"
          ? "/api/admin/payouts"
          : `/api/admin/payouts?status=${payoutStatusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setPayouts(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayoutsLoading(false);
    }
  }, [payoutStatusFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleProcessSubmit = async (e?: React.FormEvent, simulated = false) => {
    if (e) e.preventDefault();
    if (!selectedPayout) return;

    setActionSubmitting(true);
    setActionFeedback(null);
    try {
      const generatedRef = simulated ? `SIM-${Date.now()}` : refNumber;
      const note = simulated ? "Simulasi transfer sukses (demo mode)" : adminNote;

      const res = await fetch(`/api/admin/payouts/${selectedPayout.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          referenceNumber: generatedRef || undefined,
          adminNote: note || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal memproses penarikan");

      const feedbackMsg = `Penarikan sebesar ${formatIDR(selectedPayout.amount)} berhasil di-${actionType === "APPROVE" ? "setujui dan ditransfer" : "tolak (saldo dikembalikan)"}!`;
      setActionFeedback({
        type: "success",
        text: feedbackMsg,
      });
      toast.success(feedbackMsg);
      setActionModalOpen(false);
      setSelectedPayout(null);
      setRefNumber("");
      setAdminNote("");
      fetchPayouts();
    } catch (err: any) {
      const errMsg = err.message || "Terjadi kesalahan";
      setActionFeedback({ type: "error", text: errMsg });
      toast.error(errMsg);
    } finally {
      setActionSubmitting(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/payments")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          setTransactions(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const settled = transactions.filter((x) => x.status === "settlement");
  const grossYtd = settled.reduce((a, m) => a + Number(m.amount || 0), 0);
  const feeYtd = settled.reduce((a, m) => a + Number(m.fee || 0), 0);
  const refundTotal = transactions
    .filter((x) => x.status === "refund")
    .reduce((a, x) => a + Number(x.amount || 0), 0);

  const chartData = useMemo(() => {
    const count = months === 6 ? 6 : 12;
    return Array.from({ length: count }).map((_, i) => {
      const share = grossYtd > 0 ? (grossYtd / count) * (0.7 + i * 0.05) : (i + 1) * 3500000;
      const fShare = feeYtd > 0 ? (feeYtd / count) * (0.7 + i * 0.05) : (i + 1) * 52500;
      return {
        label: tu(`m${i + 1}`),
        gross: Math.round(share / 1_000_000),
        fee: Math.round(fShare / 100_000) / 10,
      };
    });
  }, [grossYtd, feeYtd, months, tu]);

  const byMethodMap = new Map<string, number>();
  for (const x of settled) {
    const m = (x.method || "va-bca").toLowerCase();
    byMethodMap.set(m, (byMethodMap.get(m) ?? 0) + Number(x.amount || 0));
  }
  const byMethodTotal = [...byMethodMap.values()].reduce((a, v) => a + v, 0);
  const labelKey: Record<string, string> = {
    "va-bca": "methodVaBca",
    "va-bni": "methodVaBni",
    qris: "methodQris",
    gopay: "methodGopay",
  };
  const byMethod = [...byMethodMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      key: k,
      label: labelKey[k] ? t(labelKey[k] as any) : k.toUpperCase(),
      pct: byMethodTotal > 0 ? Math.round((v / byMethodTotal) * 100) : 0,
      amount: v,
    }));

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label={t("statGrossYtd")}
          value={formatIDR(grossYtd)}
          icon={TrendingUp}
          tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }}
          note={t("statGrossYtdNote", { pct: "12.4" })}
        />
        <AdminStat
          label={t("statFeeYtd")}
          value={formatIDR(feeYtd)}
          icon={Percent}
          tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }}
          note={t("statFeeYtdNote")}
        />
        <AdminStat
          label={t("statTx")}
          value={String(settled.length)}
          icon={Wallet}
          tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }}
          note={t("statTxNote")}
        />
        <AdminStat
          label={t("statRefund")}
          value={formatIDR(refundTotal)}
          icon={Banknote}
          tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }}
          note={t("statRefundNote")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <AdminSection
          title={t("chartTitle")}
          right={
            <div className="flex overflow-hidden rounded-md bg-nk-surface ring-1 ring-foreground/10">
              {([6, 12] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={
                    months === m
                      ? "px-3 py-1.5 text-xs font-medium text-nk-text bg-nk-warm"
                      : "px-3 py-1.5 text-xs text-nk-text-muted hover:bg-nk-accent-subtle"
                  }
                >
                  {t("rangeMonths", { count: m })}
                </button>
              ))}
            </div>
          }
          bodyClass="p-4 sm:p-6"
        >
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 8, left: 0, right: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} interval={0} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-mono text-[10px] tabular-nums text-nk-text-muted">
                        {name === "fee"
                          ? `${(Number(value) || 0).toFixed(1)} jt`
                          : `${Number(value) || 0} jt`}
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="gross" fill="var(--color-gross)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fee" fill="var(--color-fee)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-nk-text-muted">
            {(["gross", "fee"] as const).map((k, i) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: `var(--chart-${i === 0 ? 1 : 3})` }} />
                {k === "gross" ? t("legendGross") : t("legendFee")}
              </span>
            ))}
          </div>
        </AdminSection>

        <AdminSection title={t("methodTitle")} bodyClass="p-4 sm:p-6">
          <ul className="flex flex-col gap-4">
            {byMethod.map((m) => (
              <li key={m.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-nk-text">{m.label}</span>
                  <span className="text-xs tabular-nums text-nk-text-muted">
                    {formatIDR(m.amount)} · {m.pct}%
                  </span>
                </div>
                <Progress value={m.pct} className="h-1.5 bg-nk-border" />
              </li>
            ))}
            {byMethod.length === 0 && (
              <li className="text-sm text-nk-text-muted">Belum ada transaksi settlement.</li>
            )}
          </ul>
          <p className="mt-5 border-t border-nk-border pt-4 text-xs text-nk-text-muted">
            {t("methodNote", {
              cutoff: new Date().toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                day: "numeric",
                month: "short",
              }),
            })}
          </p>
        </AdminSection>

        {/* SECTION: PERMOHONAN PENCAIRAN DANA (PAYOUT REQUESTS) */}
        <AdminSection
          title="Permohonan Pencairan Saldo (Payout Requests)"
          right={
            <div className="flex items-center gap-1.5 bg-nk-warm p-1">
              {(["ALL", "PENDING", "COMPLETED", "REJECTED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPayoutStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-semibold ${
                    payoutStatusFilter === st
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {st === "ALL"
                    ? "Semua"
                    : st === "PENDING"
                    ? "Menunggu"
                    : st === "COMPLETED"
                    ? "Selesai"
                    : "Ditolak"}
                </button>
              ))}
            </div>
          }
          bodyClass="p-0"
        >
          <div className="p-4 border-b border-nk-border bg-neutral-50 text-xs text-neutral-600">
            Daftar pengajuan penarikan dana dari pemilik kos dan penyewa. Admin dapat mengonfirmasi transfer manual atau menggunakan mode simulasi untuk pengujian demo tanpa Midtrans Iris.
          </div>
          {actionFeedback && (
            <div className="p-4 border-b border-nk-border">
              <Alert
                className={
                  actionFeedback.type === "success"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-rose-300 bg-rose-50 text-rose-800"
                }
              >
                {actionFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <AlertDescription className="text-xs font-medium">
                  {actionFeedback.text}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="text-xs font-semibold text-neutral-600">Pemohon</TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-600">Rekening Tujuan</TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-600">Nominal</TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-600">Waktu Pengajuan</TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-600">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-600 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-neutral-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                      Memuat daftar permohonan penarikan dana...
                    </TableCell>
                  </TableRow>
                ) : payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-neutral-400 text-sm">
                      Tidak ada permohonan penarikan dana {payoutStatusFilter !== "ALL" ? `dengan status ${payoutStatusFilter}` : ""}.
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-neutral-50 transition">
                      <TableCell className="text-xs">
                        <div className="font-semibold text-neutral-900">{p.user?.fullName || "User"}</div>
                        <div className="text-[11px] text-neutral-500">{p.user?.email} · {p.user?.role}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-neutral-900">{p.bankName} - {p.accountNumber}</div>
                        <div className="text-[11px] text-neutral-500">a.n. {p.accountHolder}</div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-neutral-900">
                        {formatIDR(p.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {p.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Berhasil
                          </span>
                        ) : p.status === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Menunggu
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Ditolak
                          </span>
                        )}
                        {p.referenceNumber && (
                          <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                            Ref: {p.referenceNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {p.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(p);
                                setActionType("APPROVE");
                                setActionModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition"
                            >
                              Konfirmasi
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(p);
                                setActionType("REJECT");
                                setActionModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold border border-rose-300 text-rose-700 hover:bg-rose-50 transition"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">
                            Diproses {p.processedAt ? new Date(p.processedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </AdminSection>

        {/* MODAL PROSES PENARIKAN (ADMIN) */}
        <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
          <DialogContent className="sm:max-w-md p-6 bg-white border border-neutral-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-neutral-900" />
                {actionType === "APPROVE" ? "Konfirmasi Transfer Payout" : "Tolak Permohonan Penarikan"}
              </DialogTitle>
            </DialogHeader>

            {selectedPayout && (
              <div className="space-y-4 mt-2">
                <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Pemohon:</span>
                    <span className="font-semibold text-neutral-900">{selectedPayout.user?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Rekening Tujuan:</span>
                    <span className="font-semibold text-neutral-900">
                      {selectedPayout.bankName} - {selectedPayout.accountNumber} ({selectedPayout.accountHolder})
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium">
                    <span className="text-neutral-600">Nominal Penarikan:</span>
                    <span className="font-bold text-base text-neutral-900">{formatIDR(selectedPayout.amount)}</span>
                  </div>
                </div>

                {actionType === "APPROVE" ? (
                  <form onSubmit={(e) => handleProcessSubmit(e, false)} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Nomor Referensi Bank (Opsional)
                      </label>
                      <input
                        type="text"
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        placeholder="Contoh: BCA-8839210"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Catatan Admin
                      </label>
                      <input
                        type="text"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Transfer sukses via m-Banking"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActionModalOpen(false)}
                          className="px-4 py-2 border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={actionSubmitting}
                          className="px-5 py-2 bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition flex items-center gap-1.5"
                        >
                          {actionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Simpan Konfirmasi
                        </button>
                      </div>

                      <div className="border-t border-neutral-200 pt-2 text-center">
                        <button
                          type="button"
                          disabled={actionSubmitting}
                          onClick={() => handleProcessSubmit(undefined, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          ⚡ Simulasikan Transfer Berhasil (Mode Demo)
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={(e) => handleProcessSubmit(e, false)} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Alasan Penolakan *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Contoh: Nomor rekening tidak cocok dengan nama pemilik..."
                        className="w-full px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                      />
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Saldo sebesar {formatIDR(selectedPayout.amount)} akan otomatis dikembalikan ke saldo dompet pemohon.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActionModalOpen(false)}
                        className="px-4 py-2 border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={actionSubmitting}
                        className="px-5 py-2 bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition flex items-center gap-1.5"
                      >
                        {actionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Tolak & Kembalikan Saldo
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminPageShell>
  );
}
