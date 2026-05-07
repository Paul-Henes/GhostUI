// 👤 JANNIK: Stats Card Component

// Icon components
const ActivityIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
)

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const PointerIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 14a8 8 0 0 1-8 8" />
    <path d="M18 11v-1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1" />
    <path d="M10 9.5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10" />
    <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
)

const icons = {
  activity: ActivityIcon,
  users: UsersIcon,
  eye: EyeIcon,
  pointer: PointerIcon,
}

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon?: keyof typeof icons
}

export function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  const IconComponent = icon ? icons[icon] : null
  
  return (
    <div className="soft-card noise group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(17,24,39,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {IconComponent && (
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black/[0.03] text-foreground">
                <IconComponent className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="font-display mt-1 text-4xl leading-[1.05] tracking-tight text-foreground">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            </div>
          </div>
          
          {subtitle && (
            <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      
      {/* Decorative gradient blob */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_60%)] blur-2xl"
        aria-hidden="true"
      />
    </div>
  )
}
