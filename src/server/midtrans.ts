import crypto from "crypto";

export type AppEnv = "development" | "staging" | "production" | "test";

export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  snapUrl: string;
  coreApiUrl: string;
  isConfigured: boolean;
  appEnv: AppEnv;
  mockMode: boolean;
}

/**
 * Mendeteksi environment aplikasi dari APP_ENV (bukan hanya NODE_ENV).
 * Catatan penting: staging build Next.js seringkali menggunakan NODE_ENV=production
 * untuk optimasi bundler, sehingga APP_ENV menjadi penentu utama status staging.
 */
export function getAppEnv(): AppEnv {
  const env = (process.env.APP_ENV || "").trim().toLowerCase();
  if (env === "production") return "production";
  if (env === "staging") return "staging";
  if (env === "development") return "development";
  if (env === "test") return "test";
  if (process.env.NODE_ENV === "test") return "test";
  return "development";
}

/**
 * Mode mock / auto-paid lokal Midtrans telah dinonaktifkan secara permanen.
 * Seluruh pengujian pembayaran wajib melalui Midtrans Sandbox resmi
 * (https://simulator.sandbox.midtrans.com/).
 */
export function isMidtransMockMode(): boolean {
  return false;
}

/**
 * Membaca dan memvalidasi konfigurasi Midtrans dengan arsitektur fail-closed:
 * 1. Staging dan Development dilarang menggunakan konfigurasi Production.
 * 2. Production dilarang menggunakan konfigurasi Sandbox atau Server Key Sandbox.
 * 3. Kunci Sandbox wajib diawali 'SB-Mid-server-' / 'SB-Mid-client-'.
 * 4. Kunci Production dilarang diawali 'SB-'.
 * 5. Mock mode dilarang di staging dan production.
 */
export function getMidtransConfig(): MidtransConfig {
  const appEnv = getAppEnv();
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() || "";
  const clientKey =
    process.env.MIDTRANS_CLIENT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() ||
    "";

  const rawIsProd = (
    process.env.MIDTRANS_IS_PRODUCTION ||
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION ||
    ""
  )
    .trim()
    .toLowerCase();
  const isProduction = rawIsProd === "true" || rawIsProd === "1";

  // Aturan 1: Staging dan Development TIDAK BOLEH berada dalam mode produksi
  if ((appEnv === "staging" || appEnv === "development") && isProduction) {
    throw new Error(
      `[Security Error] Konfigurasi tidak aman: APP_ENV='${appEnv}' dilarang mengaktifkan MIDTRANS_IS_PRODUCTION=true. Staging wajib menggunakan Midtrans Sandbox.`
    );
  }

  // Aturan 2: Production wajib MIDTRANS_IS_PRODUCTION=true
  if (appEnv === "production" && !isProduction) {
    throw new Error(
      `[Security Error] Konfigurasi tidak valid: APP_ENV='production' mewajibkan MIDTRANS_IS_PRODUCTION=true.`
    );
  }

  // Aturan 3: Isolasi format Server Key & Client Key
  if (serverKey) {
    const isExplicitSandboxKey = serverKey.startsWith("SB-Mid-server-") || serverKey.startsWith("SB-");
    if (isProduction && isExplicitSandboxKey) {
      throw new Error(
        `[Security Error] Production environment tidak boleh menggunakan Server Key Sandbox (${serverKey.slice(0, 10)}...).`
      );
    }
    const isValidFormat =
      serverKey.startsWith("SB-") ||
      serverKey.startsWith("Mid-server-") ||
      serverKey.startsWith("mock-") ||
      serverKey.startsWith("test-");
    if (!isValidFormat) {
      throw new Error(
        `[Security Error] Format MIDTRANS_SERVER_KEY tidak valid (${serverKey.slice(0, 10)}...). Wajib berupa Server Key resmi Midtrans.`
      );
    }
  }

  if (clientKey) {
    const isExplicitSandboxClient = clientKey.startsWith("SB-Mid-client-") || clientKey.startsWith("SB-");
    if (isProduction && isExplicitSandboxClient) {
      throw new Error(
        `[Security Error] Production environment tidak boleh menggunakan Client Key Sandbox (${clientKey.slice(0, 10)}...).`
      );
    }
    const isValidClientFormat =
      clientKey.startsWith("SB-") ||
      clientKey.startsWith("Mid-client-") ||
      clientKey.startsWith("mock-") ||
      clientKey.startsWith("test-");
    if (!isValidClientFormat) {
      throw new Error(
        `[Security Error] Format MIDTRANS_CLIENT_KEY tidak valid (${clientKey.slice(0, 10)}...). Wajib berupa Client Key resmi Midtrans.`
      );
    }
  }

  // Aturan 4: Mock mode dilarang keras di staging & production
  const mockRequested = process.env.MIDTRANS_SANDBOX_MOCK === "true";
  if ((appEnv === "staging" || appEnv === "production") && mockRequested) {
    throw new Error(
      `[Security Error] MIDTRANS_SANDBOX_MOCK=true dilarang di lingkungan ${appEnv}. Integrasi Midtrans nyata wajib digunakan.`
    );
  }
  const mockMode = false;

  const snapUrl = isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const coreApiUrl = isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

  const isConfigured = Boolean(serverKey && serverKey.length > 5);

  return {
    serverKey,
    clientKey,
    isProduction,
    snapUrl,
    coreApiUrl,
    isConfigured,
    appEnv,
    mockMode,
  };
}

