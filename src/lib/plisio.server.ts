// Server-only helper for Plisio crypto payment gateway
// Docs: https://plisio.net/documentation/endpoints/create-an-invoice
const BASE = "https://api.plisio.net/api/v1";

function key(): string {
  const k = process.env.PLISIO_API_KEY;
  if (!k) throw new Error("PLISIO_API_KEY is not set");
  return k;
}

export async function createInvoice(input: {
  amountUsd: number;
  orderId: string;
  orderName: string;
  callbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; invoice_url: string }> {
  const params = new URLSearchParams({
    source_currency: "USD",
    source_amount: input.amountUsd.toFixed(2),
    order_number: input.orderId,
    order_name: input.orderName,
    // Plisio requires ?json=true appended to callback_url to receive JSON POST
    callback_url: `${input.callbackUrl}?json=true`,
    success_callback_url: input.successUrl,
    fail_callback_url: input.cancelUrl,
    cancel_url: input.cancelUrl,
    email: "",
    api_key: key(),
  });

  const res = await fetch(`${BASE}/invoices/new?${params.toString()}`, {
    method: "GET",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Plisio invoice failed: ${res.status} ${text}`);
  }
  const body = await res.json();
  if (body?.status !== "success" || !body?.data) {
    throw new Error(`Plisio invoice failed: ${body?.data?.message ?? JSON.stringify(body)}`);
  }
  return {
    id: String(body.data.txn_id ?? body.data.id ?? ""),
    invoice_url: String(body.data.invoice_url),
  };
}

function sortKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj && typeof obj === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj).sort()) out[k] = sortKeys(obj[k]);
    return out;
  }
  return obj;
}

/**
 * Verify Plisio callback. Plisio sends JSON body with `verify_hash`.
 * Hash = HMAC-SHA1 over JSON-encoded payload (with verify_hash removed,
 * keys sorted) using the merchant API key as the HMAC secret.
 */
export async function verifyCallback(rawBody: string): Promise<any> {
  const secret = process.env.PLISIO_API_KEY;
  if (!secret) throw new Error("PLISIO_API_KEY not set");
  const payload = JSON.parse(rawBody);
  const provided = payload?.verify_hash;
  if (!provided) throw new Error("Missing verify_hash");

  const { verify_hash, ...rest } = payload;
  const sorted = sortKeys(rest);
  const json = JSON.stringify(sorted);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(json));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.toLowerCase() !== String(provided).toLowerCase()) {
    throw new Error("Invalid Plisio signature");
  }
  return payload;
}
