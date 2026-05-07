// 👤 JANNIK: Events Table Component

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

interface EventsTableProps {
  events: TrackingEvent[]
  isLoading?: boolean
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function getEventTypeStyles(type: string): string {
  switch (type) {
    case 'pageview':
      return 'bg-blue-50 text-blue-800 border-blue-100'
    case 'click':
      return 'bg-emerald-50 text-emerald-800 border-emerald-100'
    case 'scroll':
      return 'bg-purple-50 text-purple-800 border-purple-100'
    case 'form':
      return 'bg-amber-50 text-amber-800 border-amber-100'
    default:
      return 'bg-slate-50 text-slate-800 border-slate-100'
  }
}

export function EventsTable({ events, isLoading }: EventsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-white/60 p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white/60 p-8 text-center">
        <p className="text-muted-foreground">No events recorded yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Events will appear here once your tracking script is installed
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Session
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={event.id || `event-${index}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`pill inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEventTypeStyles(event.type)}`}>
                    {event.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground truncate block max-w-xs" title={event.url}>
                    {event.url}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-muted-foreground font-mono">
                    {event.session_id?.slice(0, 8) || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                  {formatTimestamp(event.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
