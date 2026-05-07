// 👤 JANNIK: Add Site Modal Component

import { useState, FormEvent } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'

// Icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

interface AddSiteModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (hostname: string, name?: string) => Promise<void>
}

export function AddSiteModal({ isOpen, onClose, onSubmit }: AddSiteModalProps) {
  const [hostname, setHostname] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!hostname.trim()) {
      setError('Hostname is required')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit(hostname.trim(), name.trim() || undefined)
      setHostname('')
      setName('')
      onClose()
    } catch (err) {
      setError('Failed to add site')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl tracking-tight text-foreground">Add New Site</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-2xl"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <Input
              label="Website URL / Hostname *"
              id="hostname"
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="example.com"
            />
            
            <Input
              label="Display Name (optional)"
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Website"
            />
          </div>
          
          <div className="mt-6 flex gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              className="rounded-2xl"
            >
              {isSubmitting ? 'Adding...' : 'Add Site'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
