// 👤 JANNIK: Embed Snippet Component
// Updated by Lucas: Unified script with tracking + fixes + widget

import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

// Hardcoded production URL
const DEFAULT_BACKEND_URL = 'https://ghostui.onrender.com'

// Icon components
const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

interface EmbedSnippetProps {
  siteId: string
  backendUrl?: string
}

export function EmbedSnippet({ siteId, backendUrl = DEFAULT_BACKEND_URL }: EmbedSnippetProps) {
  const [copied, setCopied] = useState(false)

  // Simplified unified script - one line!
  const snippet = `<!-- Ghost-UI: Analytics + Accessibility Fixes + Widget -->
<script src="${backendUrl}/ghostui.js?site_id=${siteId}" async defer></script>`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg tracking-tight">Embed Snippet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add this script to your website's <code className="bg-muted px-1.5 py-0.5 rounded-md text-xs">&lt;head&gt;</code> tag
          </p>
        </div>
        <Button
          variant={copied ? 'secondary' : 'outline'}
          onClick={handleCopy}
          className={`rounded-full ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}`}
        >
          {copied ? (
            <>
              <CheckIcon className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon className="mr-2 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      
      <div className="rounded-2xl bg-foreground overflow-hidden">
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="text-background/90">{snippet}</code>
        </pre>
      </div>
    </Card>
  )
}
