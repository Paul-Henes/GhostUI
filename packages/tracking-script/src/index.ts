// 👤 JANNIK: Embeddable Tracking Script
// This script is embedded on customer websites to capture events

interface GhostUIConfig {
  siteId: string
  apiUrl: string
  debug?: boolean
}

interface TrackingEvent {
  type: string
  timestamp: string
  url: string
  session_id: string
  data?: Record<string, unknown>
}

// Global namespace
declare global {
  interface Window {
    GhostUI: {
      siteId?: string
      apiUrl?: string
      debug?: boolean
      init: (config: GhostUIConfig) => void
      track: (eventType: string, data?: Record<string, unknown>) => void
      _sessionId?: string
      _initialized?: boolean
      _scrollDepths?: Set<number>
    }
  }
}

// Generate a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Get or create session ID
function getSessionId(): string {
  const SESSION_KEY = 'ghostui_session'
  const SESSION_EXPIRY = 30 * 60 * 1000 // 30 minutes
  
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) {
      const { id, timestamp } = JSON.parse(stored)
      if (Date.now() - timestamp < SESSION_EXPIRY) {
        // Refresh timestamp
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, timestamp: Date.now() }))
        return id
      }
    }
  } catch (e) {
    // sessionStorage not available
  }
  
  const newId = generateUUID()
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: newId, timestamp: Date.now() }))
  } catch (e) {
    // Ignore storage errors
  }
  
  return newId
}

// Send event to backend
async function sendEvent(event: TrackingEvent): Promise<void> {
  const { siteId, apiUrl, debug } = window.GhostUI
  
  if (!siteId || !apiUrl) {
    if (debug) console.warn('[GhostUI] Not configured, skipping event:', event)
    return
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/tracking/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-ID': siteId,
      },
      body: JSON.stringify(event),
    })
    
    if (debug) {
      if (response.ok) {
        console.log('[GhostUI] Event sent:', event.type)
      } else {
        console.error('[GhostUI] Failed to send event:', response.status)
      }
    }
  } catch (error) {
    if (debug) console.error('[GhostUI] Error sending event:', error)
  }
}

// Track function
function track(eventType: string, data?: Record<string, unknown>): void {
  const event: TrackingEvent = {
    type: eventType,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    session_id: window.GhostUI._sessionId || getSessionId(),
    data,
  }
  
  sendEvent(event)
}

// Setup auto-tracking for page views
function setupPageViewTracking(): void {
  // Track initial page view
  track('pageview')
  
  // Track SPA navigation
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState
  
  history.pushState = function (...args) {
    originalPushState.apply(this, args)
    track('pageview', { navigation: 'pushState' })
  }
  
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args)
    track('pageview', { navigation: 'replaceState' })
  }
  
  window.addEventListener('popstate', () => {
    track('pageview', { navigation: 'popstate' })
  })
}

// Setup click tracking
function setupClickTracking(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    
    // Track clicks on links and buttons
    const clickable = target.closest('a, button, [role="button"]')
    if (clickable) {
      const data: Record<string, unknown> = {
        tag: clickable.tagName.toLowerCase(),
        text: (clickable.textContent || '').slice(0, 100).trim(),
      }
      
      if (clickable.tagName === 'A') {
        data.href = (clickable as HTMLAnchorElement).href
      }
      
      if (clickable.id) {
        data.id = clickable.id
      }
      
      if (clickable.className) {
        data.class = clickable.className.toString().slice(0, 100)
      }
      
      track('click', data)
    }
  }, { passive: true })
}

// Setup scroll depth tracking
function setupScrollTracking(): void {
  window.GhostUI._scrollDepths = new Set()
  
  const checkScrollDepth = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    if (scrollHeight <= 0) return
    
    const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100)
    const depths = [25, 50, 75, 100]
    
    for (const depth of depths) {
      if (scrollPercent >= depth && !window.GhostUI._scrollDepths?.has(depth)) {
        window.GhostUI._scrollDepths?.add(depth)
        track('scroll', { depth })
      }
    }
  }
  
  // Throttle scroll events
  let scrollTimeout: number | null = null
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return
    scrollTimeout = window.setTimeout(() => {
      checkScrollDepth()
      scrollTimeout = null
    }, 200)
  }, { passive: true })
}

// Setup form tracking
function setupFormTracking(): void {
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement
    
    track('form', {
      action: form.action,
      method: form.method,
      id: form.id || undefined,
      name: form.name || undefined,
    })
  }, { passive: true })
}

// Initialize GhostUI
function init(config: GhostUIConfig): void {
  if (window.GhostUI._initialized) {
    console.warn('[GhostUI] Already initialized')
    return
  }
  
  window.GhostUI.siteId = config.siteId
  window.GhostUI.apiUrl = config.apiUrl
  window.GhostUI.debug = config.debug || false
  window.GhostUI._sessionId = getSessionId()
  window.GhostUI._initialized = true
  
  if (config.debug) {
    console.log('[GhostUI] Initialized with config:', config)
  }
  
  // Setup auto-tracking
  setupPageViewTracking()
  setupClickTracking()
  setupScrollTracking()
  setupFormTracking()
}

// Initialize the global object
window.GhostUI = window.GhostUI || {}
window.GhostUI.init = init
window.GhostUI.track = track

// Auto-init if config is already set (from embed snippet)
if (window.GhostUI.siteId && window.GhostUI.apiUrl && !window.GhostUI._initialized) {
  init({
    siteId: window.GhostUI.siteId,
    apiUrl: window.GhostUI.apiUrl,
    debug: window.GhostUI.debug,
  })
}

export {}
