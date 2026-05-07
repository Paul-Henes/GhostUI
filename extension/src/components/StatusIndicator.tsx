// Status indicator for Voice Agent - used in popup

interface StatusIndicatorProps {
  active: boolean
  loading?: boolean
  label?: string
}

export function StatusIndicator({
  active,
  loading = false,
  label,
}: StatusIndicatorProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={
        loading
          ? "Voice Agent wird geladen"
          : active
            ? "Voice Agent ist aktiv"
            : "Voice Agent ist inaktiv"
      }
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          loading
            ? "animate-pulse bg-amber-500"
            : active
              ? "bg-emerald-500"
              : "bg-gray-300"
        }`}
        aria-hidden
      />
      {label && (
        <span className="text-sm text-gray-600">
          {loading ? "Lädt..." : active ? "Aktiv" : "Inaktiv"}
        </span>
      )}
    </div>
  )
}
