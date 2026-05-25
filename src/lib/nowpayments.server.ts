// Server-only helper for NOWPayments REST API
const BASE = "https://api.nowpayments.io/v1";

function key(): string {
  const k = process.env.NOWPAYMENTS_API_KEY;
  if (!k) throw new Error("NOWPAYMENTS_API_KEY is not set");
  return k;
}

export async function createInvoice(input: {
  price_amount: number;
  price_currency: string;
  order_id: string;
  order_description: string;
  ipn_callback_url: string;
  success_url: string;
  cancel_url: string;
}): Promise<{ id: string; invoice_url: string }> {
  const res = await fetch(`${BASE}/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": key(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOWPayments invoice failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { id: String(data.id), invoice_url: String(data.invoice_url) };
}

// Sort keys recursively (NOWPayments IPN HMAC spec)
function sortObject(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj && typeof obj === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj).sort()) out[k] = sortObject(obj[k]);
    return out;
  }
  return obj;
}

export async function verifyIpnSignature(rawBody: string, signatureHeader: string | null): Promise<any> {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) throw new Error("NOWPAYMENTS_IPN_SECRET not set");
  if (!signatureHeader) throw new Error("Missing x-nowpayments-sig");

  const parsed = JSON.parse(rawBody);
  const sortedJson = JSON.stringify(sortObject(parsed));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(sortedJson));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expected !== signatureHeader.toLowerCase()) {
    throw new Error("Invalid IPN signature");
  }
  return parsed;
}
