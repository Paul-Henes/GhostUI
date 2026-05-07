// 👤 JANNIK: Run History Component

import type { AgentRun } from '../../../lib/types'

interface RunHistoryProps {
  runs: AgentRun[]
  selectedRunId?: string
  onSelectRun: (run: AgentRun) => void
  isLoading?: boolean
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function getStatusBadge(status: string): { color: string; label: string } {
  switch (status) {
    case 'completed':
      return { color: 'bg-emerald-50 text-emerald-800 border-emerald-100', label: 'Completed' }
    case 'running':
      return { color: 'bg-blue-50 text-blue-800 border-blue-100', label: 'Running' }
    case 'failed':
      return { color: 'bg-rose-50 text-rose-800 border-rose-100', label: 'Failed' }
    case 'pending':
      return { color: 'bg-amber-50 text-amber-800 border-amber-100', label: 'Pending' }
    default:
      return { color: 'bg-slate-50 text-slate-800 border-slate-100', label: status }
  }
}

function getAgentLabel(type: string): string {
  switch (type) {
    case 'auditor':
      return 'Auditor'
    case 'fixer':
      return 'Fixer'
    case 'analyzer':
      return 'Analyzer'
    case 'personalizer':
      return 'Personalizer'
    default:
      return type
  }
}

export function RunHistory({ runs, selectedRunId, onSelectRun, isLoading }: RunHistoryProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-white/60 p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white/60 p-8 text-center">
        <p className="text-muted-foreground">No agent runs yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Run an agent to see results here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {runs.map(run => {
        const status = getStatusBadge(run.status)
        const isSelected = run.id === selectedRunId
        
        return (
          <button
            key={run.id}
            onClick={() => onSelectRun(run)}
            className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
              isSelected 
                ? 'bg-foreground/[0.04] border-foreground/20' 
                : 'border-border bg-white/60 hover:bg-white/80'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-semibold text-foreground">
                  {getAgentLabel(run.agent_type)}
                </span>
                <span className={`pill inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}>
                  {status.label}
                </span>
              </div>
              
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTimestamp(run.created_at)}
              </span>
            </div>
            
            {run.input && Object.keys(run.input).length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground truncate">
                {run.input.url as string || run.input.issue_id as string || 'Agent task'}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
