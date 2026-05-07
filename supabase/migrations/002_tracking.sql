-- 👤 JANNIK: Tracking Tables Migration

-- Sites table (websites being tracked)
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hostname TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, hostname)
);

-- Tracking events table
CREATE TABLE IF NOT EXISTS public.tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    session_id TEXT,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    url TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics cache table (pre-aggregated stats)
CREATE TABLE IF NOT EXISTS public.analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- 'day', 'week', 'month'
    period_start TIMESTAMPTZ NOT NULL,
    total_events INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    interactions INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, period, period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_events_site_id ON public.tracking_events(site_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON public.tracking_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON public.tracking_events(type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_session ON public.tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON public.sites(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_site_period ON public.analytics_cache(site_id, period, period_start);

-- Enable RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- Sites policies
CREATE POLICY "Users can view own sites"
    ON public.sites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sites"
    ON public.sites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites"
    ON public.sites FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites"
    ON public.sites FOR DELETE
    USING (auth.uid() = user_id);

-- Tracking events policies (users can view events for their sites)
CREATE POLICY "Users can view events for own sites"
    ON public.tracking_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = tracking_events.site_id
            AND sites.user_id = auth.uid()
        )
    );

-- Allow anonymous inserts for tracking script (validated by site_id)
CREATE POLICY "Anyone can insert tracking events"
    ON public.tracking_events FOR INSERT
    WITH CHECK (true);

-- Analytics cache policies
CREATE POLICY "Users can view analytics for own sites"
    ON public.analytics_cache FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = analytics_cache.site_id
            AND sites.user_id = auth.uid()
        )
    );
