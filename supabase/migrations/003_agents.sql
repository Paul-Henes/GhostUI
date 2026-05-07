-- 👤 JANNIK: Agents Tables Migration

-- Agent run status enum
CREATE TYPE agent_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Agent types enum
CREATE TYPE agent_type AS ENUM ('auditor', 'fixer', 'analyzer', 'personalizer');

-- Agent runs table
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_type agent_type NOT NULL,
    status agent_status DEFAULT 'pending',
    input JSONB NOT NULL DEFAULT '{}',
    output JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON public.agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_type ON public.agent_runs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs(created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- Agent runs policies
CREATE POLICY "Users can view own agent runs"
    ON public.agent_runs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agent runs"
    ON public.agent_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent runs"
    ON public.agent_runs FOR UPDATE
    USING (auth.uid() = user_id);
