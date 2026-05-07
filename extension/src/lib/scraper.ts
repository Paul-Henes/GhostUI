// Website content extraction for Voice Agent knowledge base

export interface WebsiteData {
  url: string
  title: string
  content: string
  headings: string[]
  links: string[]
  /** Short text from nav for context (where the user is) */
  navSnippet?: string
  /** Short text from footer */
  footerSnippet?: string
  metadata: {
    description?: string
    keywords?: string
  }
}

const MAX_CONTENT_LENGTH = 50_000

/**
 * Check if page has noindex meta tag (should not be indexed)
 */
function hasNoIndex(): boolean {
  const metaRobots = document.querySelector('meta[name="robots"]')
  if (metaRobots?.getAttribute("content")) {
    const content = metaRobots.getAttribute("content")?.toLowerCase() ?? ""
    if (content.includes("noindex")) return true
  }
  const metaGooglebot = document.querySelector('meta[name="googlebot"]')
  if (metaGooglebot?.getAttribute("content")) {
    const content = metaGooglebot.getAttribute("content")?.toLowerCase() ?? ""
    if (content.includes("noindex")) return true
  }
  return false
}

/**
 * Get base URL for same-origin link filtering
 */
function getBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`
}

/**
 * Extract only internal links (same domain)
 */
function extractInternalLinks(): string[] {
  const baseUrl = getBaseUrl()
  const baseHost = window.location.hostname
  const links: string[] = []
  const seen = new Set<string>()

  document.querySelectorAll("a[href]").forEach((anchor) => {
    const href = (anchor as HTMLAnchorElement).getAttribute("href")
    if (!href || href.startsWith("#") || href.startsWith("javascript:"))
      return

    try {
      const absolute = new URL(href, baseUrl)
      if (absolute.hostname === baseHost && !seen.has(absolute.href)) {
        seen.add(absolute.href)
        links.push(absolute.href)
      }
    } catch {
      // Invalid URL, skip
    }
  })

  return links
}

/**
 * Extract headings (H1–H6) in document order
 */
function extractHeadings(): string[] {
  const headings: string[] = []
  document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
    const text = el.textContent?.trim()
    if (text) headings.push(text)
  })
  return headings
}

/**
 * Clone body and remove unwanted elements before extracting text
 */
function getCleanBody(): HTMLElement {
  const clone = document.body.cloneNode(true) as HTMLElement

  // Remove scripts, styles, and navigation
  const selectors = [
    "script",
    "style",
    "noscript",
    "nav",
    "header",
    "footer",
    "[role='navigation']",
    "[role='banner']",
    "[role='contentinfo']",
    "iframe",
    "svg",
    ".hidden",
    "[hidden]",
  ]

  selectors.forEach((sel) => {
    clone.querySelectorAll(sel).forEach((el) => el.remove())
  })

  return clone
}

/**
 * Extract main text content from cleaned body
 */
function extractContent(clone: HTMLElement): string {
  let text = clone.innerText ?? clone.textContent ?? ""
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim()
  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.slice(0, MAX_CONTENT_LENGTH)
  }
  return text
}

/**
 * Extract meta description and keywords
 */
function extractMetadata(): { description?: string; keywords?: string } {
  const meta: { description?: string; keywords?: string } = {}

  const desc = document.querySelector('meta[name="description"]')
  if (desc?.getAttribute("content")) {
    meta.description = desc.getAttribute("content") ?? undefined
  }

  const keywords = document.querySelector('meta[name="keywords"]')
  if (keywords?.getAttribute("content")) {
    meta.keywords = keywords.getAttribute("content") ?? undefined
  }

  return meta
}

const SNIPPET_MAX = 800

/**
 * Extract short text from nav/header for "where the user is"
 */
function extractNavSnippet(): string | undefined {
  const nav =
    document.querySelector("nav") ||
    document.querySelector("header") ||
    document.querySelector("[role='navigation']") ||
    document.querySelector("[role='banner']")
  if (!nav) return undefined
  const text = (nav.textContent ?? "").replace(/\s+/g, " ").trim()
  return text.length > SNIPPET_MAX ? text.slice(0, SNIPPET_MAX) + "…" : text || undefined
}

/**
 * Extract short text from footer
 */
function extractFooterSnippet(): string | undefined {
  const footer =
    document.querySelector("footer") ||
    document.querySelector("[role='contentinfo']")
  if (!footer) return undefined
  const text = (footer.textContent ?? "").replace(/\s+/g, " ").trim()
  return text.length > SNIPPET_MAX ? text.slice(0, SNIPPET_MAX) + "…" : text || undefined
}

/**
 * Scrape website content for Voice Agent knowledge base.
 * Runs in page context via content script.
 * Respects noindex and limits content size.
 */
export function scrapeWebsite(): WebsiteData | null {
  if (hasNoIndex()) return null

  const clone = getCleanBody()
  const content = extractContent(clone)
  const headings = extractHeadings()
  const links = extractInternalLinks()
  const metadata = extractMetadata()
  const navSnippet = extractNavSnippet()
  const footerSnippet = extractFooterSnippet()

  return {
    url: window.location.href,
    title: document.title || "",
    content,
    headings,
    links,
    navSnippet,
    footerSnippet,
    metadata,
  }
}
