// 👤 JANNIK: Run Agent Modal Component

import { useState, FormEvent } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui/Input'

// Icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
)

interface RunAgentModalProps {
  isOpen: boolean
  agentType: string | null
  onClose: () => void
  onSubmit: (agentType: string, params: Record<string, unknown>) => Promise<void>
  isRunning: boolean
}

export function RunAgentModal({ isOpen, agentType, onClose, onSubmit, isRunning }: RunAgentModalProps) {
  const [url, setUrl] = useState('')
  const [code, setCode] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [error, setError] = useState('')

  if (!isOpen || !agentType) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    let params: Record<string, unknown> = {}

    if (agentType === 'analyzer' || agentType === 'auditor') {
      if (!url.trim()) {
        setError('URL is required')
        return
      }
      params = { url: url.trim() }
    } else if (agentType === 'fixer') {
      if (!code.trim()) {
        setError('Code is required')
        return
      }
      params = {
        code: code.trim(),
        issueDescription: issueDescription.trim(),
      }
    } else if (agentType === 'personalizer') {
      params = { user_needs: {} }
    }

    // Reset form immediately
    setUrl('')
    setCode('')
    setIssueDescription('')
    
    // Close modal and start agent (don't wait for completion)
    onClose()
    onSubmit(agentType, params) // Not awaiting - runs in background
  }

  const getTitle = () => {
    switch (agentType) {
      case 'auditor':
        return 'Run Accessibility Auditor'
      case 'fixer':
        return 'Run Code Fixer'
      case 'analyzer':
        return 'Run UX Analyzer'
      case 'personalizer':
        return 'Run Personalizer'
      default:
        return 'Run Agent'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl tracking-tight text-foreground">{getTitle()}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-2xl"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">
              {error}
            </div>
          )}
          
          {/* Analyzer / Auditor form */}
          {(agentType === 'analyzer' || agentType === 'auditor') && (
            <div>
              <Input
                label="Website URL *"
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                hint="The agent will analyze this page for UX and accessibility issues"
              />
            </div>
          )}

          {/* Fixer form */}
          {agentType === 'fixer' && (
            <div className="space-y-4">
              <Textarea
                label="Code to Fix *"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="<button>Click me</button>"
                rows={5}
                className="font-mono text-sm"
              />
              
              <Input
                label="Issue Description (optional)"
                id="issue"
                type="text"
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Button has no accessible name"
              />
            </div>
          )}

          {/* Personalizer info */}
          {agentType === 'personalizer' && (
            <div className="p-4 bg-muted/50 rounded-2xl flex items-start gap-3">
              <SparklesIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                The personalizer will analyze your needs and generate recommended accessibility preferences.
              </p>
            </div>
          )}
          
          <div className="mt-6 flex gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isRunning}
              isLoading={isRunning}
              className="rounded-2xl"
            >
              {isRunning ? 'Running...' : 'Run Agent'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
