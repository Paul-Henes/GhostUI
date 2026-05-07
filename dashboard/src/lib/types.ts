// 🔥 HOTFILE: Shared Types
// Coordinate before making changes!
// Types are defined locally for Vercel compatibility

// ===========================================
// User & Auth
// ===========================================

export interface User {
  id: string
  email: string
  created_at?: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  error?: string
}

// ===========================================
// Compliance
// ===========================================

export type ScanStatus = 'idle' | 'pending' | 'scanning' | 'completed' | 'failed' | 'timeout'
export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor'
export type IssueSource = 'axe-core' | 'gemini' | 'both'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ComplianceScan {
  id: string
  url: string
  userId?: string
  status: ScanStatus
  score?: number
  screenshotUrl?: string
  issueCount: number
  criticalCount: number
  seriousCount: number
  moderateCount: number
  minorCount: number
  createdAt: string
  completedAt?: string
  errorMessage?: string
  progressMessage?: string
  progressPercent: number
}

export interface ComplianceIssue {
  id: string
  scanId: string
  severity: IssueSeverity
  wcagCriterion: string
  description: string
  location?: string
  recommendation?: string
  source: IssueSource
  confidence: ConfidenceLevel
  elementHtml?: string
  screenshotRegion?: Record<string, unknown>
  isResolved: boolean
  resolvedAt?: string
}

// ===========================================
// Tracking
// ===========================================

export interface Site {
  id: string
  hostname: string
  name?: string
  created_at: string
}

export interface TrackingEvent {
  id?: string
  site_id?: string
  session_id?: string
  type: string
  timestamp: string
  url: string
  data?: Record<string, unknown>
  created_at?: string
}

// ===========================================
// AI Agents
// ===========================================

export interface AgentInfo {
  type: string
  name: string
  description: string
}

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AgentRun {
  id: string
  agent_type: string
  status: AgentStatus
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  created_at: string
  completed_at?: string
}

// ===========================================
// Preferences (Extension <-> Dashboard sync)
// ===========================================

export interface AccessibilityPreferences {
  highContrast: boolean
  fontSize: number
  dyslexiaFont: boolean
  focusMode: boolean
  reducedMotion: boolean
  customCSS: string
}

export interface SitePreferences {
  hostname: string
  preferences: AccessibilityPreferences
  enabled: boolean
}

// ===========================================
// API Response wrapper
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ===========================================
// Dashboard-specific types (not shared)
// ===========================================

export interface AnalyticsSummary {
  total_events: number
  unique_sessions: number
  page_views: number
  interactions: number
}
