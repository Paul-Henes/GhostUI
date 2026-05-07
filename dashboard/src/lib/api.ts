// 🔥 HOTFILE: API Client for Backend
// Coordinate before making changes!

import type {
  User,
  AuthResponse,
  Site,
  TrackingEvent,
  AgentInfo,
  AgentRun,
  AccessibilityPreferences,
  SitePreferences,
} from './types'

// Hardcoded production URL - environment variable was causing http:// issues
const BACKEND_URL = 'https://ghostui.onrender.com'

// Dashboard-specific type
interface AnalyticsSummary {
  total_events: number
  unique_sessions: number
  page_views: number
  interactions: number
}

/**
 * API client for Ghost-UI backend
 */
export const api = {
  // Base fetch wrapper with error handling
  async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })
      
      // Always try to parse the response body
      const data = await res.json().catch(() => null)
      
      if (!res.ok) {
        // Try to extract error message from response
        const errorMessage = data?.error || data?.detail || `API error: ${res.status}`
        throw new Error(errorMessage)
      }
      
      return data as T
    } catch (error) {
      // Handle network errors (offline, DNS failure, CORS, etc.)
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to connect to server')
      }
      throw error
    }
  },

  // Authenticated fetch wrapper
  async authFetch<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
    return api.fetch<T>(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    })
  },

  // Health check
  health: () => api.fetch<{ status: string }>('/health'),

  // 👤 JANNIK: Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      api.fetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    signup: (email: string, password: string) =>
      api.fetch<AuthResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    logout: (token: string) =>
      api.authFetch<{ success: boolean }>('/api/auth/logout', token, {
        method: 'POST',
      }),

    me: (token: string) =>
      api.authFetch<User>('/api/auth/me', token),
  },

  // 👤 JANNIK: Tracking endpoints
  tracking: {
    getSites: (token: string) =>
      api.authFetch<{ sites: Site[] }>('/api/tracking/sites', token),

    createSite: (token: string, hostname: string, name?: string) =>
      api.authFetch<{ site: Site; snippet: string }>('/api/tracking/sites', token, {
        method: 'POST',
        body: JSON.stringify({ hostname, name }),
      }),

    getEvents: (token: string, siteId: string, params?: { from?: string; to?: string; type?: string }) => {
      const searchParams = new URLSearchParams({ site_id: siteId })
      if (params?.from) searchParams.append('date_from', params.from)
      if (params?.to) searchParams.append('date_to', params.to)
      if (params?.type) searchParams.append('event_type', params.type)
      return api.authFetch<{ events: TrackingEvent[] }>(`/api/tracking/events?${searchParams}`, token)
    },

    getAnalytics: (token: string, siteId: string, period: 'day' | 'week' | 'month' = 'week') =>
      api.authFetch<AnalyticsSummary>(`/api/tracking/analytics?site_id=${siteId}&period=${period}`, token),

    trackEvent: (siteId: string, event: Omit<TrackingEvent, 'site_id'>) =>
      api.fetch<{ success: boolean }>('/api/tracking/event', {
        method: 'POST',
        headers: { 'X-Site-ID': siteId },
        body: JSON.stringify(event),
      }),
  },

  // 👤 JANNIK: Agents endpoints
  agents: {
    list: (token: string) =>
      api.authFetch<{ agents: AgentInfo[] }>('/api/agents/', token),

    getRuns: (token: string, params?: { agentType?: string; status?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.agentType) searchParams.append('agent_type', params.agentType)
      if (params?.status) searchParams.append('status', params.status)
      const query = searchParams.toString()
      return api.authFetch<{ runs: AgentRun[] }>(`/api/agents/runs${query ? `?${query}` : ''}`, token)
    },

    runFixer: (token: string, params: { issueId?: string; code?: string; issueDescription?: string; wcagCriterion?: string }) =>
      api.authFetch<AgentRun>('/api/agents/fixer/run', token, {
        method: 'POST',
        body: JSON.stringify({
          issue_id: params.issueId,
          code: params.code,
          issue_description: params.issueDescription,
          wcag_criterion: params.wcagCriterion,
        }),
      }),

    runAnalyzer: (token: string, url: string) =>
      api.authFetch<AgentRun>('/api/agents/analyzer/run', token, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),

    runAuditor: (token: string, url: string) =>
      api.authFetch<AgentRun>('/api/agents/auditor/run', token, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
  },

  // 👤 JANNIK: Preferences endpoints (for Extension sync)
  preferences: {
    get: (token: string, hostname?: string) => {
      const query = hostname ? `?hostname=${encodeURIComponent(hostname)}` : ''
      return api.authFetch<{ preferences: SitePreferences[] }>(`/api/user/preferences${query}`, token)
    },

    update: (token: string, hostname: string, preferences: AccessibilityPreferences, enabled: boolean = true) =>
      api.authFetch<{ success: boolean }>('/api/user/preferences', token, {
        method: 'POST',
        body: JSON.stringify({ hostname, preferences, enabled }),
      }),
  },
}

// Re-export types for convenience
export type {
  User,
  AuthResponse,
  Site,
  TrackingEvent,
  AgentInfo,
  AgentRun,
  AccessibilityPreferences,
  SitePreferences,
  AnalyticsSummary,
}
