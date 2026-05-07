// 👤 LUCAS: Scanner Hook
// State machine for compliance scanning

import { useReducer, useCallback, useRef } from 'react'
import { scannerService } from '../services/scannerService'
import type {
  ScannerState,
  ScannerAction,
  ComplianceScan,
  ComplianceIssue,
  ScanOptions,
} from '../types/compliance'

// ===========================================
// Initial State
// ===========================================

const initialState: ScannerState = {
  status: 'idle',
  currentScan: null,
  issues: [],
  error: null,
  progress: undefined,
}

// ===========================================
// Reducer
// ===========================================

function scannerReducer(state: ScannerState, action: ScannerAction): ScannerState {
  switch (action.type) {
    case 'START_SCAN':
      return {
        ...initialState,
        status: 'pending',
        progress: { step: 'Initiating scan...', percentage: 0 },
      }
    
    case 'SCAN_PROGRESS':
      return {
        ...state,
        status: 'scanning',
        progress: { step: action.step, percentage: action.percentage },
      }
    
    case 'SCAN_COMPLETE':
      return {
        ...state,
        status: 'completed',
        currentScan: action.scan,
        issues: action.issues,
        error: null,
        progress: { step: 'Complete', percentage: 100 },
      }
    
    case 'SCAN_FAILED':
      return {
        ...state,
        status: 'failed',
        error: action.error,
        progress: undefined,
      }
    
    case 'SCAN_TIMEOUT':
      return {
        ...state,
        status: 'timeout',
        error: 'Scan timed out. The site may be too complex or slow to load.',
        progress: undefined,
      }
    
    case 'RESET':
      return initialState
    
    case 'LOAD_SCAN':
      return {
        ...state,
        status: 'completed',
        currentScan: action.scan,
        issues: action.issues,
        error: null,
        progress: { step: 'Loaded from history', percentage: 100 },
      }
    
    default:
      return state
  }
}

// ===========================================
// Progress Steps
// ===========================================

const PROGRESS_STEPS = [
  { step: 'Loading page...', percentage: 10 },
  { step: 'Waiting for content...', percentage: 20 },
  { step: 'Dismissing cookie banner...', percentage: 30 },
  { step: 'Taking screenshot...', percentage: 40 },
  { step: 'Running axe-core analysis...', percentage: 55 },
  { step: 'Analyzing with Gemini Vision...', percentage: 70 },
  { step: 'Processing results...', percentage: 85 },
  { step: 'Finalizing...', percentage: 95 },
]

// ===========================================
// Hook
// ===========================================

export interface UseScannerOptions {
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number
  /** Auto-dismiss cookie banners (default: true) */
  dismissCookieBanner?: boolean
  /** Callback when scan completes */
  onComplete?: (scan: ComplianceScan, issues: ComplianceIssue[]) => void
  /** Callback when scan fails */
  onError?: (error: string) => void
}

