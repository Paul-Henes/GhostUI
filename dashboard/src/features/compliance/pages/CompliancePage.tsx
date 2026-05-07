// 👤 LUCAS: Compliance Scanner Page
// Main page for WCAG/EAA compliance scanning
// INTEGRATED: Jannik's Auth + Lucas' FixModal/StatementForm Features

import { useCallback, useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { ScannerForm } from '../components/ScannerForm'
import { IssuesList } from '../components/IssuesList'
import { ScoreBadge } from '../components/SeverityBadge'
import { useScanner } from '../hooks/useScanner'
import { useAuthContext } from '../../auth/context/AuthContext'
import { api } from '../../../lib/api'
import { scannerService } from '../services/scannerService'
import { FixModal, type CodeFix } from '../components/FixModal'
import { StatementForm, type StatementFormData } from '../components/StatementForm'
import { FixScriptModal } from '../components/FixScriptModal'
import { ScanHistory } from '../components/ScanHistory'
import type { ComplianceIssue, ComplianceScan } from '../types/compliance'

// ===========================================
// Progress Indicator
// ===========================================

interface ScanProgressProps {
  step: string
  percentage: number
}

function ScanProgress({ step, percentage }: ScanProgressProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">{step}</span>
        <span className="text-muted-foreground font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className="bg-chart-1 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

// ===========================================
// Scan Summary
// ===========================================

interface ScanSummaryProps {
  url: string
  score: number
  criticalCount: number
  seriousCount: number
  moderateCount: number
  minorCount: number
  scannedAt: string
}

function ScanSummary({ url, score, criticalCount, seriousCount, moderateCount, minorCount, scannedAt }: ScanSummaryProps) {
  const totalIssues = criticalCount + seriousCount + moderateCount + minorCount
  
  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Score */}
        <div className="flex-shrink-0">
          <ScoreBadge score={score} size="lg" />
        </div>
        
        {/* Details */}
        <div className="flex-1">
          <h2 className="font-display text-lg tracking-tight text-foreground mb-1 truncate" title={url}>
            {url}
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Scanned {new Date(scannedAt).toLocaleString()}
          </p>
          
          {/* Issue counts */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">{criticalCount} Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">{seriousCount} Serious</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">{moderateCount} Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">{minorCount} Minor</span>
            </div>
          </div>
        </div>
        
        {/* Total */}
        <div className="text-right">
          <p className="font-display text-4xl tracking-tight text-foreground">{totalIssues}</p>
          <p className="text-sm text-muted-foreground">Total Issues</p>
        </div>
      </div>
    </Card>
  )
}

// ===========================================
// Error Display
// ===========================================

interface ErrorDisplayProps {
  message: string
  onRetry: () => void
}

function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <Card className="p-6 border-rose-200 bg-rose-50">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 grid h-10 w-10 place-items-center rounded-2xl bg-rose-100">
          <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-rose-800">Scan Failed</h3>
          <p className="mt-1 text-sm text-rose-700">{message}</p>
          <button
            onClick={onRetry}
            className="mt-3 text-sm font-medium text-rose-600 hover:text-rose-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </Card>
  )
}

// ===========================================
// Main Page Component
// ===========================================

