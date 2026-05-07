// 👤 JANNIK: Agents Page
// Updated: Now uses DashboardLayout for consistent navigation

import { useState, useEffect } from 'react'
import { useAgents } from '../hooks/useAgents'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { AgentCard } from '../components/AgentCard'
import { RunHistory } from '../components/RunHistory'
import { ResultViewer } from '../components/ResultViewer'
import { RunAgentModal } from '../components/RunAgentModal'
import { Card } from '../../../components/ui/Card'

// Icon components
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
)

const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// Toast notification component with new design
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  }

  const icons = {
    success: <CheckCircleIcon className="h-5 w-5" />,
    error: <XCircleIcon className="h-5 w-5" />,
    info: <InfoIcon className="h-5 w-5" />,
  }

  return (
    <div className={`fixed bottom-4 right-4 ${styles[type]} border px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 z-50 animate-slide-up`}>
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function AgentsPage() {
  const {
    agents,
    runs,
    selectedRun,
    setSelectedRun,
    isLoading,
    isRunning,
    error,
    runFixer,
    runAnalyzer,
    runAuditor,
    fetchRuns,
  } = useAgents()

  const [modalAgentType, setModalAgentType] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const handleRunAgent = async (agentType: string, params: Record<string, unknown>) => {
    // Close modal immediately
    setModalAgentType(null)
    
    // Show starting toast
    setToast({ message: `Starting ${agentType} agent...`, type: 'info' })

    let result = null
    
    if (agentType === 'auditor') {
      result = await runAuditor(params.url as string)
    } else if (agentType === 'analyzer') {
      result = await runAnalyzer(params.url as string)
    } else if (agentType === 'fixer') {
      result = await runFixer({
        code: params.code as string,
        issueDescription: params.issueDescription as string,
      })
    } else if (agentType === 'personalizer') {
      // TODO: Implement personalizer
      setToast({ message: 'Personalizer agent coming soon!', type: 'info' })
      return
    }

    if (result) {
      // Ensure result has required fields before setting
      const safeResult = {
        ...result,
        agent_type: result.agent_type || agentType,
        created_at: result.created_at || new Date().toISOString(),
        status: result.status || 'completed',
      }
      setSelectedRun(safeResult as never)
      setToast({ message: `${agentType} agent completed!`, type: 'success' })
      // Refresh runs list
      fetchRuns()
    } else {
      setToast({ message: `${agentType} agent failed. Check the error above.`, type: 'error' })
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <header className="soft-card noise rounded-3xl px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dashboard</p>
              <h1 className="font-display mt-1 text-3xl tracking-tight sm:text-4xl">
                AI <span className="text-muted-foreground">Agents</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Run AI-powered accessibility and UX analysis on your websites
            </p>
          </div>
        </header>

        {error && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        )}

        {/* Agent Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {agents.map(agent => (
            <AgentCard
              key={agent.type}
              agent={agent}
              onRun={() => setModalAgentType(agent.type)}
              isRunning={isRunning}
            />
          ))}
        </section>

        {/* Run History and Results */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="font-display text-xl tracking-tight">Run History</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Previous agent executions
              </p>
            </div>
            <RunHistory
              runs={runs}
              selectedRunId={selectedRun?.id}
              onSelectRun={setSelectedRun}
              isLoading={isLoading}
            />
          </Card>
          
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="font-display text-xl tracking-tight">Results</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Detailed agent output
              </p>
            </div>
            <ResultViewer run={selectedRun} />
          </Card>
        </section>
      </div>

      {/* Run Agent Modal */}
      <RunAgentModal
        isOpen={!!modalAgentType}
        agentType={modalAgentType}
        onClose={() => setModalAgentType(null)}
        onSubmit={handleRunAgent}
        isRunning={isRunning}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </DashboardLayout>
  )
}