export function useScanner(options: UseScannerOptions = {}) {
  const {
    timeout = 60000,
    pollInterval = 2000,
    dismissCookieBanner = true,
    onComplete,
    onError,
  } = options

  const [state, dispatch] = useReducer(scannerReducer, initialState)
  const abortControllerRef = useRef<AbortController | null>(null)
  const progressIndexRef = useRef(0)

  /**
   * Simulate progress steps while waiting for backend
   */
  const simulateProgress = useCallback(() => {
    const interval = setInterval(() => {
      if (progressIndexRef.current < PROGRESS_STEPS.length - 1) {
        progressIndexRef.current += 1
        const { step, percentage } = PROGRESS_STEPS[progressIndexRef.current]
        dispatch({ type: 'SCAN_PROGRESS', step, percentage })
      }
    }, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [])

  /**
   * Start a new scan
   */
  const startScan = useCallback(async (url: string, scanOptions?: ScanOptions) => {
    console.log(`[Scanner] 🚀 Starting scan for: ${url}`)
    
    // Reset state
    dispatch({ type: 'START_SCAN', url })
    progressIndexRef.current = 0
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()
    
    // Start progress simulation
    const stopProgress = simulateProgress()
    
    try {
      // Start the scan
      console.log(`[Scanner] Calling backend API...`)
      const { scanId } = await scannerService.startScan({
        url,
        options: {
          dismissCookieBanner,
          waitForNetworkIdle: true,
          timeout,
          ...scanOptions,
        },
      })
      
      console.log(`[Scanner] ✅ Scan ID: ${scanId}`)
      dispatch({ type: 'SCAN_PROGRESS', step: 'Scan started, processing...', percentage: 15 })
      
      // Poll until complete - use REAL progress from backend
      const scan = await scannerService.pollScanUntilComplete(scanId, {
        interval: pollInterval,
        timeout,
        onProgress: (progressScan) => {
          // Use real progress message from backend if available
          if (progressScan.progressMessage && progressScan.progressPercent !== undefined) {
            console.log(`[Scanner] ${progressScan.progressPercent}% - ${progressScan.progressMessage}`)
            dispatch({
              type: 'SCAN_PROGRESS',
              step: progressScan.progressMessage,
              percentage: progressScan.progressPercent,
            })
          } else if (progressScan.status === 'scanning') {
            // Fallback to simulated progress
            const currentProgress = PROGRESS_STEPS[progressIndexRef.current]
            if (currentProgress) {
              dispatch({
                type: 'SCAN_PROGRESS',
                step: currentProgress.step,
                percentage: currentProgress.percentage,
              })
            }
          }
        },
      })
      
      stopProgress()
      
      if (scan.status === 'failed') {
        console.error(`[Scanner] ❌ Scan failed: ${scan.errorMessage}`)
        throw new Error(scan.errorMessage || 'Scan failed')
      }
      
      console.log(`[Scanner] ✅ Scan completed! Score: ${scan.score}, Issues: ${scan.issueCount}`)
      
      // Fetch issues (first page)
      const { issues } = await scannerService.getIssues(scan.id, 1, 20, {
        confidence: ['high', 'medium'], // Filter out low confidence per spec
      })
      
      console.log(`[Scanner] 📋 Fetched ${issues.length} issues`)
      issues.forEach((issue) => {
        console.log(`  [${issue.severity.toUpperCase()}] ${issue.wcagCriterion}: ${issue.description.slice(0, 60)}...`)
      })
      
      dispatch({ type: 'SCAN_COMPLETE', scan, issues })
      
      if (onComplete) {
        onComplete(scan, issues)
      }
      
      return { scan, issues }
      
    } catch (error) {
      stopProgress()
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      console.error(`[Scanner] ❌ Error: ${errorMessage}`)
      
      if (errorMessage.includes('timeout')) {
        dispatch({ type: 'SCAN_TIMEOUT' })
      } else {
        dispatch({ type: 'SCAN_FAILED', error: errorMessage })
      }
      
      if (onError) {
        onError(errorMessage)
      }
      
      throw error
    }
  }, [timeout, pollInterval, dismissCookieBanner, onComplete, onError, simulateProgress])

  /**
   * Cancel an ongoing scan
   */
  const cancelScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    dispatch({ type: 'RESET' })
  }, [])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  /**
   * Load more issues (pagination)
   */
  const loadMoreIssues = useCallback(async (page: number) => {
    if (!state.currentScan) return null
    
    const result = await scannerService.getIssues(state.currentScan.id, page, 20, {
      confidence: ['high', 'medium'],
    })
    
    return result
  }, [state.currentScan])

  /**
   * Load a previous scan from history
   */
  const loadScan = useCallback(async (scan: ComplianceScan) => {
    console.log(`[Scanner] Loading previous scan: ${scan.id}`)
    
    try {
      // Fetch issues for this scan
      const { issues } = await scannerService.getIssues(scan.id, 1, 50, {
        confidence: ['high', 'medium'],
      })
      
      console.log(`[Scanner] Loaded ${issues.length} issues for scan ${scan.id}`)
      
      dispatch({ type: 'LOAD_SCAN', scan, issues })
      
    } catch (error) {
      console.error(`[Scanner] Failed to load scan:`, error)
      dispatch({ 
        type: 'SCAN_FAILED', 
        error: error instanceof Error ? error.message : 'Failed to load scan' 
      })
    }
  }, [])

  return {
    // State
    ...state,
    isScanning: state.status === 'pending' || state.status === 'scanning',
    isComplete: state.status === 'completed',
    hasError: state.status === 'failed' || state.status === 'timeout',
    
    // Actions
    startScan,
    cancelScan,
    reset,
    loadMoreIssues,
    loadScan,
  }
}

export default useScanner
