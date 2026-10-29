import * as cheerio from "cheerio";

export interface CrawledPage {
  url: string;
  title: string;
  description: string;
  content: string; // Cleaned Markdown / plain semantic text
  charCount: number;
  size: string;
}

export interface CrawlResult {
  rootUrl: string;
  totalPagesDiscovered: number;
  pagesCrawled: number;
  pages: CrawledPage[];
}

export interface CrawlProgressEvent {
  stage: "discovering" | "crawling" | "cleaning" | "indexing" | "completed" | "error";
  message: string;
  discoveredCount?: number;
  crawledCount?: number;
  currentUrl?: string;
  pages?: CrawledPage[];
  error?: string;
}

const IGNORED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp", "tiff",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "zip", "tar", "gz", "rar", "7z", "bz2",
  "mp4", "mp3", "wav", "avi", "mov", "wmv", "flv", "webm", "ogg",
  "css", "js", "mjs", "json", "xml", "rss", "atom",
  "woff", "woff2", "ttf", "eot", "otf"
]);

/**
 * Normalizes a URL, stripping hashes, trailing slashes (except root), and tracking parameters
 */
export function normalizeUrl(rawUrl: string, base?: string): string | null {
  try {
    let parsed: URL;
    if (base) {
      parsed = new URL(rawUrl, base);
    } else {
      parsed = new URL(rawUrl);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // Clean tracking query params
    const searchParams = new URLSearchParams(parsed.search);
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref", "source", "yclid", "_ga", "_gl"
    ];
    for (const p of trackingParams) {
      searchParams.delete(p);
    }
    parsed.search = searchParams.toString();
    parsed.hash = "";

    // Normalize pathname
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Checks whether two URLs belong to the same domain / hostname
 */
export function isSameDomain(urlA: string, urlB: string): boolean {
  try {
    const hostA = new URL(urlA).hostname.replace(/^www\./, "").toLowerCase();
    const hostB = new URL(urlB).hostname.replace(/^www\./, "").toLowerCase();
    return hostA === hostB;
  } catch {
    return false;
  }
}

/**
 * Checks if URL ends with an ignored static asset file extension
 */
export function isIgnoredAsset(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    const path = parsed.pathname.toLowerCase();
    const lastPart = path.split("/").pop() || "";
    if (lastPart.includes(".")) {
      const ext = lastPart.split(".").pop() || "";
      if (IGNORED_EXTENSIONS.has(ext)) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Extracts and cleans HTML content into semantic Markdown / structured text
 * Removes navbars, footers, scripts, styles, boilerplate, and ads
 */
export function extractCleanContent(html: string, pageUrl: string): {
  title: string;
  description: string;
  markdown: string;
} {
  const $ = cheerio.load(html);

  // 1. Extract Meta Title
  let title = $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    pageUrl;

  // Clean title (remove common site suffixes like " | MyCompany")
  title = title.replace(/\s+/g, " ").trim();

  // 2. Extract Meta Description
  const description = $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  // 3. Remove non-content, noise, navigation, and boilerplate tags
  const selectorsToRemove = [
    "script", "style", "noscript", "svg", "canvas", "iframe",
    "nav", "footer", "header", "aside",
    ".nav", ".navbar", ".menu", ".header", ".footer", ".sidebar",
    ".cookie", ".cookie-consent", ".cookie-banner", ".banner",
    ".advertisement", ".ads", ".ad", ".social-share", ".share-buttons",
    ".modal", ".popup", ".toast", ".dialog",
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '[aria-hidden="true"]'
  ];

  selectorsToRemove.forEach((sel) => {
    $(sel).remove();
  });

  // 4. Focus on main content area if available
  let $contentContainer: any = null;
  const contentSelectors = [
    "main",
    "article",
    '[role="main"]',
    "#content",
    ".content",
    ".post-content",
    ".article-content",
    ".entry-content",
    ".page-content",
    ".container"
  ];

  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length > 0 && el.text().trim().length > 100) {
      $contentContainer = el.first();
      break;
    }
  }

  if (!$contentContainer || $contentContainer.length === 0) {
    $contentContainer = $("body");
  }

  // 5. Transform headings and structural tags into semantic Markdown
  $contentContainer.find("h1").each((_: any, el: any) => {
    const text = $(el).text().trim();
    if (text) $(el).replaceWith(`\n\n# ${text}\n\n`);
  });

  $contentContainer.find("h2").each((_: any, el: any) => {
    const text = $(el).text().trim();
    if (text) $(el).replaceWith(`\n\n## ${text}\n\n`);
  });

  $contentContainer.find("h3").each((_: any, el: any) => {
    const text = $(el).text().trim();
    if (text) $(el).replaceWith(`\n\n### ${text}\n\n`);
  });

  $contentContainer.find("h4, h5, h6").each((_: any, el: any) => {
    const text = $(el).text().trim();
    if (text) $(el).replaceWith(`\n\n#### ${text}\n\n`);
  });

  $contentContainer.find("p").each((_: any, el: any) => {
    const text = $(el).text().trim();
    if (text) $(el).replaceWith(`\n\n${text}\n\n`);
  });

  $contentContainer.find("li").each((_: any, el: any) => {
    const text = $(el).text().trim();
    if (text) $(el).replaceWith(`\n- ${text}`);
  });

  $contentContainer.find("blockquote").each((_: any, el: any) => {
    const text = $(el).text().trim();
    if (text) $(el).replaceWith(`\n\n> ${text}\n\n`);
  });

  $contentContainer.find("br").replaceWith("\n");

  $contentContainer.find("table").each((_: any, el: any) => {
    const rows: string[] = [];
    $(el).find("tr").each((_: any, tr: any) => {
      const cells: string[] = [];
      $(tr).find("th, td").each((_: any, cell: any) => {
        cells.push($(cell).text().trim().replace(/\|/g, "-"));
      });
      if (cells.length > 0) {
        rows.push(`| ${cells.join(" | ")} |`);
      }
    });
    if (rows.length > 0) {
      $(el).replaceWith(`\n\n${rows.join("\n")}\n\n`);
    }
  });

  // Extract text content and format whitespace
  let rawText = $contentContainer.text();

  // Normalize spaces & line breaks
  let cleaned = rawText
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Prepend title and description if not present
  const headerParts: string[] = [];
  if (title) headerParts.push(`# ${title}`);
  if (description) headerParts.push(`> ${description}`);
  if (pageUrl) headerParts.push(`Source URL: ${pageUrl}`);

  const fullMarkdown = headerParts.length > 0
    ? `${headerParts.join("\n\n")}\n\n---\n\n${cleaned}`
    : cleaned;

  return {
    title,
    description,
    markdown: fullMarkdown,
  };
}

/**
 * Attempts to parse sitemap.xml to discover pages quickly
 */
export async function discoverSitemapUrls(rootUrl: string, maxPages: number = 30): Promise<string[]> {
  const discovered = new Set<string>();
  try {
    const parsedRoot = new URL(rootUrl);
    const origin = parsedRoot.origin;
    const candidates = [
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`,
      `${origin}/wp-sitemap.xml`,
    ];

    for (const sitemapUrl of candidates) {
      if (discovered.size >= maxPages) break;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(sitemapUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MatchaCrawler/1.0",
            Accept: "application/xml, text/xml, */*",
          },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const xml = await res.text();
          const $ = cheerio.load(xml, { xmlMode: true });
          $("loc").each((_, locEl) => {
            const locText = $(locEl).text().trim();
            const norm = normalizeUrl(locText);
            if (norm && isSameDomain(norm, rootUrl) && !isIgnoredAsset(norm)) {
              discovered.add(norm);
            }
          });
        }
      } catch {
        // Silently continue to next candidate
      }
    }
  } catch (err) {
    console.warn("[Sitemap Discovery Warning]:", err);
  }

  return Array.from(discovered).slice(0, maxPages);
}

export interface CrawlWebsiteOptions {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  onProgress?: (progress: CrawlProgressEvent) => void;
}

/**
 * Main Web Crawler: crawls pages using BFS starting from root URL,
 * parses links, extracts clean Markdown, and reports progress.
 */
export async function crawlWebsite(options: CrawlWebsiteOptions): Promise<CrawlResult> {
  const normalizedRoot = normalizeUrl(options.url);
  if (!normalizedRoot) {
    throw new Error("URL เว็บไซต์ไม่ถูกต้อง กรุณาระบุ URL ที่ขึ้นต้นด้วย http:// หรือ https://");
  }

  const maxDepth = Math.min(Math.max(options.maxDepth ?? 2, 1), 4);
  const maxPages = Math.min(Math.max(options.maxPages ?? 15, 1), 50);

  options.onProgress?.({
    stage: "discovering",
    message: "กำลังค้นหาหน้าเว็บและอ่านโครงสร้าง Sitemap...",
    discoveredCount: 1,
    crawledCount: 0,
    currentUrl: normalizedRoot,
  });

  // 1. Discover URLs from sitemap
  const sitemapUrls = await discoverSitemapUrls(normalizedRoot, maxPages);
  
  const queue: { url: string; depth: number }[] = [{ url: normalizedRoot, depth: 0 }];
  const discoveredSet = new Set<string>([normalizedRoot]);

  // Seed with discovered sitemap URLs
  for (const sUrl of sitemapUrls) {
    if (!discoveredSet.has(sUrl)) {
      discoveredSet.add(sUrl);
      queue.push({ url: sUrl, depth: 1 });
    }
  }

  options.onProgress?.({
    stage: "crawling",
    message: `ค้นพบ ${discoveredSet.size} หน้า พร้อมเริ่มดึงข้อมูล...`,
    discoveredCount: discoveredSet.size,
    crawledCount: 0,
    currentUrl: normalizedRoot,
  });

  const crawledPages: CrawledPage[] = [];
  const visitedSet = new Set<string>();

  while (queue.length > 0 && crawledPages.length < maxPages) {
    const current = queue.shift();
    if (!current) break;

    const { url, depth } = current;
    if (visitedSet.has(url)) continue;
    visitedSet.add(url);

    options.onProgress?.({
      stage: "crawling",
      message: `กำลังอ่านหน้าที่ ${crawledPages.length + 1} จาก ${discoveredSet.size} หน้า...`,
      discoveredCount: discoveredSet.size,
      crawledCount: crawledPages.length,
      currentUrl: url,
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) MatchaCrawler/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        continue;
      }

      const html = await res.text();
      if (!html || html.length < 100) continue;

      // Extract Clean Markdown & Structural Info
      const { title, description, markdown } = extractCleanContent(html, url);

      // Require at least minimal meaningful content
      if (markdown.length >= 80) {
        crawledPages.push({
          url,
          title: title || `หน้าเว็บ: ${url}`,
          description,
          content: markdown,
          charCount: markdown.length,
          size: `${(new Blob([markdown]).size / 1024).toFixed(1)} KB`,
        });
      }

      // Discover internal links if depth limit allows
      if (depth < maxDepth && discoveredSet.size < maxPages * 2) {
        const $ = cheerio.load(html);
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (!href) return;

          const absolute = normalizeUrl(href, url);
          if (
            absolute &&
            isSameDomain(absolute, normalizedRoot) &&
            !isIgnoredAsset(absolute) &&
            !discoveredSet.has(absolute)
          ) {
            discoveredSet.add(absolute);
            queue.push({ url: absolute, depth: depth + 1 });
          }
        });
      }
    } catch (err: any) {
      console.warn(`[Crawl Skip] ${url}:`, err.message || err);
    }
  }

  options.onProgress?.({
    stage: "completed",
    message: `ดึงข้อมูลเสร็จสมบูรณ์ อ่านเนื้อหาทั้งหมด ${crawledPages.length} หน้า`,
    discoveredCount: discoveredSet.size,
    crawledCount: crawledPages.length,
    pages: crawledPages,
  });

  return {
    rootUrl: normalizedRoot,
    totalPagesDiscovered: discoveredSet.size,
    pagesCrawled: crawledPages.length,
    pages: crawledPages,
  };
}
