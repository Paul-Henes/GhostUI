// 👤 LUCAS: Issues List Component
// Paginated list of compliance issues with filtering

import { useState, useMemo } from 'react'
import { IssueCard, IssueCardSkeleton } from './IssueCard'
import { SeverityBadge } from './SeverityBadge'
import { Button } from '../../../components/ui/Button'
import type { ComplianceIssue, IssueSeverity, IssueSource, IssueFilters } from '../types/compliance'

// ===========================================
// Types
// ===========================================

export interface IssuesListProps {
  issues: ComplianceIssue[]
  isLoading?: boolean
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onResolveIssue?: (issueId: string) => void
  onGenerateFix?: (issue: ComplianceIssue) => void
  emptyMessage?: string
}

// ===========================================
// Filter Bar
// ===========================================

interface FilterBarProps {
  filters: IssueFilters
  onFilterChange: (filters: IssueFilters) => void
  counts: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
}

function FilterBar({ filters, onFilterChange, counts }: FilterBarProps) {
  const severityOptions: IssueSeverity[] = ['critical', 'serious', 'moderate', 'minor']
  const sourceOptions: { value: IssueSource; label: string }[] = [
    { value: 'both', label: 'Confirmed' },
    { value: 'axe-core', label: 'axe-core' },
    { value: 'gemini', label: 'Gemini' },
  ]
  
  const toggleSeverity = (severity: IssueSeverity) => {
    const current = filters.severity || []
    const updated = current.includes(severity)
      ? current.filter(s => s !== severity)
      : [...current, severity]
    onFilterChange({ ...filters, severity: updated.length ? updated : undefined })
  }
  
  const toggleSource = (source: IssueSource) => {
    const current = filters.source || []
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source]
    onFilterChange({ ...filters, source: updated.length ? updated : undefined })
  }
  
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg mb-4">
      {/* Severity filters */}
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
          Severity
        </span>
        <div className="flex flex-wrap gap-2">
          {severityOptions.map(severity => {
            const isActive = !filters.severity || filters.severity.includes(severity)
            const count = counts[severity]
            return (
              <button
                key={severity}
                onClick={() => toggleSeverity(severity)}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  transition-opacity
                  ${isActive ? 'opacity-100' : 'opacity-40'}
                `}
                aria-pressed={isActive}
              >
                <SeverityBadge severity={severity} size="sm" />
                <span className="text-gray-500">({count})</span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Source filters */}
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
          Source
        </span>
        <div className="flex flex-wrap gap-2">
          {sourceOptions.map(({ value, label }) => {
            const isActive = !filters.source || filters.source.includes(value)
            return (
              <button
                key={value}
                onClick={() => toggleSource(value)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium border
                  transition-all
                  ${isActive 
                    ? 'bg-white border-gray-300 text-gray-700' 
                    : 'bg-gray-100 border-transparent text-gray-400'
                  }
                `}
                aria-pressed={isActive}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Show resolved toggle */}
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
          Status
        </span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showResolved || false}
            onChange={(e) => onFilterChange({ ...filters, showResolved: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Show resolved</span>
        </label>
      </div>
    </div>
  )
}

// ===========================================
// Pagination
// ===========================================

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>
      
      <span className="text-sm text-gray-600 px-4">
        Page {currentPage} of {totalPages}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  )
}

// ===========================================
// Main Component
// ===========================================

export function IssuesList({
  issues,
  isLoading = false,
  totalCount,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  onResolveIssue,
  onGenerateFix,
  emptyMessage = 'No issues found',
}: IssuesListProps) {
  const [filters, setFilters] = useState<IssueFilters>({})
  
  // Calculate counts for filter badges
  const counts = useMemo(() => ({
    critical: issues.filter(i => i.severity === 'critical').length,
    serious: issues.filter(i => i.severity === 'serious').length,
    moderate: issues.filter(i => i.severity === 'moderate').length,
    minor: issues.filter(i => i.severity === 'minor').length,
  }), [issues])
  
  // Apply local filters (in addition to server-side)
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (filters.severity?.length && !filters.severity.includes(issue.severity)) {
        return false
      }
      if (filters.source?.length && !filters.source.includes(issue.source)) {
        return false
      }
      if (!filters.showResolved && issue.isResolved) {
        return false
      }
      return true
    })
  }, [issues, filters])
  
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <IssueCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  // Empty state
  if (filteredIssues.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }
  
  return (
    <div>
      {/* Filter bar */}
      <FilterBar 
        filters={filters} 
        onFilterChange={setFilters}
        counts={counts}
      />
      
      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        Showing {filteredIssues.length} of {totalCount || issues.length} issues
      </p>
      
      {/* Issue cards */}
      <div className="space-y-4">
        {filteredIssues.map(issue => (
          <IssueCard
            key={issue.id}
            issue={issue}
            onResolve={onResolveIssue}
            onGenerateFix={onGenerateFix}
          />
        ))}
      </div>
      
      {/* Pagination */}
      {onPageChange && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default IssuesList
