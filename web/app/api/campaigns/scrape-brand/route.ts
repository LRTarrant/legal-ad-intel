import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TortPage {
  url: string;
  title: string;
  headings: string[];
  snippet: string;
}

interface BrandScrapeResult {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  tortPages?: TortPage[];
}

/* ── Color helpers ─────────────────────────────────────────────────── */

function isNeutralColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Near-white or near-black or very low saturation
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 30 || min >= 225) return true; // near black/white
  // Gray: all channels close to each other
  if (max - min < 20 && max > 30 && min < 225) return true;
  return false;
}

function normalizeHexColor(raw: string): string | null {
  let hex = raw.trim().toLowerCase();
  if (!hex.startsWith("#")) return null;
  // #abc → #aabbcc
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null;
  return hex;
}

/* ── Extraction ────────────────────────────────────────────────────── */

function resolveUrl(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function extractLogo(html: string, baseUrl: string): string | null {
  // 1. apple-touch-icon
  const appleTouch = html.match(
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
  );
  if (appleTouch?.[1]) return resolveUrl(appleTouch[1], baseUrl);

  // 2. og:image
  const ogImage = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  );
  if (ogImage?.[1]) return resolveUrl(ogImage[1], baseUrl);

  // 3. <img> with "logo" in class/id/alt/src inside header/nav
  const headerMatch = html.match(/<(?:header|nav)[^>]*>[\s\S]*?<\/(?:header|nav)>/gi);
  if (headerMatch) {
    for (const block of headerMatch) {
      const logoImg = block.match(
        /<img[^>]*(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
      ) ?? block.match(
        /<img[^>]*src=["']([^"']*logo[^"']*)["']/i,
      );
      if (logoImg?.[1]) return resolveUrl(logoImg[1], baseUrl);
    }
  }

  // 4. Any img with "logo" anywhere in the page
  const anyLogoImg = html.match(
    /<img[^>]*(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
  ) ?? html.match(
    /<img[^>]*src=["']([^"']*logo[^"']*)["']/i,
  );
  if (anyLogoImg?.[1]) return resolveUrl(anyLogoImg[1], baseUrl);

  // 5. favicon as last resort
  const favicon = html.match(
    /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i,
  );
  if (favicon?.[1]) return resolveUrl(favicon[1], baseUrl);

  return null;
}

function extractColors(html: string, css: string): string[] {
  const allText = html + "\n" + css;
  const colors: Map<string, number> = new Map();

  // 1. CSS custom properties with "color" or "brand" in name
  const varMatches = allText.matchAll(
    /--[\w-]*(?:primary|brand|accent|color|theme)[\w-]*:\s*(#[0-9a-fA-F]{3,8})/gi,
  );
  for (const m of varMatches) {
    const hex = normalizeHexColor(m[1]);
    if (hex && !isNeutralColor(hex)) {
      colors.set(hex, (colors.get(hex) ?? 0) + 10); // high weight for named vars
    }
  }

  // 2. Background colors on header/nav/hero
  const sectionPatterns = /(?:header|nav|hero|banner|\.header|\.nav|\.hero|#header|#nav)[^{]*\{[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,8})/gi;
  const sectionMatches = allText.matchAll(sectionPatterns);
  for (const m of sectionMatches) {
    const hex = normalizeHexColor(m[1]);
    if (hex && !isNeutralColor(hex)) {
      colors.set(hex, (colors.get(hex) ?? 0) + 5);
    }
  }

  // 3. All hex colors in CSS
  const allHex = allText.matchAll(/#[0-9a-fA-F]{3,8}(?=\s|;|}|,|!|\))/g);
  for (const m of allHex) {
    const hex = normalizeHexColor(m[0]);
    if (hex && !isNeutralColor(hex)) {
      colors.set(hex, (colors.get(hex) ?? 0) + 1);
    }
  }

  // Sort by frequency and return top colors
  return [...colors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([hex]) => hex);
}

async function fetchCssFromStylesheets(html: string, baseUrl: string): Promise<string> {
  const linkMatches = html.matchAll(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi,
  );
  const cssUrls: string[] = [];
  for (const m of linkMatches) {
    cssUrls.push(resolveUrl(m[1], baseUrl));
  }

  // Fetch up to 3 stylesheets with short timeout
  const results = await Promise.allSettled(
    cssUrls.slice(0, 3).map(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "LegalAdIntel/1.0 BrandScraper" },
        });
        if (!res.ok) return "";
        return await res.text();
      } catch {
        return "";
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value)
    .join("\n");
}

/* ── Tort-specific page scanning ──────────────────────────────────── */

function tortSlug(tortName: string): string {
  return tortName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function buildTortPatterns(baseUrl: string, tortName: string): string[] {
  const slug = tortSlug(tortName);
  const origin = baseUrl.replace(/\/$/, "");
  return [
    `${origin}/${slug}`,
    `${origin}/${slug}-lawsuit`,
    `${origin}/mass-tort/${slug}`,
    `${origin}/practice-areas/${slug}`,
    `${origin}/cases/${slug}`,
  ];
}

function extractPageTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? "";
}

function extractPageHeadings(html: string): string[] {
  const headings: string[] = [];
  const matches = html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi);
  for (const m of matches) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) headings.push(text);
    if (headings.length >= 5) break;
  }
  return headings;
}

