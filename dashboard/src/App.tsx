// 🔥 HOTFILE: Coordinate before editing!
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

// ===========================================
// Route imports
// ===========================================

// Landing Page (👤 JANNIK - new animated landing with integrated auth)
import LandingPage from './features/landing/pages/LandingPage'

// Tracking (👤 JANNIK)
import AnalyticsPage from './features/tracking/pages/AnalyticsPage'

// Agents (👤 JANNIK)
import AgentsPage from './features/agents/pages/AgentsPage'

// Compliance (👤 LUCAS)
import CompliancePage from './features/compliance/pages/CompliancePage'

// Settings (👤 SHARED)
import SettingsPage from './features/settings/pages/SettingsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing Page with integrated Auth (👤 JANNIK) */}
          <Route path="/" element={<LandingPage />} />

          {/* Legacy auth routes - redirect to landing */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />

          {/* Tracking - 👤 JANNIK */}
          <Route path="/tracking" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />

          {/* Agents - 👤 JANNIK */}
          <Route path="/agents" element={
            <ProtectedRoute>
              <AgentsPage />
            </ProtectedRoute>
          } />

          {/* Compliance - 👤 LUCAS */}
          <Route path="/compliance" element={
            <ProtectedRoute>
              <CompliancePage />
            </ProtectedRoute>
          } />

          {/* Settings - 👤 SHARED */}
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
