// supabase/functions/fetch-webpage/index.ts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  // include both apikey + Apikey because some clients vary in casing
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, apikey, Apikey",
};

type Mode = "text" | "html";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      // helpful in debugging CDN/browser caching
      "Cache-Control": "no-store",
    },
  });
}

async function readJsonBody(req: Request): Promise<any> {
  // Supabase Edge sometimes receives weird bodies; be defensive.
  const raw = await req.text();
  if (!raw || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Request body must be valid JSON");
  }
}

function normalizeUrl(input: string): string {
  const s = (input || "").trim();
  if (!s) return s;

  // If user pastes without scheme, try https by default
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;

  return s;
}

function sanitizeHtmlForSrcDoc(rawHtml: string, pageUrl: string): string {
  if (!rawHtml) return rawHtml;

  let html = String(rawHtml);

  // 1) Remove ALL <script> blocks
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  // 2) Remove iframes/embeds/objects (often break, cause mixed-content, heavy)
  html = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "");
  html = html.replace(/<embed\b[^>]*>/gi, "");

  // 3) Upgrade obvious http:// in src/href/poster/action (fast pass)
  html = html.replace(/(src|href|poster|action)=["']http:\/\//gi, '$1="https://');

  // 4) Inject/replace <base href="..."> using FULL page URL (best for relative paths)
  // Remove existing base tags
  html = html.replace(/<base\b[^>]*>/gi, "");
  // Ensure there is a <head>
  if (!/<head\b/i.test(html)) {
    html = html.replace(/<html\b[^>]*>/i, (m) => `${m}<head></head>`);
  }

  // Put base + CSP right after <head>
  // CSP: upgrade insecure requests, block mixed content, and limit dangerous loads.
  const baseHref = pageUrl;
  const cspMeta =
    `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests; block-all-mixed-content">`;

  html = html.replace(
    /<head\b[^>]*>/i,
    (m) => `${m}\n${cspMeta}\n<base href="${baseHref}">\n`
  );

  // 5) Optional: strip classic “spacer.gif” style trackers
  html = html.replace(/<img\b[^>]*spacer\.gif[^>]*>/gi, "");

  // 6) Add a tiny style to keep preview readable (doesn't fight the page too hard)
  const previewStyle = `
<style>
  html, body { margin: 0; padding: 0; }
  img, video { max-width: 100%; height: auto; }
  body { overflow-x: hidden; }
</style>`;
  html = html.replace(/<\/head>/i, `${previewStyle}\n</head>`);

  return "<!doctype html>\n" + html;
}

function extractReadableText(rawHtml: string): string {
  if (!rawHtml) return "";

  try {
    const doc = new DOMParser().parseFromString(rawHtml, "text/html");

    // Remove noisy nodes
    doc.querySelectorAll("script, style, noscript, svg, canvas, form, nav, footer, header, aside").forEach((n) => n.remove());

    // Prefer article/main; else pick the largest text container
    const candidates: Element[] = [];
    doc.querySelectorAll("article, main, section").forEach((el) => candidates.push(el));
    const body = doc.body;

    let best: Element | null = null;
    let bestLen = 0;

    for (const el of candidates) {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length > bestLen) {
        best = el;
        bestLen = t.length;
      }
    }

    const root = best ?? body;
    if (!root) return "";

    // Pull paragraphs + headings + list items (more robust than regex)
    const blocks: string[] = [];
    root.querySelectorAll("h1, h2, h3, p, li").forEach((el) => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length >= 20) blocks.push(text);
    });

    let out = blocks.join("\n\n").trim();

    // fallback if blocks are empty
    if (!out || out.length < 50) {
      out = (root.textContent || "").replace(/\s+/g, " ").trim();
    }

    // Hard limit so you don’t blow up payload sizes
    if (out.length > 30000) out = out.slice(0, 30000) + "\n\n…(trimmed)";

    return out;
  } catch {
    // last resort: regex strip (safe fallback)
    const stripped = rawHtml
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return stripped.length > 30000 ? stripped.slice(0, 30000) + " …(trimmed)" : stripped;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Support GET for quick debugging:
    // /functions/v1/fetch-webpage?url=https://example.com&mode=html
    let url = "";
    let mode: Mode = "text";

    if (req.method === "GET") {
      const u = new URL(req.url);
      url = u.searchParams.get("url") || "";
      mode = (u.searchParams.get("mode") as Mode) || "text";
    } else {
      const body = await readJsonBody(req);
      url = body?.url || "";
      mode = (body?.mode as Mode) || "text";
    }

    url = normalizeUrl(url);
    if (!url) return jsonResponse({ ok: false, error: "URL is required" }, 400);

    // Validate URL
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return jsonResponse({ ok: false, error: "Invalid URL" }, 400);
    }

    // Fetch remote page
    const upstream = await fetch(urlObj.toString(), {
      redirect: "follow",
      headers: {
        // a slightly more realistic UA helps some sites
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!upstream.ok) {
      return jsonResponse(
        { ok: false, error: `Failed to fetch (${upstream.status}) ${upstream.statusText}`, url: urlObj.toString() },
        upstream.status
      );
    }

    const html = await upstream.text();

    if (mode === "html") {
      const safeHtml = sanitizeHtmlForSrcDoc(html, urlObj.toString());
      return jsonResponse({ ok: true, mode: "html", url: urlObj.toString(), html: safeHtml });
    }

    const text = extractReadableText(html);

    if (!text || text.length < 50) {
      return jsonResponse({
        ok: true,
        mode: "text",
        url: urlObj.toString(),
        text: text || "",
        warning: "Could not extract much readable text from this page",
      });
    }

    return jsonResponse({ ok: true, mode: "text", url: urlObj.toString(), text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
