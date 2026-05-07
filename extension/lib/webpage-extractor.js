/**
 * Ghost UI - WebPage Content Extractor
 * 
 * Extracts and processes webpage content for AI analysis.
 * Handles DOM parsing, content cleaning, and text chunking.
 * 
 * Features:
 * - Extract visible text, headings, links, and metadata
 * - Clean content (remove scripts, styles, hidden elements)
 * - Chunk content to fit token limits
 * - Fetch same-origin subpages (optional)
 */

const WebPageExtractor = {
  // Configuration
  config: {
    maxContentLength: 12000, // ~3000 tokens for context
    maxChunkSize: 4000,
    excludeSelectors: [
      'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
      'nav', 'footer', 'aside', '.advertisement', '.ad', '.ads',
      '[aria-hidden="true"]', '.hidden', '.sr-only', '.visually-hidden',
      '#liquid-glass-root' // Exclude our own chatbot
    ],
    importantSelectors: [
      'main', 'article', '[role="main"]', '.content', '#content',
      '.post', '.entry', '.article-body'
    ]
  },

  /**
   * Extract all relevant content from the current page
   * @returns {Object} Extracted page data
   */
  extractCurrentPage() {
    const pageData = {
      url: window.location.href,
      origin: window.location.origin,
      title: document.title,
      meta: this._extractMeta(),
      headings: this._extractHeadings(),
      mainContent: this._extractMainContent(),
      links: this._extractLinks(),
      timestamp: new Date().toISOString()
    };

    return pageData;
  },

  /**
   * Extract metadata from the page
   * @returns {Object} Page metadata
   */
  _extractMeta() {
    const meta = {
      description: '',
      keywords: '',
      author: '',
      ogTitle: '',
      ogDescription: ''
    };

    // Standard meta tags
    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) meta.description = descTag.getAttribute('content') || '';

    const keywordsTag = document.querySelector('meta[name="keywords"]');
    if (keywordsTag) meta.keywords = keywordsTag.getAttribute('content') || '';

    const authorTag = document.querySelector('meta[name="author"]');
    if (authorTag) meta.author = authorTag.getAttribute('content') || '';

    // Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) meta.ogTitle = ogTitle.getAttribute('content') || '';

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) meta.ogDescription = ogDesc.getAttribute('content') || '';

    return meta;
  },

  /**
   * Extract all headings with hierarchy
   * @returns {Array} Array of heading objects
   */
  _extractHeadings() {
    const headings = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headingElements.forEach((el, index) => {
      // Skip hidden elements
      if (!this._isVisible(el)) return;
      // Skip our chatbot elements
      if (el.closest('#liquid-glass-root')) return;

      const text = el.textContent.trim();
      if (text) {
        headings.push({
          level: parseInt(el.tagName[1]),
          text: text.substring(0, 200), // Limit length
          index
        });
      }
    });

    return headings;
  },

  /**
   * Extract main content text from the page
   * @returns {string} Cleaned main content
   */
  _extractMainContent() {
    // Try to find main content area first
    let contentElement = null;

    for (const selector of this.config.importantSelectors) {
      const el = document.querySelector(selector);
      if (el && this._isVisible(el)) {
        contentElement = el;
        break;
      }
    }

    // Fall back to body if no main content area found
    if (!contentElement) {
      contentElement = document.body;
    }

    // Clone to avoid modifying the actual DOM
    const clone = contentElement.cloneNode(true);

    // Remove excluded elements
    this.config.excludeSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Extract and clean text
    let text = this._extractText(clone);

    // Clean up whitespace
    text = this._cleanText(text);

    // Truncate if too long
    if (text.length > this.config.maxContentLength) {
      text = text.substring(0, this.config.maxContentLength) + '...';
    }

    return text;
  },

  /**
   * Extract text content from an element
   * @param {Element} element 
   * @returns {string} Text content
   */
  _extractText(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip empty text nodes
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip if parent is hidden
          if (!this._isVisible(node.parentElement)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textParts = [];
    let node;
    while (node = walker.nextNode()) {
      textParts.push(node.textContent.trim());
    }

    return textParts.join(' ');
  },

  /**
   * Clean and normalize text content
   * @param {string} text 
   * @returns {string} Cleaned text
   */
  _cleanText(text) {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim
      .trim();
  },

  /**
   * Extract links from the page with categorization
   * @returns {Array} Array of link objects with category info
   */
  _extractLinks() {
    const links = [];
    const seenUrls = new Set();
    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname;

    document.querySelectorAll('a[href]').forEach(el => {
      // Skip hidden links
      if (!this._isVisible(el)) return;
      // Skip our chatbot elements
      if (el.closest('#liquid-glass-root')) return;

      try {
        const href = el.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

        const url = new URL(href, window.location.href);
        const absoluteUrl = url.href;

        // Skip if already seen or same page
        if (seenUrls.has(absoluteUrl)) return;
        if (url.pathname === currentPath && url.origin === currentOrigin) return;
        seenUrls.add(absoluteUrl);

        const isSameOrigin = url.origin === currentOrigin;
        const text = el.textContent.trim().substring(0, 100);
        
        // Determine link category
        const category = this._categorizeLinkElement(el, url, text);

        const linkData = {
          url: absoluteUrl,
          text: text,
          isSameOrigin: isSameOrigin,
          isInternal: url.hostname === window.location.hostname,
          category: category,
          // Additional context for ranking
          isNavigation: category === 'navigation',
          isMainContent: category === 'content',
          ariaLabel: el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || ''
        };

        links.push(linkData);
      } catch (e) {
        // Invalid URL, skip
      }
    });

    // Sort by relevance: navigation links first, then content
    links.sort((a, b) => {
      const categoryPriority = { navigation: 0, content: 1, footer: 2, other: 3 };
      return (categoryPriority[a.category] || 3) - (categoryPriority[b.category] || 3);
    });

    // Limit number of links
    return links.slice(0, 50);
  },

  /**
   * Categorize a link element based on its context
   * @param {Element} el - Link element
   * @param {URL} url - Parsed URL
   * @param {string} text - Link text
   * @returns {string} Category: 'navigation', 'content', 'footer', 'other'
   */
  _categorizeLinkElement(el, url, text) {
    // Check parent elements for context
    const parent = el.closest('nav, header, footer, main, article, aside, [role="navigation"], [role="main"]');
    
    if (parent) {
      const tagName = parent.tagName.toLowerCase();
      const role = parent.getAttribute('role');
      
      if (tagName === 'nav' || role === 'navigation') return 'navigation';
      if (tagName === 'header') return 'navigation';
      if (tagName === 'footer') return 'footer';
      if (tagName === 'main' || tagName === 'article' || role === 'main') return 'content';
      if (tagName === 'aside') return 'other';
    }

    // Check class names for hints
    const classNames = (el.className + ' ' + (el.parentElement?.className || '')).toLowerCase();
    if (classNames.includes('nav') || classNames.includes('menu')) return 'navigation';
    if (classNames.includes('footer')) return 'footer';
    if (classNames.includes('content') || classNames.includes('article')) return 'content';

    // Check URL patterns for common page types
    const path = url.pathname.toLowerCase();
    const navigationPatterns = [
      '/about', '/pricing', '/features', '/faq', '/help', '/docs',
      '/documentation', '/guide', '/support', '/contact', '/services',
      '/products', '/solutions', '/overview', '/getting-started'
    ];
    
    if (navigationPatterns.some(p => path.includes(p))) return 'navigation';

    return 'other';
  },

  /**
   * Check if an element is visible
   * @param {Element} element 
   * @returns {boolean}
   */
  _isVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           element.offsetParent !== null;
  },

  /**
   * Fetch and extract content from a same-origin subpage
   * @param {string} url - URL to fetch
   * @returns {Promise<Object>} Extracted page data
   */
  async fetchSubpage(url) {
    try {
      const pageUrl = new URL(url);
      
      // Security check: same origin only
      if (pageUrl.origin !== window.location.origin) {
        throw new Error('Cross-origin requests not allowed');
      }

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'text/html'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract content from parsed document
      return this._extractFromDocument(doc, url);
    } catch (error) {
      console.warn('[Ghost UI] Failed to fetch subpage:', url, error);
      return null;
    }
  },

  /**
   * Extract content from a parsed document
   * @param {Document} doc - Parsed HTML document
   * @param {string} url - Source URL
   * @returns {Object} Extracted data
   */
  _extractFromDocument(doc, url) {
    // Similar extraction logic but for parsed document
    const title = doc.title || '';
    
    // Extract headings
    const headings = [];
    doc.querySelectorAll('h1, h2, h3').forEach((el, index) => {
      const text = el.textContent.trim();
      if (text) {
        headings.push({
          level: parseInt(el.tagName[1]),
          text: text.substring(0, 200),
          index
        });
      }
    });

    // Extract main content
    let contentElement = doc.querySelector('main, article, [role="main"], .content, #content');
    if (!contentElement) {
      contentElement = doc.body;
    }

    // Clone and clean
    const clone = contentElement.cloneNode(true);
    this.config.excludeSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    let text = clone.textContent || '';
    text = this._cleanText(text);
    
    if (text.length > this.config.maxChunkSize) {
      text = text.substring(0, this.config.maxChunkSize) + '...';
    }

    return {
      url,
      title,
      headings,
      content: text,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Fetch multiple same-origin subpages
   * @param {Array<string>} urls - URLs to fetch
   * @param {number} maxPages - Maximum pages to fetch
   * @returns {Promise<Array>} Array of extracted page data
   */
  async fetchSubpages(urls, maxPages = 3) {
    const sameOriginUrls = urls
      .filter(url => {
        try {
          return new URL(url).origin === window.location.origin;
        } catch {
          return false;
        }
      })
      .slice(0, maxPages);

    const results = await Promise.all(
      sameOriginUrls.map(url => this.fetchSubpage(url))
    );

    return results.filter(Boolean);
  },

  /**
   * Create a summary context string for AI
   * NOTE: URLs are intentionally omitted from the context sent to OpenAI
   * to comply with security requirements. Only cleaned text content is included.
   * @param {Object} pageData - Extracted page data
   * @param {Array} subpages - Optional subpage data
   * @returns {string} Formatted context string (no URLs)
   */
  createContextString(pageData, subpages = []) {
    let context = '';

    // Current page context (without URL for security)
    context += `=== Current Page ===\n`;
    context += `Title: ${pageData.title}\n`;

    if (pageData.meta.description) {
      context += `Description: ${pageData.meta.description}\n`;
    }

    if (pageData.headings.length > 0) {
      context += `\nPage Structure:\n`;
      pageData.headings.slice(0, 10).forEach(h => {
        context += `${'#'.repeat(h.level)} ${h.text}\n`;
      });
    }

    context += `\nMain Content:\n${pageData.mainContent}\n`;

    // Subpage context (if any) - titles and content only, no URLs
    if (subpages.length > 0) {
      context += `\n=== Related Pages (User-Approved) ===\n`;
      subpages.forEach((page, index) => {
        context += `\n--- Page ${index + 1}: ${page.title || 'Untitled'} ---\n`;
        // Include headings if available
        if (page.headings && page.headings.length > 0) {
          context += `Structure:\n`;
          page.headings.slice(0, 5).forEach(h => {
            context += `${'#'.repeat(h.level)} ${h.text}\n`;
          });
          context += `\n`;
        }
        // Truncate content to reasonable length
        const contentLimit = Math.min(2500, Math.floor(8000 / (subpages.length + 1)));
        context += page.content.substring(0, contentLimit);
        if (page.content.length > contentLimit) {
          context += '\n[Content truncated...]\n';
        }
        context += '\n';
      });
    }

    // Note about available navigation (text only, no URLs)
    const navigationLinks = pageData.links
      .filter(l => l.isSameOrigin && l.category === 'navigation')
      .slice(0, 8);

    if (navigationLinks.length > 0) {
      context += `\n=== Site Navigation (for reference) ===\n`;
      navigationLinks.forEach(link => {
        context += `- ${link.text || 'Link'}\n`;
      });
    }

    return context;
  },

  /**
   * Chunk content into smaller pieces for token limits
   * @param {string} content - Content to chunk
   * @param {number} chunkSize - Maximum chunk size
   * @returns {Array<string>} Array of chunks
   */
  chunkContent(content, chunkSize = this.config.maxChunkSize) {
    if (content.length <= chunkSize) {
      return [content];
    }

    const chunks = [];
    let remaining = content;

    while (remaining.length > 0) {
      if (remaining.length <= chunkSize) {
        chunks.push(remaining);
        break;
      }

      // Find a good breaking point (end of sentence or paragraph)
      let breakPoint = chunkSize;
      const sentenceEnd = remaining.lastIndexOf('. ', chunkSize);
      const paragraphEnd = remaining.lastIndexOf('\n\n', chunkSize);

      if (paragraphEnd > chunkSize * 0.5) {
        breakPoint = paragraphEnd + 2;
      } else if (sentenceEnd > chunkSize * 0.5) {
        breakPoint = sentenceEnd + 2;
      }

      chunks.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint).trim();
    }

    return chunks;
  }
};

