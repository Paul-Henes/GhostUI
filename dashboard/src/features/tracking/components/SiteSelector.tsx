// 👤 JANNIK: Site Selector Component

import type { Site } from '../../../lib/types'
import { Button } from '../../../components/ui/Button'

// Icon components
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
)

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

interface SiteSelectorProps {
  sites: Site[]
  selectedSite: Site | null
  onSelect: (site: Site) => void
  onAddNew: () => void
}

export function SiteSelector({ sites, selectedSite, onSelect, onAddNew }: SiteSelectorProps) {
  if (sites.length === 0) {
    return (
      <Button
        onClick={onAddNew}
        className="rounded-full"
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        Add Your First Site
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={selectedSite?.id || ''}
          onChange={(e) => {
            const site = sites.find(s => s.id === e.target.value)
            if (site) onSelect(site)
          }}
          className="appearance-none h-10 pl-4 pr-10 border border-border rounded-2xl bg-card text-foreground text-sm font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer"
        >
          {sites.map(site => (
            <option key={site.id} value={site.id}>
              {site.name || site.hostname}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onAddNew}
        title="Add new site"
        className="rounded-2xl"
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
