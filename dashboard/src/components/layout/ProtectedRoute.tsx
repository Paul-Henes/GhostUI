// 👤 JANNIK: Protected Route Component
// Redirects to login if user is not authenticated

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to landing page (which has integrated auth)
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <>{children}</>
}
