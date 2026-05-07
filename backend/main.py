# 🔥 HOTFILE: Coordinate before editing!
# Main FastAPI application entry point

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import settings

app = FastAPI(
    title="Ghost-UI API",
    description="Backend for Ghost-UI accessibility platform",
    version="0.1.0",
    redirect_slashes=False,  # Prevent 307 redirects that break HTTPS
)

# CORS - Production-safe configuration
ALLOWED_ORIGINS = [
    # Production domains
    "https://ghostui.xyz",
    "https://www.ghostui.xyz",
    # Vercel main deployments
    "https://ghostui.vercel.app",
    "https://ghostui-dashboard.vercel.app",
    # Local development
    "http://localhost:5173",  # Vite default
    "http://localhost:3000",  # Alternative
]

# Add custom origins from environment variable if set
if settings.ALLOWED_ORIGINS:
    custom_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
    ALLOWED_ORIGINS.extend(custom_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Allow all Vercel preview deployments via regex
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Site-ID"],
)

# ===========================================
# Custom CORS for tracking endpoint
# Must be registered AFTER CORSMiddleware so it runs FIRST
# Allows all origins since tracking runs on customer websites
# ===========================================
@app.middleware("http")
async def tracking_cors_middleware(request: Request, call_next):
    # Only apply to tracking event endpoint
    if request.url.path == "/api/tracking/event":
        # Handle preflight
        if request.method == "OPTIONS":
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                }
            )
        # Handle actual request
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response
    return await call_next(request)

# ===========================================
# Static files (tracking.js, etc.)
# ===========================================
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Serve tracking.js at root level for easy embedding
@app.get("/tracking.js")
async def get_tracking_script():
    """Serve the tracking script"""
    from fastapi.responses import FileResponse
    script_path = static_dir / "tracking.js"
    return FileResponse(script_path, media_type="application/javascript")


