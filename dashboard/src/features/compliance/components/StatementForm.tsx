// 👤 LUCAS: Statement Form Component
// Form for generating BFSG-compliant accessibility statements

import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import type { Bundesland, OrganizationType } from '../types/compliance'

// ===========================================
// Types
// ===========================================

export interface StatementFormData {
  organizationName: string
  organizationType: OrganizationType
  websiteUrl: string
  contactEmail: string
  contactPhone: string
  bundesland: Bundesland | ''
}

export interface StatementFormProps {
  scanId: string
  websiteUrl?: string
  onSubmit: (data: StatementFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

// ===========================================
// Bundesland Options
// ===========================================

const BUNDESLAND_OPTIONS: { value: Bundesland; label: string }[] = [
  { value: 'baden-wuerttemberg', label: 'Baden-Württemberg' },
  { value: 'bayern', label: 'Bayern' },
  { value: 'berlin', label: 'Berlin' },
  { value: 'brandenburg', label: 'Brandenburg' },
  { value: 'bremen', label: 'Bremen' },
  { value: 'hamburg', label: 'Hamburg' },
  { value: 'hessen', label: 'Hessen' },
  { value: 'mecklenburg-vorpommern', label: 'Mecklenburg-Vorpommern' },
  { value: 'niedersachsen', label: 'Niedersachsen' },
  { value: 'nordrhein-westfalen', label: 'Nordrhein-Westfalen' },
  { value: 'rheinland-pfalz', label: 'Rheinland-Pfalz' },
  { value: 'saarland', label: 'Saarland' },
  { value: 'sachsen', label: 'Sachsen' },
  { value: 'sachsen-anhalt', label: 'Sachsen-Anhalt' },
  { value: 'schleswig-holstein', label: 'Schleswig-Holstein' },
  { value: 'thueringen', label: 'Thüringen' },
]

// ===========================================
// Component
// ===========================================

export function StatementForm({ 
  scanId: _scanId, // Reserved for future Supabase integration
  websiteUrl = '', 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: StatementFormProps) {
  void _scanId // Suppress unused variable warning
  const [formData, setFormData] = useState<StatementFormData>({
    organizationName: '',
    organizationType: 'private',
    websiteUrl: websiteUrl,
    contactEmail: '',
    contactPhone: '',
    bundesland: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof StatementFormData, string>>>({})

  const handleChange = (field: keyof StatementFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof StatementFormData, string>> = {}

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organisation name is required'
    }
    if (!formData.websiteUrl.trim()) {
      newErrors.websiteUrl = 'Website URL is required'
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Generate Accessibility Statement
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Create a BFSG-compliant accessibility statement based on your scan results.
        This statement is required for public sector and many private sector websites in Germany.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Organization Name */}
        <div>
          <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
            Organization Name *
          </label>
          <Input
            id="organizationName"
            type="text"
            value={formData.organizationName}
            onChange={(e) => handleChange('organizationName', e.target.value)}
            placeholder="e.g., Musterfirma GmbH"
            disabled={isLoading}
          />
          {errors.organizationName && (
            <p className="mt-1 text-sm text-red-600">{errors.organizationName}</p>
          )}
        </div>

        {/* Organization Type */}
        <div>
          <label htmlFor="organizationType" className="block text-sm font-medium text-gray-700 mb-1">
            Organization Type *
          </label>
          <select
            id="organizationType"
            value={formData.organizationType}
            onChange={(e) => handleChange('organizationType', e.target.value as OrganizationType)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="private">Private Sector (Privatwirtschaft)</option>
            <option value="public">Public Sector (Öffentlicher Sektor)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {formData.organizationType === 'public' 
              ? 'Public sector organizations have stricter requirements under BITV 2.0'
              : 'Private sector requirements apply under BFSG from June 2025'
            }
          </p>
        </div>

        {/* Website URL */}
        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Website URL *
          </label>
          <Input
            id="websiteUrl"
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => handleChange('websiteUrl', e.target.value)}
            placeholder="https://www.example.com"
            disabled={isLoading}
          />
          {errors.websiteUrl && (
            <p className="mt-1 text-sm text-red-600">{errors.websiteUrl}</p>
          )}
        </div>

        {/* Contact Email */}
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Email *
          </label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleChange('contactEmail', e.target.value)}
            placeholder="barrierefreiheit@example.com"
            disabled={isLoading}
          />
          {errors.contactEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>
          )}
        </div>

        {/* Contact Phone */}
        <div>
          <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Phone (optional)
          </label>
          <Input
            id="contactPhone"
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => handleChange('contactPhone', e.target.value)}
            placeholder="+49 123 456789"
            disabled={isLoading}
          />
        </div>

        {/* Bundesland */}
        <div>
          <label htmlFor="bundesland" className="block text-sm font-medium text-gray-700 mb-1">
            Bundesland (for Schlichtungsstelle lookup)
          </label>
          <select
            id="bundesland"
            value={formData.bundesland}
            onChange={(e) => handleChange('bundesland', e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select Bundesland (optional)</option>
            {BUNDESLAND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Used to automatically link the correct Schlichtungsstelle and Marktüberwachungsbehörde
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Statement'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default StatementForm
