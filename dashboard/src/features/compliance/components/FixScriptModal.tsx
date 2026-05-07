// 👤 LUCAS: Fix Script Modal Component
// Modal for displaying and copying the One-Click Fix embed code

import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

interface FixScriptModalProps {
  scanId: string
  websiteUrl: string
  issueCount: number
  onClose: () => void
}

const BACKEND_URL = 'https://ghostui.onrender.com'

export function FixScriptModal({ scanId, websiteUrl, issueCount, onClose }: FixScriptModalProps) {
  const [copied, setCopied] = useState(false)
  
  const scriptUrl = `${BACKEND_URL}/api/compliance/fix/${scanId}.js`
  
  const embedCode = `<!-- Ghost-UI Accessibility Fixes for ${websiteUrl} -->
<script src="${scriptUrl}" async defer></script>`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = embedCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = scriptUrl
    link.download = `ghostui-fix-${scanId}.js`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              One-Click Accessibility Fix
            </h2>
            <p className="text-gray-600 mt-1">
              Embed this script to automatically fix {issueCount} accessibility issues
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Schließen"
          >
            &times;
          </button>
        </div>

        {/* What it does */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">What this script does:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Adds missing alt texts to images
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Adds ARIA labels to empty buttons and links
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Fixes form inputs without labels
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Adds skip-to-content link for keyboard users
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Injects proper focus styles
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Provides accessibility widget for visitors (contrast, text size, etc.)
            </li>
          </ul>
        </div>

        {/* Embed Code */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Embed Code:</h3>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{embedCode}</code>
            </pre>
            <button
              onClick={handleCopy}
              className={`absolute top-2 right-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Add this code to your website, preferably just before the closing &lt;/body&gt; tag.
          </p>
        </div>

        {/* Installation Steps */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Installation:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Copy the embed code above</li>
            <li>Open your website's HTML or CMS settings</li>
            <li>Paste the code before &lt;/body&gt; or in the footer scripts section</li>
            <li>Save and publish - fixes are now live for all visitors!</li>
          </ol>
        </div>

        {/* Important Note */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-semibold text-amber-900 mb-1">Important:</h3>
          <p className="text-sm text-amber-800">
            This script applies fixes based on the scan from {new Date().toLocaleDateString('de-DE')}. 
            If you make significant changes to your website, run a new scan and update the script.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={handleDownload}
          >
            Download Script
          </Button>
          <Button onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Embed Code'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default FixScriptModal
