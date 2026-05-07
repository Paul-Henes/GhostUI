-- Webhooks table for n8n and automation integrations
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    event TEXT NOT NULL,  -- scan.completed, scan.failed, issue.critical, tracking.event, tracking.preference, *
    site_id UUID,  -- Optional filter by site
    secret TEXT,  -- Optional secret for signature verification
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;

-- Row Level Security
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Users can manage their own webhooks
CREATE POLICY "Users can view own webhooks" ON webhooks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks" ON webhooks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks" ON webhooks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks" ON webhooks
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can do everything (for backend delivery)
CREATE POLICY "Service role full access webhooks" ON webhooks
    FOR ALL USING (true) WITH CHECK (true);
