# Compliance Tables Schema Proposal

**Proposed by:** Lucas  
**For implementation by:** Jannik  
**Date:** 2026-01-31

---

## Overview

Two new tables needed for the Compliance Scanner feature to persist scan results instead of using in-memory storage.

---

## Table 1: `compliance_scans`

Stores scan results and metadata.

```sql
CREATE TABLE compliance_scans (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    user_id UUID REFERENCES auth.users(id),
    site_id UUID REFERENCES sites(id),  -- Links to existing sites table
    
    -- Scan target
    url TEXT NOT NULL,
    domain TEXT,  -- Extracted for analytics grouping (e.g., "example.com")
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, scanning, completed, failed, timeout
    
    -- Results
    score INTEGER,  -- 0-100 accessibility score
    screenshot_url TEXT,  -- Supabase Storage URL
    
    -- Issue counts
    issue_count INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    serious_count INTEGER DEFAULT 0,
    moderate_count INTEGER DEFAULT 0,
    minor_count INTEGER DEFAULT 0,
    
    -- Metadata
    scan_duration_ms INTEGER,  -- Performance tracking
    source TEXT DEFAULT 'dashboard',  -- dashboard, extension, api, n8n
    error_message TEXT,  -- If status = failed
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_compliance_scans_user_id ON compliance_scans(user_id);
CREATE INDEX idx_compliance_scans_domain ON compliance_scans(domain);
CREATE INDEX idx_compliance_scans_status ON compliance_scans(status);
CREATE INDEX idx_compliance_scans_created_at ON compliance_scans(created_at DESC);
```

---

## Table 2: `compliance_issues`

Stores individual WCAG violations found in scans.

```sql
CREATE TABLE compliance_issues (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent scan
    scan_id UUID REFERENCES compliance_scans(id) ON DELETE CASCADE,
    
    -- Issue details
    severity TEXT NOT NULL,  -- critical, serious, moderate, minor
    wcag_criterion TEXT NOT NULL,  -- e.g., "1.1.1", "1.4.3"
    wcag_level TEXT,  -- A, AA, AAA
    description TEXT NOT NULL,
    location TEXT,  -- CSS selector or element description
    element_type TEXT,  -- img, button, link, form, input, etc.
    recommendation TEXT NOT NULL,  -- How to fix
    
    -- Source and confidence
    source TEXT NOT NULL,  -- gemini, axe-core, both
    confidence TEXT NOT NULL,  -- high, medium, low
    
    -- Optional details
    element_html TEXT,  -- Raw HTML of problematic element
    
    -- Resolution tracking
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_compliance_issues_scan_id ON compliance_issues(scan_id);
CREATE INDEX idx_compliance_issues_severity ON compliance_issues(severity);
CREATE INDEX idx_compliance_issues_wcag ON compliance_issues(wcag_criterion);
```

---

## Row Level Security

```sql
-- Enable RLS
ALTER TABLE compliance_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_issues ENABLE ROW LEVEL SECURITY;

-- Policies for compliance_scans
CREATE POLICY "Users can view own scans" ON compliance_scans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" ON compliance_scans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans" ON compliance_scans
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for compliance_issues
CREATE POLICY "Users can view issues from own scans" ON compliance_issues
    FOR SELECT USING (
        scan_id IN (SELECT id FROM compliance_scans WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert issues for own scans" ON compliance_issues
    FOR INSERT WITH CHECK (
        scan_id IN (SELECT id FROM compliance_scans WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update issues for own scans" ON compliance_issues
    FOR UPDATE USING (
        scan_id IN (SELECT id FROM compliance_scans WHERE user_id = auth.uid())
    );
```

---

## Migration File

Save as: `supabase/migrations/005_compliance.sql`

```sql
-- Migration: Add compliance scanner tables
-- Author: Jannik (from Lucas's proposal)
-- Date: 2026-01-31

-- Table: compliance_scans
CREATE TABLE IF NOT EXISTS compliance_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    site_id UUID REFERENCES sites(id),
    url TEXT NOT NULL,
    domain TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    score INTEGER,
    screenshot_url TEXT,
    issue_count INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    serious_count INTEGER DEFAULT 0,
    moderate_count INTEGER DEFAULT 0,
    minor_count INTEGER DEFAULT 0,
    scan_duration_ms INTEGER,
    source TEXT DEFAULT 'dashboard',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Table: compliance_issues
CREATE TABLE IF NOT EXISTS compliance_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES compliance_scans(id) ON DELETE CASCADE,
    severity TEXT NOT NULL,
    wcag_criterion TEXT NOT NULL,
    wcag_level TEXT,
    description TEXT NOT NULL,
    location TEXT,
    element_type TEXT,
    recommendation TEXT NOT NULL,
    source TEXT NOT NULL,
    confidence TEXT NOT NULL,
    element_html TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_scans_user_id ON compliance_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_scans_domain ON compliance_scans(domain);
CREATE INDEX IF NOT EXISTS idx_compliance_scans_status ON compliance_scans(status);
CREATE INDEX IF NOT EXISTS idx_compliance_scans_created_at ON compliance_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_issues_scan_id ON compliance_issues(scan_id);
CREATE INDEX IF NOT EXISTS idx_compliance_issues_severity ON compliance_issues(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_issues_wcag ON compliance_issues(wcag_criterion);

-- RLS
ALTER TABLE compliance_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans" ON compliance_scans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" ON compliance_scans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans" ON compliance_scans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view issues from own scans" ON compliance_issues
    FOR SELECT USING (
        scan_id IN (SELECT id FROM compliance_scans WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert issues for own scans" ON compliance_issues
    FOR INSERT WITH CHECK (
        scan_id IN (SELECT id FROM compliance_scans WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update issues for own scans" ON compliance_issues
    FOR UPDATE USING (
        scan_id IN (SELECT id FROM compliance_scans WHERE user_id = auth.uid())
    );
```

---

## Notes for Jannik

1. **site_id is optional** - Scans can exist without being linked to a tracked site
2. **domain is denormalized** - Extracted from URL for faster analytics queries
3. **ON DELETE CASCADE** - Issues are deleted when scan is deleted
4. **RLS policies** - Users can only see their own data

---

## After Implementation

Once Jannik creates these tables, Lucas will update:
- `backend/app/api/compliance/routes.py` - Replace in-memory storage with Supabase calls
