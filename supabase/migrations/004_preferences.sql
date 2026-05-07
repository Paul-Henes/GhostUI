-- 👤 JANNIK: User Preferences Migration
-- Used for Extension <-> Dashboard sync

-- User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_hostname TEXT NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{
        "highContrast": false,
        "fontSize": 16,
        "dyslexiaFont": false,
        "focusMode": false,
        "reducedMotion": false,
        "customCSS": ""
    }',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, site_hostname)
);

-- Global preferences (applies to all sites if no site-specific preference)
CREATE TABLE IF NOT EXISTS public.global_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{
        "highContrast": false,
        "fontSize": 16,
        "dyslexiaFont": false,
        "focusMode": false,
        "reducedMotion": false,
        "customCSS": ""
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_hostname ON public.user_preferences(site_hostname);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_preferences ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
    ON public.user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- Global preferences policies
CREATE POLICY "Users can view own global preferences"
    ON public.global_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own global preferences"
    ON public.global_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own global preferences"
    ON public.global_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Updated_at triggers
CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER global_preferences_updated_at
    BEFORE UPDATE ON public.global_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
