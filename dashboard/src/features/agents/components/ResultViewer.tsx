// 👤 JANNIK: Result Viewer Component

import type { AgentRun } from '../../../lib/types'

interface ResultViewerProps {
  run: AgentRun | null
}

function formatJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}

export function ResultViewer({ run }: ResultViewerProps) {
  if (!run) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Select a run to view results</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <h3 className="font-display text-lg tracking-tight text-foreground">
          {run.agent_type ? run.agent_type.charAt(0).toUpperCase() + run.agent_type.slice(1) : 'Agent'} Result
        </h3>
        <p className="text-sm text-muted-foreground">
          {run.created_at ? new Date(run.created_at).toLocaleString() : 'Just now'}
        </p>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5 max-h-[600px] overflow-y-auto">
        {/* Status */}
        {run.status === 'running' && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 text-sm font-medium">Agent is running...</span>
          </div>
        )}

        {run.status === 'failed' && run.error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <h4 className="font-semibold text-rose-800 mb-2">Error</h4>
            <p className="text-sm text-rose-700">{run.error}</p>
          </div>
        )}

        {/* Input */}
        <div>
          <h4 className="font-semibold text-foreground mb-2">Input</h4>
          <div className="rounded-2xl bg-foreground overflow-hidden">
            <pre className="p-4 overflow-x-auto text-sm">
              <code className="text-background/90">{formatJSON(run.input)}</code>
            </pre>
          </div>
        </div>

        {/* Output */}
        {run.output && (
          <div>
            <h4 className="font-semibold text-foreground mb-2">Output</h4>
            
            {/* Analyzer-specific display */}
            {run.agent_type === 'analyzer' && 'score' in run.output && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="p-4 bg-muted/50 rounded-2xl">
                  <p className="text-sm text-muted-foreground">UX Score</p>
                  <p className="font-display text-3xl tracking-tight text-foreground">
                    {run.output.score != null ? String(run.output.score) : '—'}/100
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-2xl">
                  <p className="text-sm text-muted-foreground">Issues Found</p>
                  <p className="font-display text-3xl tracking-tight text-foreground">
                    {Array.isArray(run.output.issues) ? run.output.issues.length : 0}
                  </p>
                </div>
              </div>
            )}

            {/* Fixer-specific display */}
            {run.agent_type === 'fixer' && 'fixed_code' in run.output && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-foreground mb-2">Fixed Code</h5>
                <div className="rounded-2xl bg-foreground overflow-hidden">
                  <pre className="p-4 overflow-x-auto text-sm">
                    <code className="text-emerald-400">{typeof run.output.fixed_code === 'string' ? run.output.fixed_code : ''}</code>
                  </pre>
                </div>
                
                {typeof run.output.explanation === 'string' ? (
                  <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <h5 className="text-sm font-semibold text-blue-800 mb-1">Explanation</h5>
                    <p className="text-sm text-blue-700">{run.output.explanation}</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Issues list for analyzer */}
            {run.agent_type === 'analyzer' && Array.isArray(run.output.issues) && (
              <div className="space-y-2 mb-4">
                <h5 className="text-sm font-semibold text-foreground">Issues</h5>
                {(run.output.issues as Array<{title: string; severity: string; description: string}>).map((issue, i) => (
                  <div key={`issue-${i}`} className="p-3 border border-border rounded-2xl bg-white">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`pill inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        issue.severity === 'critical' ? 'bg-rose-50 text-rose-800 border-rose-100' :
                        issue.severity === 'serious' ? 'bg-orange-50 text-orange-800 border-orange-100' :
                        issue.severity === 'moderate' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                        'bg-slate-50 text-slate-800 border-slate-100'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="font-semibold text-foreground">{issue.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray(run.output.recommendations) && run.output.recommendations.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-foreground mb-2">Recommendations</h5>
                <ul className="space-y-2">
                  {(run.output.recommendations as string[]).map((rec, i) => (
                    <li key={`rec-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw JSON fallback */}
            <details className="mt-4">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                View raw output
              </summary>
              <div className="mt-2 rounded-2xl bg-foreground overflow-hidden">
                <pre className="p-4 overflow-x-auto text-sm">
                  <code className="text-background/90">{formatJSON(run.output)}</code>
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
