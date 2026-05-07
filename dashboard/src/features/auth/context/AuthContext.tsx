// 👤 LUCAS: Auth Context (Direct Supabase Auth)
// Previously by Jannik (backend API), now using Supabase directly
// Provides authentication state throughout the app

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../../../lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '../../../lib/types'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Convert Supabase user to our User interface
 */
function mapSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    created_at: supabaseUser.created_at,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from Supabase session
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(mapSupabaseUser(session.user))
        setToken(session.access_token)
        // Store token in localStorage for services that need it
        localStorage.setItem('auth_token', session.access_token)
      }
      setIsLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(mapSupabaseUser(session.user))
          setToken(session.access_token)
          localStorage.setItem('auth_token', session.access_token)
        } else {
          setUser(null)
          setToken(null)
          localStorage.removeItem('auth_token')
        }
        setIsLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.session && data.user) {
        setUser(mapSupabaseUser(data.user))
        setToken(data.session.access_token)
        return { success: true }
      }

      return { success: false, error: 'Login failed - no session returned' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during login'
      return { success: false, error: message }
    }
  }

  const signup = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { 
          success: true, 
          error: 'Please check your email to confirm your account' 
        }
      }

      if (data.session && data.user) {
        setUser(mapSupabaseUser(data.user))
        setToken(data.session.access_token)
        return { success: true }
      }

      return { success: false, error: 'Signup failed - no user returned' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during signup'
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      // Ignore logout errors, still clear local state
      console.error('Logout error:', error)
    }
    
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