// Export for use in extension
if (typeof window !== 'undefined') {
  window.WebPageExtractor = WebPageExtractor;
}

// ============================================
// Sitemap Discovery Module
// Token-efficient sitemap-based URL discovery
// Sitemap data is NEVER sent to OpenAI - only used locally
// ============================================

const SitemapDiscovery = {
  // Configuration
  config: {
    // Asset file extensions to exclude
    excludeExtensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp',
      '.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv', '.mkv',
      '.mp3', '.wav', '.ogg', '.flac', '.aac',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.zip', '.rar', '.7z', '.tar', '.gz',
      '.css', '.js', '.json', '.xml', '.woff', '.woff2', '.ttf', '.eot'
    ],
    // URL patterns to exclude (parameterized, tracking, etc.)
    excludePatterns: [
      /[?&](utm_|ref=|source=|campaign=)/i,
      /[?&](page|p|offset|limit)=\d+/i,
      /\/(tag|tags|category|categories|author)\//i,
      /\/(feed|rss|atom)\/?$/i,
      /\/(wp-admin|wp-content|wp-includes)\//i,
      /\/_next\//i,
      /\/api\//i,
      /\/static\//i,
      /\/assets\//i,
      /\/cdn-cgi\//i,
      /#.+$/,
      /\/page\/\d+\/?$/i,
      /\/\d{4}\/\d{2}\/\d{2}\// // Date-based archives
    ],
    // Maximum URLs to keep from sitemap
    maxUrls: 100,
    // Fetch timeout in ms
    fetchTimeout: 5000
  },

  // Cached sitemap data
  _cache: {
    urls: null,
    origin: null,
    timestamp: null
  },

  /**
   * Fetch and parse sitemap.xml from the current origin
   * Tries multiple common sitemap locations and robots.txt fallback
   * 
   * @returns {Promise<Array<string>>} Array of filtered URLs (never sent to OpenAI)
   */
  async discoverUrls() {
    const currentOrigin = window.location.origin;

    // Return cached results if valid (same origin, fresh)
    if (this._cache.urls !== null && 
        this._cache.origin === currentOrigin &&
        this._cache.timestamp && 
        (Date.now() - this._cache.timestamp) < 300000) { // 5 min cache
      console.log('[SitemapDiscovery] Using cached sitemap URLs:', this._cache.urls.length);
      return this._cache.urls;
    }

    // Try to find sitemap URL from robots.txt first
    let sitemapUrls = await this._findSitemapFromRobots(currentOrigin);
    
    // Add common sitemap locations as fallback
    const commonSitemaps = [
      `${currentOrigin}/sitemap.xml`,
      `${currentOrigin}/sitemap_index.xml`,
      `${currentOrigin}/sitemap-index.xml`,
      `${currentOrigin}/sitemaps/sitemap.xml`,
      `${currentOrigin}/wp-sitemap.xml`
    ];
    
    // Merge without duplicates
    sitemapUrls = [...new Set([...sitemapUrls, ...commonSitemaps])];

    let allUrls = [];
    
    // Try each sitemap URL until we find one that works
    for (const sitemapUrl of sitemapUrls) {
      try {
        console.log('[SitemapDiscovery] Trying sitemap:', sitemapUrl);
        const urls = await this._fetchSitemap(sitemapUrl, currentOrigin);
        if (urls.length > 0) {
          allUrls = urls;
          console.log('[SitemapDiscovery] Found', urls.length, 'URLs in', sitemapUrl);
          break;
        }
      } catch (error) {
        console.log('[SitemapDiscovery] Failed to fetch', sitemapUrl);
      }
    }

    // If no sitemap found, extract links from current page as fallback
    if (allUrls.length === 0) {
      console.log('[SitemapDiscovery] No sitemap found, extracting page links');
      allUrls = this._extractPageLinks(currentOrigin);
    }

    const filteredUrls = this._filterUrls(allUrls, currentOrigin);

    // Cache results
    this._cache = {
      urls: filteredUrls,
      origin: currentOrigin,
      timestamp: Date.now()
    };

    console.log('[SitemapDiscovery] Total discovered URLs:', filteredUrls.length);
    return filteredUrls;
  },

  /**
   * Find sitemap URLs from robots.txt
   */
  async _findSitemapFromRobots(origin) {
    try {
      const response = await fetch(`${origin}/robots.txt`, {
        method: 'GET',
        credentials: 'same-origin'
      });
      
      if (!response.ok) return [];
      
      const text = await response.text();
      const sitemapUrls = [];
      
      // Extract Sitemap: directives from robots.txt
      const lines = text.split('\n');
      for (const line of lines) {
        const match = line.match(/^Sitemap:\s*(.+)$/i);
        if (match) {
          const url = match[1].trim();
          if (url.startsWith(origin)) {
            sitemapUrls.push(url);
          }
        }
      }
      
      console.log('[SitemapDiscovery] Found', sitemapUrls.length, 'sitemaps in robots.txt');
      return sitemapUrls;
    } catch (error) {
      return [];
    }
  },

  /**
   * Fetch a single sitemap URL
   */
  async _fetchSitemap(sitemapUrl, currentOrigin) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.fetchTimeout);

    try {
      const response = await fetch(sitemapUrl, {
        method: 'GET',
        credentials: 'same-origin',
        signal: controller.signal,
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const xmlText = await response.text();
      return this._parseSitemapXML(xmlText, currentOrigin);
    } catch (error) {
      clearTimeout(timeoutId);
      return [];
    }
  },

  /**
   * Extract internal links from current page as fallback
   */
  _extractPageLinks(currentOrigin) {
    const links = [];
    const seen = new Set();
    
    document.querySelectorAll('a[href]').forEach(a => {
      try {
        const url = new URL(a.href);
        if (url.origin === currentOrigin && !seen.has(url.pathname)) {
          seen.add(url.pathname);
          links.push(url.href);
        }
      } catch {}
    });
    
    // Also check navigation elements specifically
    document.querySelectorAll('nav a[href], header a[href], [role="navigation"] a[href]').forEach(a => {
      try {
        const url = new URL(a.href);
        if (url.origin === currentOrigin && !seen.has(url.pathname)) {
          seen.add(url.pathname);
          links.push(url.href);
        }
      } catch {}
    });
    
    console.log('[SitemapDiscovery] Extracted', links.length, 'links from page');
    return links;
  },

  /**
   * Parse sitemap XML and extract URLs
   * Supports both standard sitemap and sitemap index formats
   * 
   * @param {string} xmlText - Raw XML content
   * @param {string} currentOrigin - Current page origin for validation
   * @returns {Array<string>} Array of URLs found in sitemap
   */
  _parseSitemapXML(xmlText, currentOrigin) {
    const urls = [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');

      // Check for parse errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        console.warn('[SitemapDiscovery] XML parse error');
        return [];
      }

      // Standard sitemap format: <urlset><url><loc>...</loc></url></urlset>
      const locElements = doc.querySelectorAll('url > loc, urlset > url > loc');
      locElements.forEach(loc => {
        const url = loc.textContent?.trim();
        if (url) urls.push(url);
      });

      // Sitemap index format: <sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>
      // We extract referenced sitemaps but DON'T fetch them (to avoid crawling)
      const sitemapLocs = doc.querySelectorAll('sitemap > loc, sitemapindex > sitemap > loc');
      if (sitemapLocs.length > 0 && urls.length === 0) {
        console.log('[SitemapDiscovery] Found sitemap index with', sitemapLocs.length, 'references (not fetching nested sitemaps)');
        // For sitemap indexes, we could optionally fetch the first nested sitemap
        // But to stay token-efficient and avoid crawling, we skip this
      }

      return urls;
    } catch (error) {
      console.warn('[SitemapDiscovery] Failed to parse sitemap:', error);
      return [];
    }
  },

  /**
   * Filter URLs to keep only relevant page URLs
   * 
   * @param {Array<string>} urls - URLs from sitemap
   * @param {string} currentOrigin - Current page origin
   * @returns {Array<string>} Filtered URLs
   */
  _filterUrls(urls, currentOrigin) {
    const currentPath = window.location.pathname;
    const seenPaths = new Set();
    const filtered = [];

    for (const urlString of urls) {
      try {
        const url = new URL(urlString);

        // Same-origin only
        if (url.origin !== currentOrigin) continue;

        // Skip current page
        if (url.pathname === currentPath) continue;

        // Skip duplicates (normalize by removing trailing slash)
        const normalizedPath = url.pathname.replace(/\/$/, '') || '/';
        if (seenPaths.has(normalizedPath)) continue;
        seenPaths.add(normalizedPath);

        // Skip asset files
        const hasAssetExtension = this.config.excludeExtensions.some(ext => 
          url.pathname.toLowerCase().endsWith(ext)
        );
        if (hasAssetExtension) continue;

        // Skip excluded URL patterns
        const matchesExcludePattern = this.config.excludePatterns.some(pattern =>
          pattern.test(urlString)
        );
        if (matchesExcludePattern) continue;

        // Skip URLs with too many path segments (likely deep/dynamic content)
        const pathSegments = url.pathname.split('/').filter(Boolean);
        if (pathSegments.length > 5) continue;

        filtered.push(urlString);

        // Respect max limit
        if (filtered.length >= this.config.maxUrls) break;

      } catch (error) {
        // Invalid URL, skip
        continue;
      }
    }

    return filtered;
  },

  /**
   * Get sitemap URLs with basic metadata for ranking
   * This creates lightweight objects for local processing only
   * 
   * @returns {Promise<Array<Object>>} Array of URL objects with metadata
   */
  async getUrlsWithMetadata() {
    const urls = await this.discoverUrls();
    
    return urls.map(urlString => {
      try {
        const url = new URL(urlString);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // Infer page name from path
        const lastPart = pathParts[pathParts.length - 1] || 'home';
        const pageName = lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, '')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

        return {
          url: urlString,
          path: url.pathname,
          text: pageName, // Fallback text for display
          pathDepth: pathParts.length,
          isFromSitemap: true, // Flag for scoring
          // Infer category from path
          category: this._inferCategory(url.pathname, pathParts)
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  },

  /**
   * Infer page category from URL path
   * 
   * @param {string} pathname - URL pathname
   * @param {Array<string>} pathParts - Split path segments
   * @returns {string} Inferred category
   */
  _inferCategory(pathname, pathParts) {
    const path = pathname.toLowerCase();
    
    // High-value pages
    if (path === '/' || path === '/index' || path === '/home') return 'home';
    if (/\/(about|team|company|who-we-are)/i.test(path)) return 'about';
    if (/\/(pricing|plans|packages)/i.test(path)) return 'pricing';
    if (/\/(features|capabilities|what-we-do)/i.test(path)) return 'features';
    if (/\/(faq|help|support|questions)/i.test(path)) return 'help';
    if (/\/(docs|documentation|guide|tutorial|getting-started)/i.test(path)) return 'docs';
    if (/\/(contact|reach-us|get-in-touch)/i.test(path)) return 'contact';
    if (/\/(products?|services?|solutions?)/i.test(path)) return 'products';
    if (/\/(blog|news|articles?|posts?)/i.test(path)) return 'blog';
    if (/\/(legal|privacy|terms|policy)/i.test(path)) return 'legal';
    
    // Default based on depth
    return pathParts.length <= 2 ? 'navigation' : 'content';
  },

  /**
   * Clear the sitemap cache
   */
  clearCache() {
    this._cache = {
      urls: null,
      origin: null,
      timestamp: null
    };
    console.log('[SitemapDiscovery] Cache cleared');
  }
};

// Export SitemapDiscovery
if (typeof window !== 'undefined') {
  window.SitemapDiscovery = SitemapDiscovery;
}

// ============================================
// URL Validator Module
// Validates URLs are reachable before use
// Prevents 404 errors from bot-driven navigation
// ============================================

const URLValidator = {
  // Configuration
  config: {
    // Request timeout in ms
    requestTimeout: 5000,
    // Cache TTL in ms (5 minutes)
    cacheTTL: 300000,
    // Max concurrent validation requests
    maxConcurrent: 3,
    // Retry delay for failed requests
    retryDelay: 500
  },

  // Validation cache
  _cache: {
    validated: new Map(), // URL -> { timestamp, finalUrl }
    rejected: new Map(),  // URL -> { timestamp, reason }
  },

  // Active validation promises (for deduplication)
  _pending: new Map(),

  /**
   * Normalize a URL for consistent comparison and use
   * - Converts relative to absolute
   * - Removes trailing slashes (except root)
   * - Removes hash fragments
   * - Removes tracking/UTM parameters
   * - Enforces same-origin
   * 
   * @param {string} url - URL to normalize
   * @param {string} baseOrigin - Base origin for same-origin check
   * @returns {Object} { valid: boolean, normalizedUrl: string, error?: string }
   */
  normalizeUrl(url, baseOrigin = window.location.origin) {
    try {
      // Handle relative URLs
      const absoluteUrl = new URL(url, baseOrigin);
      
      // Reject non-HTTP(S) protocols
      if (!['http:', 'https:'].includes(absoluteUrl.protocol)) {
        return { valid: false, normalizedUrl: null, error: 'Invalid protocol' };
      }
      
      // Enforce same-origin
      if (absoluteUrl.origin !== baseOrigin) {
        return { valid: false, normalizedUrl: null, error: 'Cross-origin not allowed' };
      }
      
      // Remove hash fragments
      absoluteUrl.hash = '';
      
      // Remove tracking/UTM parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'ref', 'source', 'campaign', 'fbclid', 'gclid', 'msclkid', 'mc_eid',
        '_ga', '_gl', 'hsCtaTracking'
      ];
      trackingParams.forEach(param => {
        absoluteUrl.searchParams.delete(param);
      });
      
      // Build normalized URL
      let normalizedUrl = absoluteUrl.origin + absoluteUrl.pathname;
      
      // Remove trailing slash (except for root path)
      if (normalizedUrl.endsWith('/') && absoluteUrl.pathname !== '/') {
        normalizedUrl = normalizedUrl.slice(0, -1);
      }
      
      // Add back non-tracking query params if any
      const remainingParams = absoluteUrl.searchParams.toString();
      if (remainingParams) {
        normalizedUrl += '?' + remainingParams;
      }
      
      return { valid: true, normalizedUrl };
      
    } catch (error) {
      return { valid: false, normalizedUrl: null, error: 'Malformed URL' };
    }
  },

  /**
   * Check if a URL is in the validated cache and still fresh
   * 
   * @param {string} url - Normalized URL to check
   * @returns {Object|null} Cached result or null if not cached/expired
   */
  getCachedResult(url) {
    // Check validated cache
    const validated = this._cache.validated.get(url);
    if (validated && (Date.now() - validated.timestamp) < this.config.cacheTTL) {
      return { valid: true, finalUrl: validated.finalUrl };
    }
    
    // Check rejected cache
    const rejected = this._cache.rejected.get(url);
    if (rejected && (Date.now() - rejected.timestamp) < this.config.cacheTTL) {
      return { valid: false, reason: rejected.reason };
    }
    
    return null;
  },

  /**
   * Validate a single URL by making a HEAD request (fallback to GET)
   * Returns the final URL after redirects if valid (200 OK)
   * 
   * @param {string} url - URL to validate (should be normalized)
   * @returns {Promise<Object>} { valid: boolean, finalUrl?: string, reason?: string }
   */
  async validateUrl(url) {
    const currentOrigin = window.location.origin;
    
    // First normalize the URL
    const normResult = this.normalizeUrl(url, currentOrigin);
    if (!normResult.valid) {
      return { valid: false, reason: normResult.error };
    }
    
    const normalizedUrl = normResult.normalizedUrl;
    
    // Check cache first
    const cached = this.getCachedResult(normalizedUrl);
    if (cached) {
      console.log('[URLValidator] Cache hit for:', normalizedUrl, cached.valid ? '✓' : '✗');
      return cached;
    }
    
    // Check if already validating this URL (deduplication)
    if (this._pending.has(normalizedUrl)) {
      return this._pending.get(normalizedUrl);
    }
    
    // Create validation promise
    const validationPromise = this._performValidation(normalizedUrl, currentOrigin);
    this._pending.set(normalizedUrl, validationPromise);
    
    try {
      const result = await validationPromise;
      return result;
    } finally {
      this._pending.delete(normalizedUrl);
    }
  },

  /**
   * Perform the actual validation request
   * 
   * @param {string} url - Normalized URL
   * @param {string} currentOrigin - Current page origin
   * @returns {Promise<Object>}
   */
  async _performValidation(url, currentOrigin) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);
    
    try {
      // Try HEAD request first (lightweight)
      let response;
      try {
        response = await fetch(url, {
          method: 'HEAD',
          credentials: 'same-origin',
          signal: controller.signal,
          redirect: 'follow'
        });
      } catch (headError) {
        // HEAD might be blocked by server, fallback to GET
        console.log('[URLValidator] HEAD failed, trying GET for:', url);
        response = await fetch(url, {
          method: 'GET',
          credentials: 'same-origin',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'Accept': 'text/html'
          }
        });
      }
      
      clearTimeout(timeoutId);
      
      // Check response status
      if (response.ok) {
        // Get final URL after redirects
        const finalUrl = response.url;
        
        // Verify final URL is still same-origin
        try {
          const finalUrlObj = new URL(finalUrl);
          if (finalUrlObj.origin !== currentOrigin) {
            console.log('[URLValidator] Rejected (redirect to different origin):', url, '->', finalUrl);
            this._cacheRejected(url, 'Redirect to different origin');
            return { valid: false, reason: 'Redirect to different origin' };
          }
        } catch {
          this._cacheRejected(url, 'Invalid redirect URL');
          return { valid: false, reason: 'Invalid redirect URL' };
        }
        
        // Cache and return success
        console.log('[URLValidator] Validated:', url, response.status);
        this._cacheValidated(url, finalUrl);
        return { valid: true, finalUrl };
        
      } else {
        // Non-OK response (404, 403, 500, etc.)
        const reason = `HTTP ${response.status}`;
        console.log('[URLValidator] Rejected:', url, reason);
        this._cacheRejected(url, reason);
        return { valid: false, reason };
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      let reason = 'Request failed';
      if (error.name === 'AbortError') {
        reason = 'Request timeout';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        reason = 'Network error';
      }
      
      console.log('[URLValidator] Rejected:', url, reason);
      this._cacheRejected(url, reason);
      return { valid: false, reason };
    }
  },

  /**
   * Cache a validated URL
   */
  _cacheValidated(url, finalUrl) {
    this._cache.validated.set(url, {
      timestamp: Date.now(),
      finalUrl: finalUrl
    });
    // Remove from rejected if it was there
    this._cache.rejected.delete(url);
  },

  /**
   * Cache a rejected URL
   */
  _cacheRejected(url, reason) {
    this._cache.rejected.set(url, {
      timestamp: Date.now(),
      reason: reason
    });
    // Remove from validated if it was there
    this._cache.validated.delete(url);
  },

  /**
   * Validate multiple URLs in parallel with concurrency limit
   * 
   * @param {Array<string>} urls - URLs to validate
   * @returns {Promise<Array<Object>>} Array of { url, valid, finalUrl?, reason? }
   */
  async validateUrls(urls) {
    const results = [];
    const queue = [...urls];
    const inProgress = [];
    
    while (queue.length > 0 || inProgress.length > 0) {
      // Start new validations up to max concurrent
      while (queue.length > 0 && inProgress.length < this.config.maxConcurrent) {
        const url = queue.shift();
        const promise = this.validateUrl(url).then(result => ({
          url,
          ...result
        }));
        inProgress.push(promise);
      }
      
      // Wait for at least one to complete
      if (inProgress.length > 0) {
        const completed = await Promise.race(inProgress.map((p, i) => p.then(r => ({ result: r, index: i }))));
        results.push(completed.result);
        inProgress.splice(completed.index, 1);
      }
    }
    
    return results;
  },

  /**
   * Filter an array of URLs to only include validated ones
   * Useful for filtering sitemap or link arrays before use
   * 
   * @param {Array<string|Object>} items - URLs or objects with 'url' property
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Filtered items (same type as input)
   */
  async filterValidUrls(items, options = {}) {
    const {
      urlKey = 'url',        // Key for URL in object items
      maxItems = 20,         // Max items to validate
      preserveOrder = true   // Keep original order
    } = options;
    
    // Extract URLs
    const itemsWithUrls = items.slice(0, maxItems * 2).map((item, index) => ({
      item,
      url: typeof item === 'string' ? item : item[urlKey],
      index
    }));
    
    // Validate all URLs
    const validationResults = await this.validateUrls(
      itemsWithUrls.map(i => i.url)
    );
    
    // Create a map of validation results
    const validationMap = new Map();
    validationResults.forEach(r => {
      validationMap.set(r.url, r);
    });
    
    // Filter and optionally update items with final URLs
    let validItems = itemsWithUrls
      .filter(({ url }) => {
        const result = validationMap.get(url);
        return result && result.valid;
      })
      .map(({ item, url }) => {
        const result = validationMap.get(url);
        // If item is an object and finalUrl differs, update it
        if (typeof item === 'object' && result.finalUrl && result.finalUrl !== url) {
          return { ...item, [urlKey]: result.finalUrl, _originalUrl: url };
        }
        return item;
      });
    
    // Sort by original order if requested
    if (preserveOrder) {
      validItems = validItems.slice(0, maxItems);
    } else {
      validItems = validItems.slice(0, maxItems);
    }
    
    console.log('[URLValidator] Filtered', items.length, 'items to', validItems.length, 'valid items');
    return validItems;
  },

  /**
   * Check if a URL has been validated (synchronous check)
   * 
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  isValidated(url) {
    const normResult = this.normalizeUrl(url);
    if (!normResult.valid) return false;
    
    const cached = this.getCachedResult(normResult.normalizedUrl);
    return cached && cached.valid;
  },

  /**
   * Get the final URL for a validated URL (synchronous)
   * Returns null if not validated
   * 
   * @param {string} url - URL to check
   * @returns {string|null}
   */
  getFinalUrl(url) {
    const normResult = this.normalizeUrl(url);
    if (!normResult.valid) return null;
    
    const cached = this.getCachedResult(normResult.normalizedUrl);
    return cached?.valid ? cached.finalUrl : null;
  },

  /**
   * Clear the validation cache
   */
  clearCache() {
    this._cache.validated.clear();
    this._cache.rejected.clear();
    this._pending.clear();
    console.log('[URLValidator] Cache cleared');
  },

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      validated: this._cache.validated.size,
      rejected: this._cache.rejected.size,
      pending: this._pending.size
    };
  }
};

// Export URLValidator
if (typeof window !== 'undefined') {
  window.URLValidator = URLValidator;
}
