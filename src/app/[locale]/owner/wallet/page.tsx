"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  HelpCircle,
  Loader2,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { formatIDR } from "@/lib/utils";

interface WalletTransactionItem {
  id: string;
  amount: number;
  type: string;
  status: string;
  referenceId?: string | null;
  description: string;
  payoutEligibleAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

interface PayoutItem {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  referenceNumber?: string | null;
  proofUrl?: string | null;
  adminNote?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

interface WalletData {
  id: string;
  balance: number;
  heldBalance: number;
  transactions: WalletTransactionItem[];
  payouts: PayoutItem[];
}

export default function OwnerWalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"transactions" | "payouts">("transactions");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Payout form state
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  const loadWallet = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load wallet", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const totalWithdrawn = useMemo(() => {
    if (!data?.payouts) return 0;
    return data.payouts
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [data?.payouts]);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 50000) {
      setErrorMsg("Nominal penarikan minimal adalah Rp 50.000");
      return;
    }
    if (numAmount > (data?.balance || 0)) {
      setErrorMsg("Nominal penarikan melebihi saldo aktif Anda");
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setErrorMsg("Harap lengkapi informasi rekening bank");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/wallet/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          bankName,
          accountNumber,
          accountHolder,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal mengajukan penarikan dana");
      }

      setSuccessMsg("Permohonan penarikan dana berhasil diajukan dan sedang diproses admin!");
      setPayoutModalOpen(false);
      setAmount("");
      setAccountNumber("");
      setAccountHolder("");
      loadWallet();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Berhasil
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Menunggu
          </span>
        );
      case "REJECTED":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Ditolak / Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-800">
            {status}
          </span>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "EARNING_HOLD":
        return "Escrow Sewa (Ditahan)";
      case "ESCROW_RELEASE":
        return "Pelepasan Escrow H+1";
      case "WITHDRAWAL":
        return "Penarikan Dana (Payout)";
      case "RENT_REFUND":
        return "Refund Sewa";
      case "DEPOSIT_REFUND":
        return "Refund Deposit";
      case "DAMAGE_COMPENSATION":
        return "Kompensasi Kerusakan";
      default:
        return type;
    }
  };

  return (
    <DashboardShell role="owner">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Dompet & Saldo</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Kelola saldo hasil sewa kos, pantau escrow check-in H+1, dan ajukan penarikan dana ke rekening bank.
            </p>
          </div>
          <button
            onClick={() => setPayoutModalOpen(true)}
            disabled={!data || data.balance < 50000}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Coins className="w-4 h-4" />
            Tarik Saldo
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <Alert className="border-emerald-300 bg-emerald-50 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-sm font-medium">{successMsg}</AlertDescription>
          </Alert>
        )}
        {errorMsg && (
          <Alert className="border-rose-300 bg-rose-50 text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <AlertDescription className="text-sm font-medium">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Saldo Aktif */}
          <div className="p-5 border border-neutral-200 bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Saldo Aktif (Siap Ditarik)
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                {isLoading ? "..." : formatIDR(data?.balance || 0)}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Saldo yang sudah siap dicairkan ke rekening bank Anda.
              </p>
            </div>
          </div>

          {/* Card 2: Saldo Tertahan (Escrow) */}
          <div className="p-5 border border-neutral-200 bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                Saldo Tertahan (Escrow)
                <span title="Dana sewa ditahan platform dan otomatis cair ke Saldo Aktif pada H+1 setelah penyewa sukses check-in.">
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
                </span>
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {isLoading ? "..." : formatIDR(data?.heldBalance || 0)}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Cair otomatis H+1 setelah penyewa Check-in di kos.
              </p>
            </div>
          </div>

          {/* Card 3: Total Dicairkan */}
          <div className="p-5 border border-neutral-200 bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Telah Ditarik
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                {isLoading ? "..." : formatIDR(totalWithdrawn)}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Akumulasi penarikan dana yang telah berhasil ditransfer.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Transactions & Payouts */}
        <div className="border border-neutral-200 bg-white shadow-sm">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            className="w-full"
          >
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <TabsList className="bg-neutral-100 p-1">
                <TabsTrigger value="transactions" className="text-xs font-semibold">
                  Riwayat Mutasi Saldo
                </TabsTrigger>
                <TabsTrigger value="payouts" className="text-xs font-semibold">
                  Riwayat Penarikan Dana ({data?.payouts?.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: MUTASI SALDO */}
            {activeTab === "transactions" && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="text-xs font-semibold text-neutral-600">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-600">Kategori</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-600">Keterangan</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-600">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-600 text-right">Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-neutral-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                          Memuat mutasi saldo...
                        </TableCell>
                      </TableRow>
                    ) : !data?.transactions || data.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-neutral-400 text-sm">
                          Belum ada aktivitas mutasi transaksi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.transactions.map((tx) => {
                        const isCredit =
                          tx.type === "ESCROW_RELEASE" ||
                          tx.type === "RENT_REFUND" ||
                          tx.type === "DAMAGE_COMPENSATION";
                        const isHold = tx.type === "EARNING_HOLD";

                        return (
                          <TableRow key={tx.id} className="hover:bg-neutral-50 transition">
                            <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-neutral-700 whitespace-nowrap">
                              {getTypeLabel(tx.type)}
                            </TableCell>
                            <TableCell className="text-xs text-neutral-600 max-w-xs truncate">
                              {tx.description}
                              {tx.payoutEligibleAt && tx.status === "PENDING" && (
                                <div className="text-[11px] text-amber-600 mt-0.5">
                                  Estimasi rilis:{" "}
                                  {new Date(tx.payoutEligibleAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{getStatusBadge(tx.status)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap font-semibold text-sm">
                              {isHold ? (
                                <span className="text-amber-600 flex items-center justify-end gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatIDR(tx.amount)}
                                </span>
                              ) : isCredit ? (
                                <span className="text-emerald-600 flex items-center justify-end gap-1">
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  +{formatIDR(tx.amount)}
                                </span>
                              ) : (
                                <span className="text-neutral-900 flex items-center justify-end gap-1">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  -{formatIDR(tx.amount)}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* TAB 2: RIWAYAT PENARIKAN DANA */}
            {activeTab === "payouts" && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="text-xs font-semibold text-neutral-600">Tanggal Pengajuan</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-600">Rekening Tujuan</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-600">Nominal</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-600">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-neutral-600">Keterangan / No. Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-neutral-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                          Memuat data penarikan...
                        </TableCell>
                      </TableRow>
                    ) : !data?.payouts || data.payouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-neutral-400 text-sm">
                          Belum pernah mengajukan penarikan dana.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.payouts.map((p) => (
                        <TableRow key={p.id} className="hover:bg-neutral-50 transition">
                          <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="text-xs text-neutral-800 whitespace-nowrap">
                            <div className="font-semibold">{p.bankName} - {p.accountNumber}</div>
                            <div className="text-neutral-500 text-[11px]">a.n. {p.accountHolder}</div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-neutral-900 whitespace-nowrap">
                            {formatIDR(p.amount)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{getStatusBadge(p.status)}</TableCell>
                          <TableCell className="text-xs text-neutral-600">
                            {p.referenceNumber && (
                              <div className="font-mono text-[11px] text-neutral-700">
                                Ref: {p.referenceNumber}
                              </div>
                            )}
                            {p.adminNote && (
                              <div className="text-[11px] text-neutral-500 mt-0.5">{p.adminNote}</div>
                            )}
                            {!p.referenceNumber && !p.adminNote && (
                              <span className="text-neutral-400 text-[11px]">Menunggu verifikasi admin</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Tabs>
        </div>

        {/* MODAL PENARIKAN DANA */}
        <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
          <DialogContent className="sm:max-w-md p-6 bg-white border border-neutral-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-neutral-900" />
                Tarik Saldo ke Rekening Bank
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handlePayoutSubmit} className="space-y-4 mt-2">
              <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                <div className="flex justify-between font-medium">
                  <span>Saldo Aktif Tersedia:</span>
                  <span className="font-bold text-neutral-900">{formatIDR(data?.balance || 0)}</span>
                </div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  Minimal penarikan dana: <strong>Rp 50.000</strong>. Bebas biaya penarikan.
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nominal Penarikan (Rp) *
                </label>
                <input
                  type="number"
                  min={50000}
                  max={data?.balance || 0}
                  step={10000}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 1500000"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.min(500000, data?.balance || 0)))}
                    className="text-[11px] px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium"
                  >
                    Rp 500rb
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.min(1000000, data?.balance || 0)))}
                    className="text-[11px] px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium"
                  >
                    Rp 1 Jt
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(String(data?.balance || 0))}
                    className="text-[11px] px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium"
                  >
                    Tarik Semua ({formatIDR(data?.balance || 0)})
                  </button>
                </div>
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Bank Tujuan *
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900 bg-white"
                >
                  <option value="BCA">Bank Central Asia (BCA)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank Rakyat Indonesia (BRI)</option>
                  <option value="BNI">Bank Negara Indonesia (BNI)</option>
                  <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                  <option value="Jago">Bank Jago</option>
                  <option value="SeaBank">SeaBank</option>
                  <option value="CIMB">CIMB Niaga</option>
                  <option value="Permata">Bank Permata</option>
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nomor Rekening *
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Contoh: 1234567890"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Account Holder */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nama Pemilik Rekening *
                </label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Nama sesuai buku tabungan"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Konfirmasi Tarik Dana
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
