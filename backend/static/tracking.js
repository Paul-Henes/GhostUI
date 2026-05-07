/**
 * Ghost-UI Tracking Script
 * Captures user interactions for accessibility analytics
 */
(function() {
  'use strict';

  // Get config from parent
  var config = window.GhostUI || {};
  var siteId = config.siteId;
  var apiUrl = config.apiUrl || 'https://ghostui.onrender.com';

  if (!siteId) {
    console.warn('[GhostUI] No siteId configured');
    return;
  }

  // Generate or retrieve session ID
  var sessionId = sessionStorage.getItem('ghostui_session');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('ghostui_session', sessionId);
  }

  // Send event to API
  function trackEvent(type, data) {
    var event = {
      type: type,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      session_id: sessionId,
      data: data || {}
    };

    var payload = JSON.stringify(event);
    // Use query parameter for site_id to avoid CORS preflight
    var endpoint = apiUrl + '/api/tracking/event?site_id=' + encodeURIComponent(siteId);

    // Use sendBeacon for reliable delivery (especially on page unload)
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'text/plain' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      // Fallback with no credentials (required for CORS with wildcard origin)
      fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      }).catch(function() {});
    }
  }

  // Track page view
  trackEvent('pageview', {
    title: document.title,
    referrer: document.referrer
  });

  // Track clicks on interactive elements
  document.addEventListener('click', function(e) {
    var target = e.target;
    var tagName = target.tagName.toLowerCase();
    
    // Only track meaningful clicks
    if (['a', 'button', 'input', 'select', 'textarea'].indexOf(tagName) !== -1 ||
        target.getAttribute('role') === 'button' ||
        target.onclick) {
      
      trackEvent('click', {
        tag: tagName,
        id: target.id || null,
        class: target.className || null,
        text: (target.innerText || '').substring(0, 50),
        href: target.href || null
      });
    }
  }, true);

  // Track form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    trackEvent('form', {
      id: form.id || null,
      action: form.action || null
    });
  }, true);

  // Track scroll depth (throttled)
  var maxScroll = 0;
  var scrollTimeout;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function() {
      var scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      // Only track 25%, 50%, 75%, 100% milestones
      var milestone = Math.floor(scrollPercent / 25) * 25;
      if (milestone > maxScroll && milestone > 0) {
        maxScroll = milestone;
        trackEvent('scroll', { depth: milestone });
      }
    }, 200);
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', function() {
    trackEvent('visibility', {
      state: document.visibilityState
    });
  });

  // Track before unload (session end)
  window.addEventListener('beforeunload', function() {
    trackEvent('session_end', {
      duration: Math.round(performance.now() / 1000)
    });
  });

  // Track JavaScript errors
  window.addEventListener('error', function(e) {
    trackEvent('error', {
      message: e.message,
      filename: e.filename,
      line: e.lineno,
      col: e.colno
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    trackEvent('error', {
      message: e.reason ? e.reason.toString() : 'Unhandled Promise Rejection',
      type: 'promise'
    });
  });

  // Track rage clicks (rapid repeated clicks = frustration)
  var clickTimes = [];
  document.addEventListener('click', function(e) {
    var now = Date.now();
    clickTimes.push(now);
    // Keep only clicks from last 2 seconds
    clickTimes = clickTimes.filter(function(t) { return now - t < 2000; });
    // 4+ clicks in 2 seconds = rage click
    if (clickTimes.length >= 4) {
      trackEvent('rage_click', {
        count: clickTimes.length,
        target: e.target.tagName.toLowerCase(),
        id: e.target.id || null
      });
      clickTimes = []; // Reset
    }
  }, true);

  // Track copy events
  document.addEventListener('copy', function(e) {
    var selection = window.getSelection();
    trackEvent('copy', {
      length: selection ? selection.toString().length : 0
    });
  });

  // Track print attempts
  window.addEventListener('beforeprint', function() {
    trackEvent('print', {});
  });

  // Track external link clicks
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (link && link.href && link.hostname !== window.location.hostname) {
      trackEvent('external_link', {
        href: link.href,
        text: (link.innerText || '').substring(0, 50)
      });
    }
  }, true);

  // Track performance metrics after page load
  window.addEventListener('load', function() {
    setTimeout(function() {
      if (window.performance && performance.timing) {
        var timing = performance.timing;
        trackEvent('performance', {
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          tcp: timing.connectEnd - timing.connectStart,
          ttfb: timing.responseStart - timing.requestStart,
          dom_load: timing.domContentLoadedEventEnd - timing.navigationStart,
          full_load: timing.loadEventEnd - timing.navigationStart
        });
      }
    }, 100);
  });

  // Track media play events (video/audio)
  document.addEventListener('play', function(e) {
    var media = e.target;
    if (media.tagName === 'VIDEO' || media.tagName === 'AUDIO') {
      trackEvent('media_play', {
        type: media.tagName.toLowerCase(),
        src: media.currentSrc ? media.currentSrc.substring(0, 100) : null,
        duration: media.duration || null
      });
    }
  }, true);

  // Track media pause events
  document.addEventListener('pause', function(e) {
    var media = e.target;
    if (media.tagName === 'VIDEO' || media.tagName === 'AUDIO') {
      trackEvent('media_pause', {
        type: media.tagName.toLowerCase(),
        currentTime: media.currentTime || null
      });
    }
  }, true);

  // Track idle detection (no activity for 30 seconds)
  var idleTimeout;
  var isIdle = false;
  function resetIdle() {
    if (isIdle) {
      trackEvent('active', {});
      isIdle = false;
    }
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(function() {
      isIdle = true;
      trackEvent('idle', { after_seconds: 30 });
    }, 30000);
  }
  ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(function(evt) {
    document.addEventListener(evt, resetIdle, { passive: true });
  });
  resetIdle();

  // Detect user preferences (accessibility relevant!)
  trackEvent('preferences', {
    reduced_motion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    dark_mode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    high_contrast: window.matchMedia('(prefers-contrast: more)').matches,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    pixel_ratio: window.devicePixelRatio || 1
  });

  // Expose API for custom events
  window.GhostUI.track = trackEvent;

  console.log('[GhostUI] Tracking initialized for site:', siteId);
})();