export interface SnapCustomerDetails {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
}

export interface SnapItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface CreateSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  customerDetails: SnapCustomerDetails;
  itemDetails: SnapItemDetail[];
  callbacks?: {
    finish?: string;
  };
}

export interface SnapTransactionResult {
  token: string;
  redirect_url: string;
}

/**
 * Membuat transaksi Midtrans Snap token via HTTP API resmi Midtrans.
 * Endpoint dipilih secara aman dari konfigurasi server (tidak dapat diubah client).
 */
export async function createSnapTransaction(
  params: CreateSnapTransactionParams
): Promise<SnapTransactionResult> {
  const config = getMidtransConfig();
  if (!config.isConfigured) {
    throw new Error(
      "MIDTRANS_SERVER_KEY is not set in the environment variables (.env.local)."
    );
  }

  const authHeader = `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`;

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount),
    },
    customer_details: params.customerDetails,
    item_details: params.itemDetails,
    callbacks: params.callbacks,
  };

  const response = await fetch(config.snapUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gagal membuat token Midtrans (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as SnapTransactionResult;
  return data;
}

export interface MidtransTransactionStatusResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  currency?: string;
  payment_type: string;
  transaction_time: string;
  transaction_status:
    | "capture"
    | "settlement"
    | "pending"
    | "deny"
    | "cancel"
    | "expire"
    | "refund";
  fraud_status?: "accept" | "challenge" | "deny";
  signature_key?: string;
  settlement_time?: string;
}

/**
 * Memeriksa status transaksi langsung ke Midtrans Core API:
 * GET https://api.sandbox.midtrans.com/v2/{order_id}/status
 */
export async function getMidtransTransactionStatus(
  orderId: string
): Promise<MidtransTransactionStatusResponse> {
  const config = getMidtransConfig();
  if (!config.isConfigured) {
    throw new Error("MIDTRANS_SERVER_KEY is not configured.");
  }

  const authHeader = `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`;
  const url = `${config.coreApiUrl}/v2/${encodeURIComponent(orderId)}/status`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gagal memeriksa status transaksi Midtrans (${response.status}): ${errorText}`
    );
  }

  return (await response.json()) as MidtransTransactionStatusResponse;
}

export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status:
    | "capture"
    | "settlement"
    | "pending"
    | "deny"
    | "cancel"
    | "expire"
    | "refund";
  fraud_status?: "accept" | "challenge" | "deny";
  payment_type?: string;
  transaction_time?: string;
}

/**
 * Memverifikasi keabsahan webhook notification dari Midtrans menggunakan SHA512 hash.
 * Signature Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 * Menggunakan perbandingan konstan timingSafeEqual untuk mencegah timing attacks.
 */
export function verifyMidtransNotification(
  payload: MidtransNotificationPayload
): boolean {
  try {
    const config = getMidtransConfig();
    if (!config.serverKey) return false;

    if (!payload.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
      return false;
    }

    const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${config.serverKey}`;
    const expectedSignature = crypto.createHash("sha512").update(raw).digest("hex");

    const sigBuf = Buffer.from(payload.signature_key, "hex");
    const expBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expBuf.length || sigBuf.length === 0) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
