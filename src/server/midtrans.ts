import crypto from "crypto";

export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  snapUrl: string;
  coreApiUrl: string;
  isConfigured: boolean;
}

export function getMidtransConfig(): MidtransConfig {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() || "";
  const clientKey =
    process.env.MIDTRANS_CLIENT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() ||
    "";
  const isProduction =
    process.env.MIDTRANS_IS_PRODUCTION === "true" ||
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

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
 */
export async function createSnapTransaction(
  params: CreateSnapTransactionParams
): Promise<SnapTransactionResult> {
  const config = getMidtransConfig();
  if (!config.isConfigured) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum diisi di environment variables (.env.local)."
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
 */
export function verifyMidtransNotification(
  payload: MidtransNotificationPayload
): boolean {
  const config = getMidtransConfig();
  if (!config.serverKey) return false;

  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${config.serverKey}`;
  const expectedSignature = crypto.createHash("sha512").update(raw).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(payload.signature_key, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}
