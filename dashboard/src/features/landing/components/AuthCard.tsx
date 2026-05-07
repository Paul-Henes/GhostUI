// Clean Auth Card with Login/Signup toggle
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../auth/hooks/useAuth'

type AuthMode = 'login' | 'signup'

export function AuthCard() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    setIsSubmitting(true)

    const result = mode === 'login' 
      ? await login(email, password)
      : await signup(email, password)
    
    if (result.success) {
      navigate('/tracking')
    } else {
      setError(result.error || `${mode === 'login' ? 'Login' : 'Signup'} failed`)
    }
    
    setIsSubmitting(false)
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        {(['login', 'signup'] as AuthMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === m 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {m === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300
                     text-sm text-gray-900 placeholder-gray-400"
            placeholder="Email"
          />
        </div>

        {/* Password */}
        <div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300
                     text-sm text-gray-900 placeholder-gray-400"
            placeholder="Password"
          />
        </div>

        {/* Confirm Password (signup only) */}
        <AnimatePresence>
          {mode === 'signup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300
                         text-sm text-gray-900 placeholder-gray-400"
                placeholder="Confirm password"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg text-sm text-white font-medium
                   bg-gray-900 hover:bg-gray-800
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" cy="12" r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                  fill="none"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </span>
          ) : (
            mode === 'login' ? 'Sign in' : 'Create account'
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-4 text-center text-sm text-gray-500">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button 
              type="button"
              onClick={toggleMode}
              className="text-gray-900 hover:underline"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button 
              type="button"
              onClick={toggleMode}
              className="text-gray-900 hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  )
}
