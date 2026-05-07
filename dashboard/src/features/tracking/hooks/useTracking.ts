// 👤 JANNIK: useTracking Hook
// Manages tracking state and API calls

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../lib/api'
import { useAuth } from '../../auth/hooks/useAuth'

interface Site {
  id: string
  hostname: string
  name?: string
  created_at: string
}

interface TrackingEvent {
  id?: string
  site_id?: string
  type: string
  timestamp: string
  url: string
  session_id?: string
  data?: Record<string, unknown>
  created_at?: string
}

interface AnalyticsSummary {
  total_events: number
  unique_sessions: number
  page_views: number
  interactions: number
}

export function useTracking() {
  const { token } = useAuth()
  
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch sites
  const fetchSites = useCallback(async () => {
    if (!token) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.tracking.getSites(token)
      setSites(response.sites)
      
      // Auto-select first site if none selected
      if (response.sites.length > 0 && !selectedSite) {
        setSelectedSite(response.sites[0])
      }
    } catch (err) {
      setError('Failed to load sites')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedSite])

  // Fetch events for selected site
  const fetchEvents = useCallback(async (params?: { from?: string; to?: string; type?: string }) => {
    if (!token || !selectedSite) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.tracking.getEvents(token, selectedSite.id, params)
      setEvents(response.events)
    } catch (err) {
      setError('Failed to load events')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedSite])

  // Fetch analytics for selected site
  const fetchAnalytics = useCallback(async (period: 'day' | 'week' | 'month' = 'week') => {
    if (!token || !selectedSite) return
    
    try {
      const response = await api.tracking.getAnalytics(token, selectedSite.id, period)
      setAnalytics(response)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }, [token, selectedSite])

  // Create a new site
  const createSite = useCallback(async (hostname: string, name?: string) => {
    if (!token) return null
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.tracking.createSite(token, hostname, name)
      await fetchSites() // Refresh sites list
      return response
    } catch (err) {
      setError('Failed to create site')
      console.error(err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [token, fetchSites])

  // Load sites on mount
  useEffect(() => {
    fetchSites()
  }, [fetchSites])

  // Load events and analytics when site changes
  useEffect(() => {
    if (selectedSite) {
      fetchEvents()
      fetchAnalytics()
    }
  }, [selectedSite, fetchEvents, fetchAnalytics])

  return {
    sites,
    selectedSite,
    setSelectedSite,
    events,
    analytics,
    isLoading,
    error,
    fetchSites,
    fetchEvents,
    fetchAnalytics,
    createSite,
  }
}
