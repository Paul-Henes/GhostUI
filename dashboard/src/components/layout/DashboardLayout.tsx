// 👤 SHARED: Dashboard Layout Component
// Provides consistent layout for authenticated pages

import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { Button } from '../ui/Button'

interface DashboardLayoutProps {
  children: ReactNode
}

// Icon components (inline SVGs for simplicity)
const BarChart3Icon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
)

const BotIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
)

const ShieldCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const CircleUserIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
  </svg>
)

const LogOutIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const navItems = [
  { path: '/tracking', label: 'Analytics', Icon: BarChart3Icon },
  { path: '/agents', label: 'Agents', Icon: BotIcon },
  { path: '/compliance', label: 'Compliance', Icon: ShieldCheckIcon }, // 👤 LUCAS
  { path: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-[260px] md:flex-col soft-card noise rounded-3xl p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-foreground text-background">
              <span className="font-display text-lg" aria-hidden="true">
                G
              </span>
            </div>
            <div className="min-w-0">
              <Link to="/" className="font-display text-sm tracking-tight hover:opacity-80 transition-opacity">
                Ghost-UI
              </Link>
              <p className="text-xs text-muted-foreground">
                Dashboard
              </p>
            </div>
          </div>

          {/* Separator */}
          <div className="my-4 h-px bg-border" />

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-foreground/[0.04] text-foreground'
                      : 'text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground'
                  }`}
                >
                  <item.Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="mt-6 px-1">
            <div className="rounded-2xl border border-border bg-white p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-foreground/[0.06]">
                  <CircleUserIcon className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="mt-3 w-full rounded-2xl"
                onClick={logout}
              >
                <LogOutIcon className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <div className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.5rem)] -translate-x-1/2">
          <div className="soft-card noise rounded-3xl px-3 py-2">
            <div className="flex items-center justify-between">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`grid w-full place-items-center gap-1 rounded-2xl py-2 text-xs font-medium ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <item.Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