export function CompliancePage() {
  const { token } = useAuthContext()
  const scanner = useScanner({
    timeout: 60000,
    dismissCookieBanner: true,
  })
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false)
  const [showStatementForm, setShowStatementForm] = useState(false)
  const [showFixScriptModal, setShowFixScriptModal] = useState(false)
  
  // Fix Modal State
  const [fixModalIssue, setFixModalIssue] = useState<ComplianceIssue | null>(null)

  const handleScan = useCallback((url: string) => {
    scanner.startScan(url)
  }, [scanner])

  const handleResolveIssue = useCallback((issueId: string) => {
    // TODO: Implement issue resolution via API
    console.log('Resolve issue:', issueId)
  }, [])

  // Generate AI Code Fix
  const handleGenerateFix = useCallback(async (issueId: string, code?: string): Promise<CodeFix> => {
    return await scannerService.generateFix(issueId, code)
  }, [])

  // Open Fix Modal
  const handleOpenFixModal = useCallback((issue: ComplianceIssue) => {
    setFixModalIssue(issue)
  }, [])

  // Load a previous scan from history
  const handleSelectPreviousScan = useCallback((scan: ComplianceScan) => {
    scanner.loadScan(scan)
  }, [scanner])

  // Generate Audit Report with Auth (from Jannik)
  const handleGenerateAuditReport = useCallback(async () => {
    if (!scanner.currentScan?.id || !token) return
    
    setIsGeneratingReport(true)
    try {
      const response = await api.authFetch<{ success: boolean; data: { pdfUrl?: string; htmlUrl?: string } }>(
        '/api/compliance/audit',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ scanId: scanner.currentScan.id }),
        }
      )
      
      if (response.data?.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank')
      } else if (response.data?.htmlUrl) {
        window.open(response.data.htmlUrl, '_blank')
      } else {
        // Fallback: download JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-${scanner.currentScan.id}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to generate audit report:', error)
      alert('Failed to generate audit report. Please try again.')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [scanner.currentScan?.id, token])

  // Generate Statement (using StatementForm component)
  const handleStatementSubmit = useCallback(async (formData: StatementFormData) => {
    if (!scanner.currentScan?.id) return
    
    setIsGeneratingStatement(true)
    try {
      const statement = await scannerService.generateStatement({
        scanId: scanner.currentScan.id,
        ...formData,
        // Convert empty string to undefined for API compatibility
        bundesland: formData.bundesland || undefined,
      })
      
      // Prefer PDF if available, otherwise fall back to HTML
      if (statement.pdfBase64) {
        // Download PDF
        const byteCharacters = atob(statement.pdfBase64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `accessibility-statement-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else if (statement.htmlContent) {
        // Fallback: Open HTML in new tab
        const blob = new Blob([statement.htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        URL.revokeObjectURL(url)
      }
      
      setShowStatementForm(false)
    } catch (error) {
      console.error('Failed to generate statement:', error)
      alert('Failed to generate statement. Please try again.')
    } finally {
      setIsGeneratingStatement(false)
    }
  }, [scanner.currentScan?.id])

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <header className="soft-card noise rounded-3xl px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dashboard</p>
              <h1 className="font-display mt-1 text-3xl tracking-tight sm:text-4xl">
                Compliance <span className="text-muted-foreground">Scanner</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Scan for WCAG 2.1 AA accessibility issues using axe-core + AI analysis
            </p>
          </div>
        </header>

        {/* Scanner Form + History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <ScannerForm
                onSubmit={handleScan}
                isLoading={scanner.isScanning}
                disabled={scanner.isScanning}
              />
              
              {/* Progress indicator during scan */}
              {scanner.isScanning && scanner.progress && (
                <div className="mt-6">
                  <ScanProgress 
                    step={scanner.progress.step} 
                    percentage={scanner.progress.percentage} 
                  />
                </div>
              )}
            </Card>
          </div>
          
          {/* Scan History Sidebar */}
          <div className="lg:col-span-1">
            <ScanHistory
              onSelectScan={handleSelectPreviousScan}
              currentScanId={scanner.currentScan?.id}
            />
          </div>
        </div>

        {/* Error state */}
        {scanner.hasError && scanner.error && (
          <ErrorDisplay 
            message={scanner.error} 
            onRetry={scanner.reset}
          />
        )}

        {/* Results */}
        {scanner.isComplete && scanner.currentScan && (
          <>
            {/* Summary */}
            <ScanSummary
              url={scanner.currentScan.url}
              score={scanner.currentScan.score || 0}
              criticalCount={scanner.currentScan.criticalCount}
              seriousCount={scanner.currentScan.seriousCount}
              moderateCount={scanner.currentScan.moderateCount}
              minorCount={scanner.currentScan.minorCount}
              scannedAt={scanner.currentScan.completedAt || scanner.currentScan.createdAt}
            />

            {/* Issues list with Fix support */}
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="font-display text-xl tracking-tight">
                  Issues Found
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Accessibility issues detected on the scanned page
                </p>
              </div>
              <IssuesList
                issues={scanner.issues}
                totalCount={scanner.currentScan.issueCount}
                onResolveIssue={handleResolveIssue}
                onGenerateFix={handleOpenFixModal}
                emptyMessage="No accessibility issues found!"
              />
            </Card>
            
            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => scanner.reset()}
              >
                Scan Another Site
              </Button>
              <Button
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                onClick={() => setShowFixScriptModal(true)}
              >
                Get One-Click Fix Script
              </Button>
              <Button
                className="rounded-full"
                onClick={handleGenerateAuditReport}
                disabled={isGeneratingReport}
                isLoading={isGeneratingReport}
              >
                Generate Audit Report
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setShowStatementForm(true)}
              >
                Generate Accessibility Statement
              </Button>
            </div>
            
            {/* Statement Form Modal */}
            {showStatementForm && scanner.currentScan && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="max-w-lg w-full">
                  <StatementForm
                    scanId={scanner.currentScan.id}
                    websiteUrl={scanner.currentScan.url}
                    onSubmit={handleStatementSubmit}
                    onCancel={() => setShowStatementForm(false)}
                    isLoading={isGeneratingStatement}
                  />
                </div>
              </div>
            )}
            
            {/* Fix Script Modal */}
            {showFixScriptModal && scanner.currentScan && (
              <FixScriptModal
                scanId={scanner.currentScan.id}
                websiteUrl={scanner.currentScan.url}
                issueCount={scanner.currentScan.issueCount}
                onClose={() => setShowFixScriptModal(false)}
              />
            )}
            
            {/* Fix Modal */}
            {fixModalIssue && (
              <FixModal
                issue={fixModalIssue}
                onClose={() => setFixModalIssue(null)}
                onGenerateFix={handleGenerateFix}
              />
            )}
          </>
        )}

        {/* Empty state - no scan yet */}
        {scanner.status === 'idle' && (
          <Card className="p-12 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-foreground/[0.04]">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-display text-xl tracking-tight mb-2">
              Ready to scan
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a website URL above to check for WCAG 2.1 AA compliance issues. 
              We'll analyze the page using both axe-core automated testing and AI-powered visual analysis.
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

export default CompliancePage
