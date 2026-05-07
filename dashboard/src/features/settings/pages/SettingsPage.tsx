// 👤 LUCAS: Settings Page
// API key management for n8n and automation integrations

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useAuthContext } from '../../auth/context/AuthContext'

interface ApiKey {
  id: string
  name: string
  key_preview: string
  created_at: string
  is_active: boolean
}

const BACKEND_URL = 'https://ghostui.onrender.com'

export default function SettingsPage() {
  const { token, user } = useAuthContext()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      
      if (data.success) {
        setApiKeys(data.keys || [])
      } else {
        setError(data.error || 'Failed to load API keys')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  // Create new API key
  const handleCreateKey = async () => {
    if (!token || !newKeyName.trim()) return
    
    setIsCreating(true)
    setError(null)
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/api-keys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await response.json()
      
      if (data.success && data.api_key) {
        setNewlyCreatedKey(data.api_key)
        setNewKeyName('')
        fetchApiKeys()
      } else {
        setError(data.error || 'Failed to create API key')
      }
    } catch (err) {
      setError('Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  // Revoke API key
  const handleRevokeKey = async (keyId: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      
      if (data.success) {
        fetchApiKeys()
      } else {
        setError(data.error || 'Failed to revoke API key')
      }
    } catch (err) {
      setError('Failed to revoke API key')
    }
  }

  // Copy to clipboard
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-600">
            Manage your account and API integrations
          </p>
        </div>

        {/* Account Info */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Email:</span> {user?.email}</p>
            <p><span className="text-gray-500">User ID:</span> {user?.id}</p>
          </div>
        </Card>

        {/* API Keys Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
              <p className="text-sm text-gray-600 mt-1">
                Use API keys for n8n, automation, and external integrations
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Newly Created Key Alert */}
          {newlyCreatedKey && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">API Key Created!</h3>
                  <p className="text-sm text-green-700 mb-3">
                    Copy this key now - you won't be able to see it again.
                  </p>
                  <code className="block p-3 bg-green-100 rounded text-sm font-mono break-all">
                    {newlyCreatedKey}
                  </code>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleCopy(newlyCreatedKey)}
                >
                  {copied ? 'Copied!' : 'Copy Key'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setNewlyCreatedKey(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Create New Key Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Create New API Key</h3>
            <div className="flex gap-3">
              <Input
                placeholder="Key name (e.g., n8n Integration)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCreateKey}
                disabled={isCreating || !newKeyName.trim()}
              >
                {isCreating ? 'Creating...' : 'Create Key'}
              </Button>
            </div>
          </div>

          {/* Existing Keys List */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Your API Keys</h3>
            
            {isLoading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : apiKeys.length === 0 ? (
              <p className="text-gray-500 text-sm">No API keys yet. Create one above.</p>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      key.is_active ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{key.name}</span>
                        {!key.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <code className="bg-gray-100 px-1 rounded">{key.key_preview}</code>
                        <span className="mx-2">·</span>
                        Created {new Date(key.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {key.is_active && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRevokeKey(key.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Using API Keys</h3>
            <p className="text-sm text-blue-800 mb-3">
              Add your API key to the Authorization header:
            </p>
            <code className="block p-3 bg-blue-100 rounded text-sm font-mono text-blue-900">
              Authorization: Bearer ghostui_xxxxx...
            </code>
            <p className="text-sm text-blue-700 mt-3">
              Works with n8n, curl, Postman, and any HTTP client.
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
