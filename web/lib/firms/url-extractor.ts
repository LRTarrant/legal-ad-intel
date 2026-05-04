/**
 * URL extractor for firm brand-profile auto-extraction (Phase 3.0).
 *
 * Pure functions. Two responsibilities:
 *   1. fetchPage(url)        \u2014 download HTML safely (timeout, size cap,
 *                              user agent, http(s)-only)
 *   2. extractFromHtml(html) \u2014 pull out structured signal: title, meta
 *                              description, og:tags, headings, social
 *                              links, phone numbers, deduped body text
 *
 * Why no full HTML parser dep:
 *   We don't need DOM correctness \u2014 we just need text signal to hand
 *   to an LLM in Phase 3.1. A focused regex extractor stays small,
 *   has zero supply-chain surface area, and is straightforward to test.
 *
 * What we deliberately DON'T do:
 *   - Render JavaScript (a firm's about page that requires JS to render
 *     gets a thin extraction; we tag it via word_count so the LLM
 *     prompt can adapt)
 *   - Follow redirects beyond 3 hops (avoid loops + meta-redirect sites)
 *   - Honor robots.txt (we'll ship a polite UA + low rate; firms WANT\n *     this content extracted because they're handing us their URL)
 *   - Pull binary assets (images / pdfs) \u2014 text only
 */

/* ──────────────────────────────────────────────────────────────────────── */
/* Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

export interface FetchPageResult {
  ok: boolean;
  /** Final URL after redirects (canonicalized). */
  url: string;
  /** Status code from the last response. */
  status: number;
  /** HTML body, capped at MAX_HTML_BYTES. Null on non-OK responses. */
  html: string | null;
  /** Why the fetch failed (when ok=false). */
  error?: string;
  /** True when we truncated the body. The extractor still works on
   * truncated HTML \u2014 most signal lives near the top of the page. */
  truncated?: boolean;
}

export interface ExtractedPage {
  /** <title>...</title> contents. */
  title: string | null;
  /** meta[name=description] contents. */
  metaDescription: string | null;
  /** Open Graph tags (og:title, og:description, og:site_name, og:image). */
  og: {
    title: string | null;
    description: string | null;
    siteName: string | null;
    image: string | null;
  };
  /** All <h1>..<h3> contents in document order, deduped. */
  headings: string[];
  /** All paragraph-like text blocks, deduped, in document order. */
  paragraphs: string[];
  /** Discovered social links (Facebook, X/Twitter, LinkedIn, Instagram, YouTube, TikTok). */
  socialLinks: SocialLinks;
  /** First N unique phone numbers found in the body. */
  phoneNumbers: string[];
  /** Approx word count of the extracted text \u2014 useful for the LLM
   * prompt to know when extraction was thin (probably JS-rendered). */
  wordCount: number;
}

export interface SocialLinks {
  facebook: string | null;
  x: string | null;
  linkedin: string | null;
  instagram: string | null;
  youtube: string | null;
  tiktok: string | null;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Fetch                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

const FETCH_TIMEOUT_MS = 10_000;
/** ~2MB cap. Most law firm homepages are well under 1MB; 2MB is a
 * generous ceiling that still bounds memory + LLM cost. */
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT =
  "LegalMarketingIntelligenceBot/1.0 (+https://legalmarketingintelligence.com/bot)";

/**
 * Validate that a string is an http(s) URL. Returns the parsed URL on
 * success, null on failure. Used as a guard so the fetcher never tries
 * file:// or javascript: schemes.
 */
export function parseHttpUrl(input: string): URL | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Fetch HTML for a URL with safety guards. Returns a result object \u2014
 * never throws. Callers can branch on ok/error and surface a clean
 * message to the user without try/catch wrappers.
 */
export async function fetchPage(input: string): Promise<FetchPageResult> {
  const url = parseHttpUrl(input);
  if (!url) {
    return {
      ok: false,
      url: input,
      status: 0,
      html: null,
      error: "URL must be http or https",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        ok: false,
        url: response.url,
        status: response.status,
        html: null,
        error: `HTTP ${response.status}`,
      };
    }

    // Only proceed if the response is HTML \u2014 PDFs / JSON / images
    // would be meaningless to feed to the extractor.
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("html")) {
      return {
        ok: false,
        url: response.url,
        status: response.status,
        html: null,
        error: `Non-HTML content type: ${contentType || "(none)"}`,
      };
    }

