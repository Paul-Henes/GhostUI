// 👤 LUCAS: Scanner Form Component
// URL input with validation and scan button

import { useState, useCallback, FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'

// ===========================================
// Types
// ===========================================

export interface ScannerFormProps {
  onSubmit: (url: string) => void
  isLoading?: boolean
  disabled?: boolean
}

// ===========================================
// URL Validation
// ===========================================

function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeUrl(url: string): string {
  let normalized = url.trim()
  
  // Add https:// if no protocol
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  
  return normalized
}

// ===========================================
// Component
// ===========================================

export function ScannerForm({ onSubmit, isLoading = false, disabled = false }: ScannerFormProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const normalizedUrl = normalizeUrl(url)
    
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }
    
    if (!isValidUrl(normalizedUrl)) {
      setError('Please enter a valid URL (e.g., https://example.com)')
      return
    }
    
    onSubmit(normalizedUrl)
  }, [url, onSubmit])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    if (error) setError(null)
  }, [error])

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="Enter website URL (e.g., example.com)"
            disabled={isLoading || disabled}
            aria-label="Website URL to scan"
            aria-describedby={error ? 'url-error' : undefined}
            aria-invalid={!!error}
            className={error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          />
          {error && (
            <p id="url-error" className="mt-1 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        
        <Button
          type="submit"
          disabled={isLoading || disabled || !url.trim()}
          className="sm:w-auto w-full"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Scanning...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ScanIcon />
              Start Scan
            </span>
          )}
        </Button>
      </div>
      
      <p className="mt-2 text-sm text-gray-500">
        We'll analyze the website for WCAG 2.1 AA compliance issues
      </p>
    </form>
  )
}

// ===========================================
// Icons
// ===========================================

function ScanIcon() {
  return (
    <svg 
      className="w-5 h-5" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
      />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg 
      className="animate-spin w-5 h-5" 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export default ScannerForm