# ===========================================
# Unified Ghost-UI Script (tracking + fixes + widget)
# ===========================================
@app.get("/ghostui.js")
async def get_unified_script(site_id: str, scan_id: str = None):
    """
    Serve a unified script that includes:
    1. Analytics tracking
    2. Accessibility fixes (from latest scan)
    3. Accessibility widget
    
    Usage: 
    - Basic: <script src="https://ghostui.onrender.com/ghostui.js?site_id=xxx"></script>
    - With scan: <script src="https://ghostui.onrender.com/ghostui.js?site_id=xxx&scan_id=yyy"></script>
    """
    from fastapi.responses import Response
    from app.database import get_supabase
    import json
    
    # Get the latest completed scan for this site
    fixes = {
        "altText": [],
        "ariaLabels": [],
        "formLabels": [],
        "skipLink": True,  # Always add skip link
        "langAttr": "de",  # Default German for BFSG
        "focusStyles": True,
    }
    
    try:
        supabase = get_supabase()
        
        # Option 1: Direct scan_id provided
        if scan_id:
            from app.api.compliance.routes import get_issues_from_db, generate_fixes_from_issues
            issues = get_issues_from_db(scan_id)
            if issues:
                fixes = generate_fixes_from_issues(issues)
                print(f"[ghostui.js] Loaded {len(issues)} issues from scan {scan_id}")
        else:
            # Option 2: Look up via tracking_sites -> hostname -> scans
            site_result = supabase.table("tracking_sites").select("id, hostname").eq("id", site_id).execute()
            
            if site_result.data and len(site_result.data) > 0:
                hostname = site_result.data[0].get("hostname", "")
                
                # Find the latest completed scan for this hostname
                scan_result = supabase.table("compliance_scans").select(
                    "id"
                ).ilike("url", f"%{hostname}%").eq("status", "completed").order(
                    "created_at", desc=True
                ).limit(1).execute()
                
                if scan_result.data and len(scan_result.data) > 0:
                    scan_id = scan_result.data[0]["id"]
                    
                    # Get issues for this scan and generate fixes
                    from app.api.compliance.routes import get_issues_from_db, generate_fixes_from_issues
                    issues = get_issues_from_db(scan_id)
                    if issues:
                        fixes = generate_fixes_from_issues(issues)
    except Exception as e:
        print(f"Error loading fixes for site {site_id}: {e}")
    
    fixes_json = json.dumps(fixes, ensure_ascii=False)
    backend_url = settings.BACKEND_PUBLIC_URL or "https://ghostui.onrender.com"
    
    script = f'''/**
 * Ghost-UI Unified Script
 * Site ID: {site_id}
 * Scan ID: {scan_id or "none"}
 * 
 * This script provides:
 * 1. Analytics tracking (pageviews, clicks, scroll, etc.)
 * 2. Automatic accessibility fixes
 * 3. Accessibility preference widget
 */
(function() {{
  'use strict';
  
  // Prevent double initialization
  if (window.__GHOSTUI_UNIFIED_LOADED__) return;
  window.__GHOSTUI_UNIFIED_LOADED__ = true;
  
  const SITE_ID = '{site_id}';
  const API_URL = '{backend_url}';
  const FIXES = {fixes_json};
  const PREFS_KEY = 'ghostui_prefs';
  
  // ===========================================
  // PART 1: ANALYTICS TRACKING
  // ===========================================
  
  let sessionId = sessionStorage.getItem('ghostui_session') || 
    Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessionStorage.setItem('ghostui_session', sessionId);
  
  function trackEvent(eventType, eventData = {{}}) {{
    const payload = {{
      type: eventType,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      session_id: sessionId,
      ...eventData
    }};
    
    const endpoint = API_URL + '/api/tracking/event?site_id=' + SITE_ID;
    
    if (navigator.sendBeacon) {{
      navigator.sendBeacon(endpoint, new Blob([JSON.stringify(payload)], {{ type: 'text/plain' }}));
    }} else {{
      fetch(endpoint, {{
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {{ 'Content-Type': 'text/plain' }},
        credentials: 'omit',
        keepalive: true
      }}).catch(() => {{}});
    }}
  }}
  
  // Track pageview
  trackEvent('pageview', {{
    referrer: document.referrer,
    title: document.title,
    path: window.location.pathname
  }});
  
  // Track clicks on interactive elements
  document.addEventListener('click', function(e) {{
    const target = e.target.closest('a, button, [role="button"]');
    if (target) {{
      trackEvent('click', {{
        tag: target.tagName.toLowerCase(),
        text: (target.textContent || '').substring(0, 50).trim(),
        href: target.href || null
      }});
    }}
  }});
  
  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener('scroll', function() {{
    const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScroll) {{
      maxScroll = scrollPercent;
      if (maxScroll === 25 || maxScroll === 50 || maxScroll === 75 || maxScroll === 100) {{
        trackEvent('scroll', {{ depth: maxScroll }});
      }}
    }}
  }});
  
  // ===========================================
  // PART 2: ACCESSIBILITY FIXES
  // ===========================================
  
  function loadPrefs() {{
    try {{
      return JSON.parse(localStorage.getItem(PREFS_KEY)) || {{}};
    }} catch (e) {{
      return {{}};
    }}
  }}
  
  function savePrefs(prefs) {{
    try {{
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    }} catch (e) {{}}
  }}
  
  function applyAltTextFixes() {{
    if (!FIXES.altText || !FIXES.altText.length) return;
    FIXES.altText.forEach(fix => {{
      try {{
        const elements = document.querySelectorAll(fix.selector);
        elements.forEach(el => {{
          if (!el.hasAttribute('alt') || el.getAttribute('alt') === '') {{
            el.setAttribute('alt', fix.suggestedAlt || 'Bild');
            el.dataset.ghostuiFixed = 'alt';
          }}
        }});
      }} catch (e) {{}}
    }});
  }}
  
  function applyAriaFixes() {{
    if (!FIXES.ariaLabels || !FIXES.ariaLabels.length) return;
    FIXES.ariaLabels.forEach(fix => {{
      try {{
        const elements = document.querySelectorAll(fix.selector);
        elements.forEach(el => {{
          const hasText = el.textContent && el.textContent.trim().length > 0;
          const hasAriaLabel = el.hasAttribute('aria-label');
          if (!hasText && !hasAriaLabel) {{
            el.setAttribute('aria-label', fix.label || 'Interaktives Element');
            el.dataset.ghostuiFixed = 'aria';
          }}
        }});
      }} catch (e) {{}}
    }});
  }}
  
  function applyFormFixes() {{
    if (!FIXES.formLabels || !FIXES.formLabels.length) return;
    FIXES.formLabels.forEach(fix => {{
      try {{
        const elements = document.querySelectorAll(fix.selector);
        elements.forEach(el => {{
          if (!el.hasAttribute('aria-label')) {{
            el.setAttribute('aria-label', fix.label || el.placeholder || 'Eingabefeld');
            el.dataset.ghostuiFixed = 'form';
          }}
        }});
      }} catch (e) {{}}
    }});
  }}
  
  function applySkipLink() {{
    if (!FIXES.skipLink) return;
    if (document.querySelector('.ghostui-skip-link')) return;
    
    const main = document.querySelector('main, [role="main"], #main, #content, .main-content');
    if (!main) return;
    
    const mainId = main.id || 'ghostui-main-content';
    main.id = mainId;
    
    const skipLink = document.createElement('a');
    skipLink.href = '#' + mainId;
    skipLink.className = 'ghostui-skip-link';
    skipLink.textContent = 'Zum Hauptinhalt springen';
    skipLink.style.cssText = 'position:absolute;top:-100px;left:0;padding:8px 16px;background:#1e40af;color:white;text-decoration:none;z-index:100000;font-size:14px;transition:top 0.2s;';
    skipLink.addEventListener('focus', () => skipLink.style.top = '0');
    skipLink.addEventListener('blur', () => skipLink.style.top = '-100px');
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }}
  
  function applyLangAttr() {{
    if (!FIXES.langAttr) return;
    if (!document.documentElement.hasAttribute('lang')) {{
      document.documentElement.setAttribute('lang', FIXES.langAttr);
    }}
  }}
  
  // ===========================================
  // PART 3: CSS & WIDGET (matches extension exactly)
  // ===========================================
  
  function injectCSS() {{
    if (document.getElementById('ghostui-css')) return;
    
    const style = document.createElement('style');
    style.id = 'ghostui-css';
    style.textContent = `
      @import url('https://fonts.cdnfonts.com/css/opendyslexic');
      
      /* Accessibility Styles */
      .ghostui-high-contrast {{ filter: contrast(1.25) !important; background-color: #fff !important; color: #000 !important; }}
      .ghostui-high-contrast a {{ color: #0000EE !important; text-decoration: underline !important; }}
      .ghostui-high-contrast a:visited {{ color: #551A8B !important; }}
      .ghostui-dyslexia-font, .ghostui-dyslexia-font * {{ font-family: 'OpenDyslexic', sans-serif !important; }}
      .ghostui-focus-mode > *:not(main):not(article):not([role="main"]) {{ opacity: 0.3 !important; transition: opacity 0.3s !important; }}
      .ghostui-focus-mode > *:not(main):not(article):not([role="main"]):hover {{ opacity: 1 !important; }}
      .ghostui-focus-mode main, .ghostui-focus-mode article, .ghostui-focus-mode [role="main"] {{ opacity: 1 !important; }}
      
      /* Widget Styles - matching extension exactly */
      .ghostui-widget {{ position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
      .ghostui-fab {{ position: relative; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s, box-shadow 0.2s; }}
      .ghostui-fab:hover {{ transform: scale(1.1); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }}
      .ghostui-panel {{ position: absolute; bottom: 60px; right: 0; width: 280px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.15); display: none; overflow: hidden; }}
      .ghostui-panel.open {{ display: block; }}
      .ghostui-panel-header {{ padding: 12px 16px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; font-weight: 600; font-size: 14px; }}
      .ghostui-panel-content {{ padding: 16px; }}
      .ghostui-toggle {{ display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }}
      .ghostui-toggle-label {{ font-size: 13px; color: #374151; }}
      .ghostui-switch {{ position: relative; width: 40px; height: 22px; background: #d1d5db; border-radius: 11px; cursor: pointer; transition: background 0.2s; }}
      .ghostui-switch.active {{ background: #3b82f6; }}
      .ghostui-switch-thumb {{ position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: transform 0.2s; }}
      .ghostui-switch.active .ghostui-switch-thumb {{ transform: translateX(18px); }}
      .ghostui-slider {{ padding: 8px 0; }}
      .ghostui-slider-header {{ display: flex; justify-content: space-between; font-size: 13px; color: #374151; margin-bottom: 4px; }}
      .ghostui-slider-input {{ width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; -webkit-appearance: none; cursor: pointer; }}
      .ghostui-slider-input::-webkit-slider-thumb {{ -webkit-appearance: none; width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; cursor: pointer; }}
      .ghostui-slider-input::-moz-range-thumb {{ width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; cursor: pointer; border: none; }}
      .ghostui-divider {{ border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 8px; }}
      .ghostui-divider .ghostui-toggle-label {{ font-weight: 600; }}
      .ghostui-powered {{ text-align: center; padding: 10px; font-size: 11px; color: #9ca3af; background: #f9fafb; border-top: 1px solid #e5e7eb; }}
      .ghostui-powered a {{ color: #3b82f6; text-decoration: none; }}
    `;
    document.head.appendChild(style);
  }}
  
  function createWidget() {{
    if (document.querySelector('.ghostui-widget')) return;
    
    const prefs = loadPrefs();
    const widget = document.createElement('div');
    widget.className = 'ghostui-widget';
    widget.setAttribute('role', 'region');
    widget.setAttribute('aria-label', 'Ghost-UI Accessibility Settings');
    
    // Default values
    if (prefs.enabled === undefined) prefs.enabled = true;
    if (!prefs.fontSize) prefs.fontSize = 100;
    
    // Build HTML without template literal interpolation issues
    const enabledClass = prefs.enabled ? 'active' : '';
    const highContrastClass = prefs.highContrast ? 'active' : '';
    const dyslexiaClass = prefs.dyslexiaFont ? 'active' : '';
    const focusModeClass = prefs.focusMode ? 'active' : '';
    const fontSize = prefs.fontSize || 100;
    
    widget.innerHTML = 
      '<div class="ghostui-panel" role="dialog" aria-labelledby="ghostui-panel-title">' +
        '<div class="ghostui-panel-header" id="ghostui-panel-title">Ghost-UI Accessibility</div>' +
        '<div class="ghostui-panel-content">' +
          '<div class="ghostui-toggle ghostui-divider">' +
            '<span class="ghostui-toggle-label">Enable on this site</span>' +
            '<div class="ghostui-switch ' + enabledClass + '" data-pref="enabled" role="switch" aria-checked="' + prefs.enabled + '" tabindex="0">' +
              '<div class="ghostui-switch-thumb"></div>' +
            '</div>' +
          '</div>' +
          '<div class="ghostui-toggle">' +
            '<span class="ghostui-toggle-label">High Contrast</span>' +
            '<div class="ghostui-switch ' + highContrastClass + '" data-pref="highContrast" role="switch" aria-checked="' + !!prefs.highContrast + '" tabindex="0">' +
              '<div class="ghostui-switch-thumb"></div>' +
            '</div>' +
          '</div>' +
          '<div class="ghostui-toggle">' +
            '<span class="ghostui-toggle-label">Dyslexia Font</span>' +
            '<div class="ghostui-switch ' + dyslexiaClass + '" data-pref="dyslexiaFont" role="switch" aria-checked="' + !!prefs.dyslexiaFont + '" tabindex="0">' +
              '<div class="ghostui-switch-thumb"></div>' +
            '</div>' +
          '</div>' +
          '<div class="ghostui-toggle">' +
            '<span class="ghostui-toggle-label">Focus Mode</span>' +
            '<div class="ghostui-switch ' + focusModeClass + '" data-pref="focusMode" role="switch" aria-checked="' + !!prefs.focusMode + '" tabindex="0">' +
              '<div class="ghostui-switch-thumb"></div>' +
            '</div>' +
          '</div>' +
          '<div class="ghostui-slider">' +
            '<div class="ghostui-slider-header">' +
              '<span>Font Size</span>' +
              '<span class="ghostui-font-size-value">' + fontSize + '%</span>' +
            '</div>' +
            '<input type="range" class="ghostui-slider-input" data-pref="fontSize" min="75" max="200" value="' + fontSize + '" />' +
          '</div>' +
        '</div>' +
        '<div class="ghostui-powered">Powered by <a href="https://ghostui.xyz" target="_blank" rel="noopener">Ghost-UI</a></div>' +
      '</div>' +
      '<button class="ghostui-fab" aria-label="Toggle Ghost-UI panel" aria-expanded="false">👻</button>';
    
    document.body.appendChild(widget);
    
    const fab = widget.querySelector('.ghostui-fab');
    const panel = widget.querySelector('.ghostui-panel');
    
    // Toggle panel
    fab.addEventListener('click', () => {{
      const isOpen = panel.classList.toggle('open');
      fab.setAttribute('aria-expanded', isOpen);
    }});
    
    // Close panel when clicking outside
    document.addEventListener('click', (e) => {{
      if (!widget.contains(e.target)) {{
        panel.classList.remove('open');
        fab.setAttribute('aria-expanded', 'false');
      }}
    }});
    
    // Handle toggle switches
    const switches = widget.querySelectorAll('.ghostui-switch');
    switches.forEach(sw => {{
      sw.addEventListener('click', () => {{
        const pref = sw.dataset.pref;
        const isActive = sw.classList.toggle('active');
        sw.setAttribute('aria-checked', isActive);
        
        const newPrefs = loadPrefs();
        newPrefs[pref] = isActive;
        savePrefs(newPrefs);
        
        applyPreference(pref, isActive, newPrefs);
        trackEvent('accessibility_preference', {{ preference: pref, enabled: isActive }});
      }});
      
      sw.addEventListener('keydown', (e) => {{
        if (e.key === 'Enter' || e.key === ' ') {{
          e.preventDefault();
          sw.click();
        }}
      }});
    }});
    
    // Handle font size slider
    const slider = widget.querySelector('.ghostui-slider-input');
    const sizeDisplay = widget.querySelector('.ghostui-font-size-value');
    
    slider.addEventListener('input', (e) => {{
      const size = e.target.value;
      sizeDisplay.textContent = size + '%';
      
      const newPrefs = loadPrefs();
      newPrefs.fontSize = parseInt(size);
      savePrefs(newPrefs);
      
      applyPreference('fontSize', size, newPrefs);
    }});
    
    slider.addEventListener('change', (e) => {{
      trackEvent('accessibility_preference', {{ preference: 'fontSize', value: e.target.value }});
    }});
    
    // Apply initial preferences
    if (prefs.enabled !== false) {{
      applyAllPreferences(prefs);
    }}
  }}
  
  function applyPreference(pref, value, allPrefs) {{
    const prefs = allPrefs || loadPrefs();
    if (prefs.enabled === false) return; // Don't apply if disabled
    
    switch (pref) {{
      case 'enabled':
        if (value) {{
          applyAllPreferences(prefs);
        }} else {{
          removeAllAccessibilityStyles();
        }}
        break;
      case 'highContrast':
        document.documentElement.classList.toggle('ghostui-high-contrast', value);
        break;
      case 'dyslexiaFont':
        document.documentElement.classList.toggle('ghostui-dyslexia-font', value);
        break;
      case 'focusMode':
        document.body.classList.toggle('ghostui-focus-mode', value);
        break;
      case 'fontSize':
        document.documentElement.style.fontSize = value + '%';
        break;
    }}
  }}
  
  function applyAllPreferences(prefs) {{
    if (prefs.highContrast) document.documentElement.classList.add('ghostui-high-contrast');
    if (prefs.dyslexiaFont) document.documentElement.classList.add('ghostui-dyslexia-font');
    if (prefs.focusMode) document.body.classList.add('ghostui-focus-mode');
    if (prefs.fontSize && prefs.fontSize !== 100) document.documentElement.style.fontSize = prefs.fontSize + '%';
  }}
  
  function removeAllAccessibilityStyles() {{
    document.documentElement.classList.remove('ghostui-high-contrast', 'ghostui-dyslexia-font');
    document.body.classList.remove('ghostui-focus-mode');
    document.documentElement.style.fontSize = '';
  }}
  
  // ===========================================
  // INITIALIZATION
  // ===========================================
  
  function init() {{
    injectCSS();
    applyAltTextFixes();
    applyAriaFixes();
    applyFormFixes();
    applySkipLink();
    applyLangAttr();
    createWidget();
    console.log('[Ghost-UI] Unified script loaded. Site:', SITE_ID);
  }}
  
  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', init);
  }} else {{
    init();
  }}
}})();
'''
    
    return Response(
        content=script,
        media_type="application/javascript",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",  # Cache 5 minutes
        }
    )

# ===========================================
# Router registration
# Uncomment as routes are implemented
# ===========================================

# 👤 JANNIK: Auth routes
from app.api.auth.routes import router as auth_router
app.include_router(auth_router)

# 👤 LUCAS: Compliance routes
from app.api.compliance.routes import router as compliance_router
app.include_router(compliance_router)

# 👤 JANNIK: Tracking routes
from app.api.tracking.routes import router as tracking_router
app.include_router(tracking_router)

# 👤 JANNIK: Agents routes
from app.api.agents.routes import router as agents_router
app.include_router(agents_router)

# 👤 SHARED: Preferences routes
from app.api.preferences.routes import router as preferences_router
app.include_router(preferences_router)

# 👤 LUCAS: Webhooks routes (for n8n triggers)
from app.api.webhooks.routes import router as webhooks_router
app.include_router(webhooks_router)

# 👤 PAUL: Voice Agent (ElevenLabs optional, Chat + TTS)
from app.api.voice_agent.routes import router as voice_agent_router
app.include_router(voice_agent_router)


@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "ok", "version": "0.1.0"}


@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Ghost-UI API", "docs": "/docs"}
