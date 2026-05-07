// 👤 LUCAS: Fix Modal Component
// Modal to display AI-generated code fixes for accessibility issues

import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import type { ComplianceIssue } from '../types/compliance'

// ===========================================
// Types
// ===========================================

export interface CodeFix {
  fixedCode: string
  explanation: string
  changes: string[]
}

export interface FixModalProps {
  issue: ComplianceIssue
  onClose: () => void
  onGenerateFix: (issueId: string, code?: string) => Promise<CodeFix>
}

// ===========================================
// Component
// ===========================================

export function FixModal({ issue, onClose, onGenerateFix }: FixModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fix, setFix] = useState<CodeFix | null>(null)
  const [customCode, setCustomCode] = useState(issue.elementHtml || '')
  const [copied, setCopied] = useState(false)

  const handleGenerateFix = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await onGenerateFix(issue.id, customCode || undefined)
      setFix(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate fix')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (fix?.fixedCode) {
      try {
        await navigator.clipboard.writeText(fix.fixedCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generate Code Fix</h2>
            <p className="text-sm text-gray-500">{issue.wcagCriterion}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Issue Description */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-amber-800 mb-1">Issue</h3>
            <p className="text-sm text-amber-700">{issue.description}</p>
          </div>

          {/* Original Code Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Code (optional - provide context for better fixes)
            </label>
            <textarea
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="Paste the problematic HTML/CSS code here..."
              className="w-full h-32 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Generate Button */}
          {!fix && (
            <Button
              onClick={handleGenerateFix}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating Fix with GPT-4...
                </span>
              ) : (
                'Generate Fix'
              )}
            </Button>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={handleGenerateFix}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Fix Result */}
          {fix && (
            <div className="space-y-4">
              {/* Fixed Code */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Fixed Code</label>
                  <button
                    onClick={handleCopyCode}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>{fix.fixedCode}</code>
                </pre>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">{fix.explanation}</p>
                </div>
              </div>

              {/* Changes List */}
              {fix.changes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Changes Made</label>
                  <ul className="space-y-1">
                    {fix.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 mt-0.5">+</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Generate Another */}
              <Button
                variant="secondary"
                onClick={() => {
                  setFix(null)
                  setError(null)
                }}
                className="w-full"
              >
                Generate New Fix
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default FixModal
