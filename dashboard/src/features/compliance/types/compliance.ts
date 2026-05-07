// 👤 LUCAS: Compliance Types
// Core types for the WCAG/EAA Compliance Scanner

// ===========================================
// Scan Status & Severity
// ===========================================

export type ScanStatus = 'idle' | 'pending' | 'scanning' | 'completed' | 'failed' | 'timeout'

export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor'

export type IssueSource = 'axe-core' | 'gemini' | 'both'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

// ===========================================
// Scan Request & Response
// ===========================================

export interface ScanRequest {
  url: string
  userId?: string
  options?: ScanOptions
}

export interface ScanOptions {
  waitForNetworkIdle?: boolean  // Default: true (for SPAs)
  dismissCookieBanner?: boolean // Default: true (auto-click Accept All)
  timeout?: number              // Default: 30000ms
  fullPage?: boolean            // Default: true (full page screenshot)
}

export interface ScanResponse {
  scanId: string
  status: ScanStatus
  message?: string
}

// ===========================================
// Compliance Scan
// ===========================================

export interface ComplianceScan {
  id: string
  url: string
  userId: string
  status: ScanStatus
  score?: number                // 0-100 percentage
  screenshotUrl?: string        // Supabase Storage URL
  issueCount: number
  criticalCount: number
  seriousCount: number
  moderateCount: number
  minorCount: number
  createdAt: string
  completedAt?: string
  errorMessage?: string
  // Progress tracking from backend
  progressMessage?: string      // Current step description
  progressPercent?: number      // 0-100 progress percentage
}

// ===========================================
// Compliance Issue
// ===========================================

export interface ComplianceIssue {
  id: string
  scanId: string
  
  // Issue details
  severity: IssueSeverity
  wcagCriterion: string         // e.g., "1.4.3 Contrast (Minimum)"
  description: string
  location?: string             // CSS selector or description
  recommendation: string
  
  // Source tracking (axe-core vs Gemini)
  source: IssueSource
  confidence: ConfidenceLevel
  
  // Additional context
  elementHtml?: string          // The problematic HTML snippet
  screenshotRegion?: {          // Region of screenshot where issue is
    x: number
    y: number
    width: number
    height: number
  }
  
  // Fix status
  isResolved?: boolean
  resolvedAt?: string
}

// ===========================================
// Pagination
// ===========================================

export interface PaginatedIssues {
  issues: ComplianceIssue[]
  total: number
  page: number
  pageSize: number              // Default: 20
  totalPages: number
}

export interface IssueFilters {
  severity?: IssueSeverity[]
  source?: IssueSource[]
  confidence?: ConfidenceLevel[]
  wcagCriterion?: string
  showResolved?: boolean
}

// ===========================================
// Audit Report
// ===========================================

export interface AuditReport {
  id: string
  scanId: string
  generatedAt: string
  
  // Summary
  url: string
  overallScore: number
  conformanceLevel: 'fully' | 'partially' | 'not'
  
  // Counts by severity
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
    total: number
  }
  
  // Full issue list
  issues: ComplianceIssue[]
  
  // Export URLs
  htmlUrl?: string
  pdfUrl?: string
}

// ===========================================
// Accessibility Statement (BFSG)
// ===========================================

export type OrganizationType = 'public' | 'private'

export type Bundesland = 
  | 'baden-wuerttemberg'
  | 'bayern'
  | 'berlin'
  | 'brandenburg'
  | 'bremen'
  | 'hamburg'
  | 'hessen'
  | 'mecklenburg-vorpommern'
  | 'niedersachsen'
  | 'nordrhein-westfalen'
  | 'rheinland-pfalz'
  | 'saarland'
  | 'sachsen'
  | 'sachsen-anhalt'
  | 'schleswig-holstein'
  | 'thueringen'

export interface AccessibilityStatementRequest {
  scanId: string
  organizationType: OrganizationType
  organizationName: string
  websiteUrl: string
  contactEmail: string
  contactPhone?: string
  bundesland?: Bundesland       // For auto-lookup of Marktüberwachungsbehörde
  customSchlichtungsstelle?: string
}

export interface AccessibilityStatement {
  id: string
  scanId: string
  generatedAt: string
  
  // Content
  conformanceStatus: 'fully' | 'partially' | 'not'
  nonAccessibleContent: string[]
  issuesSummary?: {
    critical: number
    serious: number
    moderate: number
    minor: number
    total: number
  }
  justifications: string[]
  
  // Contact
  feedbackMechanism: {
    email: string
    phone?: string
  }
  
  // Enforcement (auto-looked up or placeholder)
  schlichtungsstelle: string
  marktUeberwachungsBehoerde: string
  
  // Export
  htmlContent: string
  markdownContent: string
  pdfBase64?: string
}

// ===========================================
// Scanner State (for useScanner hook)
// ===========================================

export interface ScannerState {
  status: ScanStatus
  currentScan: ComplianceScan | null
  issues: ComplianceIssue[]
  error: string | null
  progress?: {
    step: string
    percentage: number
  }
}

export type ScannerAction =
  | { type: 'START_SCAN'; url: string }
  | { type: 'SCAN_PROGRESS'; step: string; percentage: number }
  | { type: 'SCAN_COMPLETE'; scan: ComplianceScan; issues: ComplianceIssue[] }
  | { type: 'SCAN_FAILED'; error: string }
  | { type: 'SCAN_TIMEOUT' }
  | { type: 'RESET' }
  | { type: 'LOAD_SCAN'; scan: ComplianceScan; issues: ComplianceIssue[] }

// ===========================================
// API Response Types
// ===========================================

export interface ComplianceApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
