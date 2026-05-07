// 👤 LUCAS: Severity Badge Component
// Visual indicator for issue severity levels

import type { IssueSeverity, IssueSource, ConfidenceLevel } from '../types/compliance'

// ===========================================
// Severity Badge
// ===========================================

export interface SeverityBadgeProps {
  severity: IssueSeverity
  size?: 'sm' | 'md' | 'lg'
}

const severityConfig: Record<IssueSeverity, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  serious: {
    label: 'Serious',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  moderate: {
    label: 'Moderate',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  minor: {
    label: 'Minor',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const config = severityConfig[severity]
  
  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.className}
        ${sizeClasses[size]}
      `}
      role="status"
      aria-label={`Severity: ${config.label}`}
    >
      {config.label}
    </span>
  )
}

// ===========================================
// Source Badge (axe-core vs Gemini)
// ===========================================

export interface SourceBadgeProps {
  source: IssueSource
  size?: 'sm' | 'md'
}

const sourceConfig: Record<IssueSource, { label: string; className: string; icon: string }> = {
  'axe-core': {
    label: 'axe-core',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🔧',
  },
  'gemini': {
    label: 'Gemini',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '✨',
  },
  'both': {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: '✓',
  },
}

export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const config = sourceConfig[source]
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 font-medium rounded-full border
        ${config.className}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
      `}
      title={source === 'both' ? 'Confirmed by both axe-core and Gemini' : `Detected by ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  )
}

// ===========================================
// Confidence Badge
// ===========================================

export interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel
}

const confidenceConfig: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: {
    label: 'High confidence',
    className: 'text-green-600',
  },
  medium: {
    label: 'Medium confidence',
    className: 'text-yellow-600',
  },
  low: {
    label: 'Low confidence',
    className: 'text-gray-500',
  },
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const config = confidenceConfig[confidence]
  
  return (
    <span 
      className={`text-xs ${config.className}`}
      title={config.label}
    >
      {confidence === 'high' && '●●●'}
      {confidence === 'medium' && '●●○'}
      {confidence === 'low' && '●○○'}
    </span>
  )
}

// ===========================================
// Score Badge (overall compliance score)
// ===========================================

export interface ScoreBadgeProps {
  score: number // 0-100
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (s >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    if (s >= 50) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }
  
  const sizeStyles = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  }
  
  return (
    <div 
      className={`
        flex items-center justify-center rounded-full border-2 font-bold
        ${getScoreColor(score)}
        ${sizeStyles[size]}
      `}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Compliance score: ${score}%`}
    >
      {score}%
    </div>
  )
}

export default SeverityBadge
