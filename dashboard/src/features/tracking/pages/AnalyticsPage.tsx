// 👤 JANNIK: Analytics Page
// Updated: Now uses DashboardLayout for consistent navigation

import { useState } from 'react'
import { useTracking } from '../hooks/useTracking'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { SiteSelector } from '../components/SiteSelector'
import { StatsCard } from '../components/StatsCard'
import { EventsTable } from '../components/EventsTable'
import { EmbedSnippet } from '../components/EmbedSnippet'
import { AddSiteModal } from '../components/AddSiteModal'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

// Icon components
const CodeIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
)

export default function AnalyticsPage() {
  const {
    sites,
    selectedSite,
    setSelectedSite,
    events,
    analytics,
    isLoading,
    error,
    createSite,
    fetchAnalytics,
  } = useTracking()

  const [showAddModal, setShowAddModal] = useState(false)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [showSnippet, setShowSnippet] = useState(false)

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month') => {
    setPeriod(newPeriod)
    fetchAnalytics(newPeriod)
  }

  const handleAddSite = async (hostname: string, name?: string) => {
    const result = await createSite(hostname, name)
    if (result) {
      setShowSnippet(true)
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
                Analytics <span className="text-muted-foreground">overview</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <SiteSelector
                sites={sites}
                selectedSite={selectedSite}
                onSelect={setSelectedSite}
                onAddNew={() => setShowAddModal(true)}
              />
            </div>
          </div>
        </header>

        {error && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        )}

        {selectedSite ? (
          <>
            {/* Period Selector & Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Period:</span>
              {(['day', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`pill rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
              
              <Button
                variant="secondary"
                className="ml-auto rounded-full"
                onClick={() => setShowSnippet(!showSnippet)}
              >
                <CodeIcon className="mr-2 h-4 w-4" />
                {showSnippet ? 'Hide' : 'Show'} Embed Code
              </Button>
            </div>

            {/* Embed Snippet */}
            {showSnippet && (
              <EmbedSnippet siteId={selectedSite.id} />
            )}

            {/* Stats Grid */}
            <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Events"
                value={analytics?.total_events || 0}
                subtitle={`Last ${period}`}
                icon="activity"
              />
              <StatsCard
                title="Unique Sessions"
                value={analytics?.unique_sessions || 0}
                subtitle="Distinct visitors"
                icon="users"
              />
              <StatsCard
                title="Page Views"
                value={analytics?.page_views || 0}
                subtitle="Pages loaded"
                icon="eye"
              />
              <StatsCard
                title="Interactions"
                value={analytics?.interactions || 0}
                subtitle="Clicks & scrolls"
                icon="pointer"
              />
            </section>

            {/* Events Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl tracking-tight">Recent Events</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Latest tracked interactions on your site
                  </p>
                </div>
              </div>
              <EventsTable events={events} isLoading={isLoading} />
            </Card>
          </>
        ) : (
          <Card className="p-12 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-foreground/[0.04]">
              <PlusIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl tracking-tight mb-2">No sites yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add your first website to start tracking user interactions and analytics
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="rounded-full px-8"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Your First Site
            </Button>
          </Card>
        )}
      </div>

      {/* Add Site Modal */}
      <AddSiteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSite}
      />
    </DashboardLayout>
  )
}
