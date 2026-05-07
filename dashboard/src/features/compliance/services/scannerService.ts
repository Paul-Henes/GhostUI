// 👤 LUCAS: Scanner Service
// API client for compliance scanning endpoints

import type {
  ScanRequest,
  ScanResponse,
  ComplianceScan,
  ComplianceIssue,
  PaginatedIssues,
  IssueFilters,
  AuditReport,
  AccessibilityStatementRequest,
  AccessibilityStatement,
  ComplianceApiResponse,
} from '../types/compliance'

// Hardcoded production URL
const BACKEND_URL = 'https://ghostui.onrender.com'
const COMPLIANCE_BASE = '/api/compliance'

// ===========================================
// Helper Functions
// ===========================================

function getAuthToken(): string | null {
  // Get token from localStorage (set by AuthContext)
  return localStorage.getItem('auth_token')
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAuthToken()
  
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `API error: ${res.status}` }))
    throw new Error(error.error || error.message || `API error: ${res.status}`)
  }
  
  return res.json()
}

// ===========================================
// Scan Operations
// ===========================================

/**
 * Start a new compliance scan
 */
export async function startScan(request: ScanRequest): Promise<ScanResponse> {
  const response = await fetchApi<ComplianceApiResponse<ScanResponse>>(
    `${COMPLIANCE_BASE}/scan`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  )
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to start scan')
  }
  
  return response.data
}

/**
 * Get scan status and results
 */
export async function getScan(scanId: string): Promise<ComplianceScan> {
  const response = await fetchApi<ComplianceApiResponse<ComplianceScan>>(
    `${COMPLIANCE_BASE}/scan/${scanId}`
  )
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get scan')
  }
  
  return response.data
}

/**
 * Poll for scan completion with timeout
 */
export async function pollScanUntilComplete(
  scanId: string,
  options: {
    interval?: number      // Default: 2000ms
    timeout?: number       // Default: 60000ms
    onProgress?: (scan: ComplianceScan) => void
  } = {}
): Promise<ComplianceScan> {
  const { interval = 2000, timeout = 60000, onProgress } = options
  const startTime = Date.now()
  
  while (true) {
    const scan = await getScan(scanId)
    
    if (onProgress) {
      onProgress(scan)
    }
    
    if (scan.status === 'completed' || scan.status === 'failed') {
      return scan
    }
    
    if (Date.now() - startTime > timeout) {
      throw new Error('Scan timeout - returning partial results')
    }
    
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}

// ===========================================
// Issue Operations
// ===========================================

/**
 * Get paginated issues for a scan
 */
export async function getIssues(
  scanId: string,
  page: number = 1,
  pageSize: number = 20,
  filters?: IssueFilters
): Promise<PaginatedIssues> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })
  
  if (filters?.severity?.length) {
    params.set('severity', filters.severity.join(','))
  }
  if (filters?.source?.length) {
    params.set('source', filters.source.join(','))
  }
  if (filters?.confidence?.length) {
    params.set('confidence', filters.confidence.join(','))
  }
  if (filters?.wcagCriterion) {
    params.set('wcagCriterion', filters.wcagCriterion)
  }
  if (filters?.showResolved !== undefined) {
    params.set('showResolved', filters.showResolved.toString())
  }
  
  const response = await fetchApi<ComplianceApiResponse<PaginatedIssues>>(
    `${COMPLIANCE_BASE}/scan/${scanId}/issues?${params.toString()}`
  )
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get issues')
  }
  
  return response.data
}

/**
 * Get a single issue by ID
 */
export async function getIssue(issueId: string): Promise<ComplianceIssue> {
  const response = await fetchApi<ComplianceApiResponse<ComplianceIssue>>(
    `${COMPLIANCE_BASE}/issue/${issueId}`
  )
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get issue')
  }
  
  return response.data
}

/**
 * Mark an issue as resolved
 */
export async function resolveIssue(issueId: string): Promise<ComplianceIssue> {
  const response = await fetchApi<ComplianceApiResponse<ComplianceIssue>>(
    `${COMPLIANCE_BASE}/issue/${issueId}/resolve`,
    { method: 'POST' }
  )
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to resolve issue')
  }
  
  return response.data
}

// ===========================================
// Report Generation
// ===========================================

/**
 * Generate audit report
 */
export async function generateAuditReport(scanId: string): Promise<AuditReport> {
  const response = await fetchApi<ComplianceApiResponse<AuditReport>>(
    `${COMPLIANCE_BASE}/audit`,
    {
      method: 'POST',
      body: JSON.stringify({ scanId }),
    }
  )
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to generate audit report')
  }
  
  return response.data
}

/**
 * Generate accessibility statement (BFSG compliant)
 */
export async function generateStatement(
  request: AccessibilityStatementRequest
): Promise<AccessibilityStatement> {
  const response = await fetchApi<ComplianceApiResponse<AccessibilityStatement>>(
    `${COMPLIANCE_BASE}/statement`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  )
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to generate accessibility statement')
  }
  
  return response.data
}

// ===========================================
// User's Scan History
// ===========================================

/**
 * Get user's recent scans
 */
export async function getUserScans(
  page: number = 1,
  pageSize: number = 10
): Promise<{ scans: ComplianceScan[]; total: number }> {
  const response = await fetchApi<ComplianceApiResponse<{ scans: ComplianceScan[]; total: number }>>(
    `${COMPLIANCE_BASE}/scans?page=${page}&pageSize=${pageSize}`
  )
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get scan history')
  }
  
  return response.data
}

// ===========================================
// Code Fix Generation
// ===========================================

export interface CodeFixResult {
  fixedCode: string
  explanation: string
  changes: string[]
}

/**
 * Generate an AI-powered code fix for an accessibility issue
 */
export async function generateFix(
  issueId: string,
  code?: string
): Promise<CodeFixResult> {
  const response = await fetchApi<ComplianceApiResponse<CodeFixResult>>(
    `${COMPLIANCE_BASE}/issue/${issueId}/fix`,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    }
  )

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to generate code fix')
  }

  return response.data
}

// ===========================================
// Export all functions
// ===========================================

export const scannerService = {
  startScan,
  getScan,
  pollScanUntilComplete,
  getIssues,
  getIssue,
  resolveIssue,
  generateAuditReport,
  generateStatement,
  getUserScans,
  generateFix,
}

export default scannerService
