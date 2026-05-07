-- 👤 LUCAS/JANNIK: Compliance Tables Migration
-- Tables for storing WCAG/EAA compliance scan results

-- Compliance scans table
CREATE TABLE IF NOT EXISTS public.compliance_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scanning', 'completed', 'failed', 'timeout')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    screenshot_url TEXT,
    issue_count INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    serious_count INTEGER DEFAULT 0,
    moderate_count INTEGER DEFAULT 0,
    minor_count INTEGER DEFAULT 0,
    progress_message TEXT,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Compliance issues table
CREATE TABLE IF NOT EXISTS public.compliance_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.compliance_scans(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
    wcag_criterion TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    recommendation TEXT,
    source TEXT DEFAULT 'gemini' CHECK (source IN ('axe-core', 'gemini', 'both')),
    confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
    element_html TEXT,
    screenshot_region JSONB,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_scans_user_id ON public.compliance_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_scans_status ON public.compliance_scans(status);
CREATE INDEX IF NOT EXISTS idx_compliance_scans_created_at ON public.compliance_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_issues_scan_id ON public.compliance_issues(scan_id);
CREATE INDEX IF NOT EXISTS idx_compliance_issues_severity ON public.compliance_issues(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_issues_is_resolved ON public.compliance_issues(is_resolved);

-- Enable RLS
ALTER TABLE public.compliance_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_issues ENABLE ROW LEVEL SECURITY;

-- Compliance scans policies
CREATE POLICY "Users can view own scans"
    ON public.compliance_scans FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create scans"
    ON public.compliance_scans FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own scans"
    ON public.compliance_scans FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own scans"
    ON public.compliance_scans FOR DELETE
    USING (auth.uid() = user_id);

-- Compliance issues policies (users can view/modify issues for their scans)
CREATE POLICY "Users can view issues for own scans"
    ON public.compliance_issues FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.compliance_scans
            WHERE compliance_scans.id = compliance_issues.scan_id
            AND (compliance_scans.user_id = auth.uid() OR compliance_scans.user_id IS NULL)
        )
    );

CREATE POLICY "System can insert issues"
    ON public.compliance_issues FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update issues for own scans"
    ON public.compliance_issues FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.compliance_scans
            WHERE compliance_scans.id = compliance_issues.scan_id
            AND (compliance_scans.user_id = auth.uid() OR compliance_scans.user_id IS NULL)
        )
    );

-- Service role bypass for backend operations
-- The backend uses the service role key, which bypasses RLS
-- This allows background tasks to update scan status and insert issues