function extractPageSnippet(html: string): string {
  // Try meta description first
  const metaDesc = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
  );
  if (metaDesc?.[1]?.trim()) return metaDesc[1].trim().slice(0, 500);

  // Fall back to first <p> content
  const paragraphs = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  const chunks: string[] = [];
  for (const m of paragraphs) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 20) chunks.push(text);
    if (chunks.join(" ").length >= 500) break;
  }
  return chunks.join(" ").slice(0, 500);
}

async function scanTortPages(baseUrl: string, tortName: string): Promise<TortPage[]> {
  const urls = buildTortPatterns(baseUrl, tortName);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; LegalAdIntel/1.0; +https://legaladvisory.com/bot)",
            Accept: "text/html,application/xhtml+xml",
          },
          redirect: "follow",
        });
        if (!res.ok) return null;
        const html = await res.text();
        return {
          url,
          title: extractPageTitle(html),
          headings: extractPageHeadings(html),
          snippet: extractPageSnippet(html),
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<TortPage | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((p): p is TortPage => p !== null);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, tort_name } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(parsedUrl.href, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LegalAdIntel/1.0; +https://legaladvisory.com/bot)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json<BrandScrapeResult>({
          logoUrl: null,
          primaryColor: null,
          secondaryColor: null,
          accentColor: null,
        });
      }

      const html = await response.text();
      const baseUrl = parsedUrl.origin;

      // Extract logo, CSS, and tort pages in parallel
      const [logo, externalCss, tortPagesResult] = await Promise.allSettled([
        Promise.resolve(extractLogo(html, baseUrl)),
        fetchCssFromStylesheets(html, baseUrl),
        tort_name && typeof tort_name === "string"
          ? scanTortPages(baseUrl, tort_name)
          : Promise.resolve([]),
      ]);

      const logoUrl = logo.status === "fulfilled" ? logo.value : null;
      const css = externalCss.status === "fulfilled" ? externalCss.value : "";
      const topColors = extractColors(html, css);
      const tortPages =
        tortPagesResult.status === "fulfilled" ? tortPagesResult.value : [];

      const result: BrandScrapeResult = {
        logoUrl,
        primaryColor: topColors[0] ?? null,
        secondaryColor: topColors[1] ?? null,
        accentColor: topColors[2] ?? null,
        ...(tortPages.length > 0 ? { tortPages } : {}),
      };

      return NextResponse.json(result);
    } catch (err) {
      clearTimeout(timeout);
      // On any failure, return empty gracefully
      return NextResponse.json<BrandScrapeResult>({
        logoUrl: null,
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
      });
    }
  } catch {
    return NextResponse.json<BrandScrapeResult>({
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
    });
  }
}
