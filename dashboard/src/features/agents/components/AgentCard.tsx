// 👤 JANNIK: Agent Card Component

import type { AgentInfo } from '../../../lib/types'
import { Button } from '../../../components/ui/Button'

// Icon components
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

const WrenchIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

const BarChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
)

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

interface AgentCardProps {
  agent: AgentInfo
  onRun: (agentType: string) => void
  isRunning?: boolean
}

function getAgentIcon(type: string) {
  switch (type) {
    case 'auditor':
      return SearchIcon
    case 'fixer':
      return WrenchIcon
    case 'analyzer':
      return BarChartIcon
    case 'personalizer':
      return UserIcon
    default:
      return SearchIcon
  }
}

function getAgentColor(type: string): string {
  switch (type) {
    case 'auditor':
      return 'bg-blue-50 text-blue-700 border-blue-100'
    case 'fixer':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    case 'analyzer':
      return 'bg-purple-50 text-purple-700 border-purple-100'
    case 'personalizer':
      return 'bg-amber-50 text-amber-700 border-amber-100'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-100'
  }
}

export function AgentCard({ agent, onRun, isRunning }: AgentCardProps) {
  const IconComponent = getAgentIcon(agent.type)
  
  return (
    <div className="soft-card noise group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(17,24,39,0.12)]">
      <div className="flex items-start gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl border ${getAgentColor(agent.type)}`}>
          <IconComponent className="h-6 w-6" />
        </span>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg tracking-tight text-foreground">{agent.name}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>
        </div>
      </div>
      
      <Button
        onClick={() => onRun(agent.type)}
        disabled={isRunning}
        className="mt-5 w-full rounded-2xl"
        isLoading={isRunning}
      >
        {!isRunning && <PlayIcon className="mr-2 h-4 w-4" />}
        {isRunning ? 'Running...' : 'Run Agent'}
      </Button>
    </div>
  )
}