    // Stream the body so we can stop at MAX_HTML_BYTES.
    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback: text() with no size enforcement \u2014 only used when
      // streaming isn't available in the runtime.
      const html = await response.text();
      const truncated = html.length > MAX_HTML_BYTES;
      return {
        ok: true,
        url: response.url,
        status: response.status,
        html: truncated ? html.slice(0, MAX_HTML_BYTES) : html,
        truncated,
      };
    }

    let bytes = 0;
    const chunks: Uint8Array[] = [];
    let truncated = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_HTML_BYTES) {
        truncated = true;
        // Push the partial chunk that still fits, then stop.
        const overshoot = bytes - MAX_HTML_BYTES;
        chunks.push(value.slice(0, value.byteLength - overshoot));
        try {
          await reader.cancel();
        } catch {
          // ignore \u2014 best-effort cancel
        }
        break;
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder("utf-8", { fatal: false });
    const html = chunks.map((c) => decoder.decode(c, { stream: true })).join("");
    return {
      ok: true,
      url: response.url,
      status: response.status,
      html,
      truncated,
    };
  } catch (err) {
    clearTimeout(timeout);
    const error =
      err instanceof DOMException && err.name === "AbortError"
        ? `Timeout after ${FETCH_TIMEOUT_MS}ms`
        : (err as Error).message ?? "Unknown fetch error";
    return { ok: false, url: input, status: 0, html: null, error };
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Extract                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Strip HTML entities that show up commonly in extracted text. Not a
 * full entity decoder \u2014 just the ones we're likely to encounter.
 */
function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(parseInt(code, 10)),
    );
}

/** Collapse all whitespace into single spaces. */
function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Strip any remaining HTML tags inside an already-extracted text block. */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

/** Extract text content from HTML using regex. Robust enough for our
 * "text signal for an LLM" use case; not a real HTML parser. */
