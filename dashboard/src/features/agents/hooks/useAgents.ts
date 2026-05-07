// 👤 JANNIK: useAgents Hook
// Manages agents state and API calls

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../lib/api'
import { useAuth } from '../../auth/hooks/useAuth'

interface AgentInfo {
  type: string
  name: string
  description: string
}

interface AgentRun {
  id: string
  agent_type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  created_at: string
  completed_at?: string
}

export function useAgents() {
  const { token } = useAuth()
  
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available agents
  const fetchAgents = useCallback(async () => {
    if (!token) return
    
    try {
      const response = await api.agents.list(token)
      setAgents(response.agents)
    } catch (err) {
      console.error('Failed to load agents:', err)
    }
  }, [token])

  // Fetch run history
  const fetchRuns = useCallback(async (params?: { agentType?: string; status?: string }) => {
    if (!token) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.agents.getRuns(token, params)
      setRuns(response.runs)
    } catch (err) {
      setError('Failed to load agent runs')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  // Run the fixer agent
  const runFixer = useCallback(async (params: { issueId?: string; code?: string; issueDescription?: string }) => {
    if (!token) return null
    
    setIsRunning(true)
    setError(null)
    
    try {
      const response = await api.agents.runFixer(token, params)
      await fetchRuns() // Refresh runs
      return response
    } catch (err) {
      setError('Failed to run fixer agent')
      console.error(err)
      return null
    } finally {
      setIsRunning(false)
    }
  }, [token, fetchRuns])

  // Run the analyzer agent
  const runAnalyzer = useCallback(async (url: string) => {
    if (!token) return null
    
    setIsRunning(true)
    setError(null)
    
    try {
      const response = await api.agents.runAnalyzer(token, url)
      await fetchRuns() // Refresh runs
      return response
    } catch (err) {
      setError('Failed to run analyzer agent')
      console.error(err)
      return null
    } finally {
      setIsRunning(false)
    }
  }, [token, fetchRuns])

  // Run the auditor agent (Gemini Vision)
  const runAuditor = useCallback(async (url: string) => {
    if (!token) return null
    
    setIsRunning(true)
    setError(null)
    
    try {
      const response = await api.agents.runAuditor(token, url)
      await fetchRuns() // Refresh runs
      return response
    } catch (err) {
      setError('Failed to run auditor agent')
      console.error(err)
      return null
    } finally {
      setIsRunning(false)
    }
  }, [token, fetchRuns])

  // Load data on mount
  useEffect(() => {
    fetchAgents()
    fetchRuns()
  }, [fetchAgents, fetchRuns])

  return {
    agents,
    runs,
    selectedRun,
    setSelectedRun,
    isLoading,
    isRunning,
    error,
    fetchAgents,
    fetchRuns,
    runFixer,
    runAnalyzer,
    runAuditor,
  }
}
