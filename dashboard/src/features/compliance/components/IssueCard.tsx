// 👤 LUCAS: Issue Card Component
// Displays a single compliance issue with details

import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { SeverityBadge, SourceBadge, ConfidenceBadge } from './SeverityBadge'
import type { ComplianceIssue } from '../types/compliance'

// ===========================================
// Types
// ===========================================

export interface IssueCardProps {
  issue: ComplianceIssue
  onResolve?: (issueId: string) => void
  onGenerateFix?: (issue: ComplianceIssue) => void
  expanded?: boolean
}

// ===========================================
// Component
// ===========================================

export function IssueCard({ issue, onResolve, onGenerateFix, expanded: initialExpanded = false }: IssueCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded)

  return (
    <Card className={`transition-all ${issue.isResolved ? 'opacity-60' : ''}`}>
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
        aria-expanded={expanded}
        aria-controls={`issue-details-${issue.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <SeverityBadge severity={issue.severity} size="sm" />
              <SourceBadge source={issue.source} />
              <ConfidenceBadge confidence={issue.confidence} />
              {issue.isResolved && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Resolved
                </span>
              )}
            </div>
            
            {/* WCAG criterion */}
            <p className="text-xs text-gray-500 font-mono mb-1">
              {issue.wcagCriterion}
            </p>
            
            {/* Description */}
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
              {issue.description}
            </h3>
          </div>
          
          {/* Expand icon */}
          <span className="text-gray-400 flex-shrink-0" aria-hidden="true">
            <svg 
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </button>
      
      {/* Details - expandable */}
      {expanded && (
        <div 
          id={`issue-details-${issue.id}`}
          className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4"
        >
          {/* Location */}
          {issue.location && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Location
              </h4>
              <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded overflow-x-auto">
                {issue.location}
              </p>
            </div>
          )}
          
          {/* Element HTML */}
          {issue.elementHtml && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Element
              </h4>
              <pre className="text-xs text-gray-700 bg-gray-50 p-2 rounded overflow-x-auto">
                <code>{issue.elementHtml}</code>
              </pre>
            </div>
          )}
          
          {/* Recommendation */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Recommendation
            </h4>
            <p className="text-sm text-gray-700">
              {issue.recommendation}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-4 pt-2">
            {onGenerateFix && (
              <button
                onClick={() => onGenerateFix(issue)}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Fix
              </button>
            )}
            {onResolve && !issue.isResolved && (
              <button
                onClick={() => onResolve(issue.id)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark as Resolved
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

// ===========================================
// Skeleton for loading state
// ===========================================

export function IssueCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex gap-2 mb-2">
              <div className="h-5 w-16 bg-gray-200 rounded-full" />
              <div className="h-5 w-20 bg-gray-200 rounded-full" />
            </div>
            <div className="h-3 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-full bg-gray-200 rounded" />
          </div>
          <div className="h-5 w-5 bg-gray-200 rounded" />
        </div>
      </div>
    </Card>
  )
}

export default IssueCard
