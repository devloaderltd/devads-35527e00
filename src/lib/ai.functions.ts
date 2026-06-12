import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callGateway(messages: any[], opts?: { json?: boolean }) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (res.status === 429) throw new Error("AI rate-limited, try again shortly");
  if (res.status === 402) throw new Error("AI credits exhausted");
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

export const aiWriteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      hint: z.string().min(2).max(400),
      category: z.string().max(80).optional(),
      imageDataUrl: z.string().max(2_500_000).optional(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const userContent: any[] = [
      {
        type: "text",
        text: `Write an adult companion directory listing in JSON with keys "title" (max 80 chars, catchy, tasteful, no explicit terms), "description" (160-450 chars, written in first person, friendly and welcoming, mentions personality, availability and how to get in touch, no explicit sexual content, no illegal services), "tags" (array of 3-6 short lowercase tags like "outcall", "incall", "dinner-date", "travel").
Hint from the advertiser: "${data.hint}"${data.category ? `\nCategory: ${data.category}` : ""}
Return JSON only. Never write anything illegal, never reference anyone under 18, never describe sexual acts for money.`,
      },
    ];
    if (data.imageDataUrl) {
      userContent.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }
    const raw = await callGateway(
      [
        { role: "system", content: "You write tasteful, first-person profile copy for an adult companion directory. Strictly 18+. No explicit acts, no illegal content, no fabricated personal details." },
        { role: "user", content: userContent },
      ],
      { json: true }
    );
    try {
      const parsed = JSON.parse(raw);
      return {
        title: String(parsed.title ?? "").slice(0, 140),
        description: String(parsed.description ?? "").slice(0, 4000),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t)).slice(0, 8) : [],
      };
    } catch {
      throw new Error("AI returned invalid JSON");
    }
  });

export const aiSuggestReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      context: z.string().min(1).max(2000),
      listingTitle: z.string().max(200).optional(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        { role: "system", content: "You help sellers reply to buyers. Output JSON: { replies: string[3] }. Each reply <= 200 chars, friendly, specific." },
        {
          role: "user",
          content: `Listing: "${data.listingTitle ?? "(unknown)"}".
Latest buyer message thread (most recent last):
${data.context}

Draft 3 short reply options. JSON only.`,
        },
      ],
      { json: true }
    );
    try {
      const parsed = JSON.parse(raw);
      const replies = Array.isArray(parsed.replies) ? parsed.replies.map((r: any) => String(r).slice(0, 280)).slice(0, 3) : [];
      return { replies };
    } catch {
      throw new Error("AI returned invalid JSON");
    }
  });