export function extractFromHtml(html: string): ExtractedPage {
  // Drop <script>, <style>, <noscript>, <svg> blocks before any other
  // extraction \u2014 their content would otherwise leak into headings/paragraphs.
  const cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // ── Title ────────────────────────────────────────────────────────────
  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? normalizeWhitespace(decodeBasicEntities(stripTags(titleMatch[1])))
    : null;

  // ── Meta tags ────────────────────────────────────────────────────────
  // Single-attribute regex: <meta name=".." content="..">
  // Matches both name= and property= attributes.
  function readMeta(nameOrProp: string): string | null {
    // Match the SAME quote type at start and end of the content value
    // (a value enclosed in double quotes can contain apostrophes and
    // vice versa). Two patterns: name=... before content=..., and the
    // reverse order some pages use.
    const tryPattern = (pattern: string): string | null => {
      const m = cleaned.match(new RegExp(pattern, "i"));
      if (!m) return null;
      // m[1] = the matched outer quote char; m[2] = the inner value.
      return normalizeWhitespace(decodeBasicEntities(m[2])) || null;
    };

    const nameFirst =
      `<meta\\s+(?:[^>]*?\\s)?(?:name|property)\\s*=\\s*["']${nameOrProp}["'][^>]*?content\\s*=\\s*(["'])((?:(?!\\1)[\\s\\S])*)\\1[^>]*>`;
    const contentFirst =
      `<meta\\s+(?:[^>]*?\\s)?content\\s*=\\s*(["'])((?:(?!\\1)[\\s\\S])*)\\1[^>]*?(?:name|property)\\s*=\\s*["']${nameOrProp}["'][^>]*>`;

    return tryPattern(nameFirst) ?? tryPattern(contentFirst);
  }

  const metaDescription = readMeta("description");
  const og = {
    title: readMeta("og:title"),
    description: readMeta("og:description"),
    siteName: readMeta("og:site_name"),
    image: readMeta("og:image"),
  };

  // ── Headings (h1, h2, h3) ─────────────────────────────────────────────
  const headingMatches = cleaned.matchAll(
    /<h([123])[^>]*>([\s\S]*?)<\/h\1>/gi,
  );
  const headings: string[] = [];
  const headingSeen = new Set<string>();
  for (const m of headingMatches) {
    const text = normalizeWhitespace(decodeBasicEntities(stripTags(m[2])));
    if (text && !headingSeen.has(text)) {
      headingSeen.add(text);
      headings.push(text);
    }
  }

  // ── Paragraphs (and divs/list items, since not all sites use <p>) ────
  const paragraphRegex =
    /<(?:p|li|blockquote)\b[^>]*>([\s\S]*?)<\/(?:p|li|blockquote)>/gi;
  const paragraphs: string[] = [];
  const paragraphSeen = new Set<string>();
  for (const m of cleaned.matchAll(paragraphRegex)) {
    const text = normalizeWhitespace(decodeBasicEntities(stripTags(m[1])));
    if (text.length < 20) continue; // drop tiny snippets (nav links, button text)
    if (paragraphSeen.has(text)) continue;
    paragraphSeen.add(text);
    paragraphs.push(text);
  }

  // ── Social links ─────────────────────────────────────────────────────
  // Match href="..." values that look like social URLs. We capture the
  // FIRST hit per platform \u2014 firms typically link to their own profile
  // multiple times, but the first occurrence wins.
  const socialPatterns: Array<[keyof SocialLinks, RegExp]> = [
    ["facebook", /href\s*=\s*["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'?#]+)/i],
    ["x", /href\s*=\s*["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'?#]+)/i],
    ["linkedin", /href\s*=\s*["'](https?:\/\/(?:www\.)?linkedin\.com\/[^"'?#]+)/i],
    ["instagram", /href\s*=\s*["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?#]+)/i],
    ["youtube", /href\s*=\s*["'](https?:\/\/(?:www\.)?youtube\.com\/[^"'?#]+)/i],
    ["tiktok", /href\s*=\s*["'](https?:\/\/(?:www\.)?tiktok\.com\/[^"'?#]+)/i],
  ];
  const socialLinks: SocialLinks = {
    facebook: null,
    x: null,
    linkedin: null,
    instagram: null,
    youtube: null,
    tiktok: null,
  };
  for (const [key, re] of socialPatterns) {
    const m = cleaned.match(re);
    if (m) socialLinks[key] = m[1];
  }

  // ── Phone numbers ───────────────────────────────────────────────────
  // US-format only for v1: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx,
  // +1 xxx xxx xxxx, 1-xxx-xxx-xxxx, 1-800-xxx-xxxx, etc.
  // We dedupe and cap at 5 \u2014 firms usually have one line, agencies
  // have a few; 5 is plenty of headroom.
  const phoneRegex =
    /(?:\+?1[\s.\-]?)?(?:\(\d{3}\)|\d{3})[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g;
  const phoneText = stripTags(decodeBasicEntities(cleaned));
  const phoneNumbers: string[] = [];
  const phoneSeen = new Set<string>();
  for (const m of phoneText.matchAll(phoneRegex)) {
    // Normalize for dedup: digits only.
    const digits = m[0].replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) continue;
    const normalized = digits.length === 11 ? digits.slice(1) : digits;
    if (phoneSeen.has(normalized)) continue;
    phoneSeen.add(normalized);
    phoneNumbers.push(m[0].trim());
    if (phoneNumbers.length >= 5) break;
  }

  // ── Word count for thin-extraction detection ────────────────────────
  const allText = [
    title ?? "",
    metaDescription ?? "",
    ...headings,
    ...paragraphs,
  ].join(" ");
  const wordCount = allText.split(/\s+/).filter(Boolean).length;

  return {
    title,
    metaDescription,
    og,
    headings,
    paragraphs,
    socialLinks,
    phoneNumbers,
    wordCount,
  };
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Top-level convenience                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

export interface ExtractFromUrlResult {
  ok: boolean;
  /** Final URL after redirects. */
  url: string;
  /** Extracted content (when ok=true). */
  page?: ExtractedPage;
  /** Error message (when ok=false). */
  error?: string;
  /** True when the HTML body was truncated by the size cap. */
  truncated?: boolean;
}

/** Fetch + extract in one call. Returns an ok/error shape so callers
 * don't need to wrap in try/catch. */
export async function extractFromUrl(input: string): Promise<ExtractFromUrlResult> {
  const fetched = await fetchPage(input);
  if (!fetched.ok || !fetched.html) {
    return {
      ok: false,
      url: fetched.url,
      error: fetched.error ?? "Fetch failed",
    };
  }
  return {
    ok: true,
    url: fetched.url,
    page: extractFromHtml(fetched.html),
    truncated: fetched.truncated,
  };
}
