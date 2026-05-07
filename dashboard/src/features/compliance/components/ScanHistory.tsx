// 👤 LUCAS: Scan History Component
// Shows list of past scans with ability to view details

import { useState, useEffect } from 'react'
import { Card } from '../../../components/ui/Card'
import { ScoreBadge } from './SeverityBadge'
import { scannerService } from '../services/scannerService'
import type { ComplianceScan } from '../types/compliance'

interface ScanHistoryProps {
  onSelectScan: (scan: ComplianceScan) => void
  currentScanId?: string
}

export function ScanHistory({ onSelectScan, currentScanId }: ScanHistoryProps) {
  const [scans, setScans] = useState<ComplianceScan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    async function fetchScans() {
      try {
        const response = await scannerService.getUserScans(1, 20)
        setScans(response.scans)
      } catch (err) {
        setError('Failed to load scan history')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchScans()
  }, [currentScanId]) // Refetch when a new scan completes

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-gray-500">Loading scan history...</div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-sm text-red-600">{error}</div>
      </Card>
    )
  }

  if (scans.length === 0) {
    return null
  }

  const displayedScans = isExpanded ? scans : scans.slice(0, 3)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Recent Scans</h3>
        {scans.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Show less' : `Show all (${scans.length})`}
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {displayedScans.map((scan) => (
          <button
            key={scan.id}
            onClick={() => onSelectScan(scan)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              scan.id === currentScanId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate" title={scan.url}>
                  {new URL(scan.url).hostname}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(scan.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                {scan.status === 'completed' && scan.score !== null && scan.score !== undefined && (
                  <ScoreBadge score={scan.score as number} size="sm" />
                )}
                {scan.status === 'scanning' && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    Scanning...
                  </span>
                )}
                {scan.status === 'failed' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                    Failed
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {scan.issueCount} issues
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}

export default ScanHistory
