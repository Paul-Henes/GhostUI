// Landing Page - Comprehensive layout with auth integrated naturally
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { Stats } from '../components/Stats'
import { Features } from '../components/Features'
import { Capabilities } from '../components/Capabilities'
import { HowItWorks } from '../components/HowItWorks'
import { Testimonials } from '../components/Testimonials'
import { GetStarted } from '../components/GetStarted'
import { Footer } from '../components/Footer'
import { useAuth } from '../../auth/hooks/useAuth'

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/tracking')
    }
  }, [isAuthenticated, isLoading, navigate])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero - No auth, just headline + CTAs */}
      <Hero />

      {/* Stats - Social proof numbers */}
      <Stats />

      {/* Features - 3 cards */}
      <Features />

      {/* Capabilities - Bento grid */}
      <Capabilities />

      {/* How it Works - 3 steps */}
      <HowItWorks />

      {/* Testimonials - Customer quotes */}
      <Testimonials />

      {/* Get Started - Auth section integrated naturally */}
      <GetStarted />

      {/* Footer */}
      <Footer />
    </div>
  )
}
