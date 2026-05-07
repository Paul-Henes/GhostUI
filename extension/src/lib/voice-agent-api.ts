// Voice Agent API client - communicates with Ghost-UI backend

import type {
  VoiceAgentInitRequest,
  VoiceAgentInitResponse,
} from "./types"
import type { WebsiteData } from "./scraper"

const API_URL =
  process.env.PLASMO_PUBLIC_API_URL || "https://ghost-ui-backend.replit.app"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Initialize Voice Agent with website content.
 * Backend creates/updates ElevenLabs agent with knowledge base.
 */
export async function initVoiceAgent(
  request: VoiceAgentInitRequest
): Promise<VoiceAgentInitResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_URL}/api/voice-agent/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })

      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Init failed: ${res.status} ${errBody}`)
      }

      const data = (await res.json()) as VoiceAgentInitResponse
      return data
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt)
      }
    }
  }

  throw lastError ?? new Error("Voice agent init failed after retries")
}

/**
 * Check agent status for a domain
 */
export async function getVoiceAgentStatus(domain: string): Promise<{
  agentId?: string
  status?: string
}> {
  try {
    const res = await fetch(
      `${API_URL}/api/voice-agent/status?domain=${encodeURIComponent(domain)}`
    )
    if (!res.ok) return {}
    return (await res.json()) as { agentId?: string; status?: string }
  } catch {
    return {}
  }
}

/**
 * Assistant chat: send user message with website context, get assistant reply.
 * Backend should answer only from website context (website-spezifischer Assistant).
 */
export async function assistantChat(
  websiteContext: WebsiteData,
  message: string,
  history: { role: "user" | "assistant"; text: string }[] = []
): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/voice-agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteContext: {
          url: websiteContext.url,
          title: websiteContext.title,
          content: websiteContext.content,
          headings: websiteContext.headings,
          links: websiteContext.links,
          navSnippet: websiteContext.navSnippet,
          footerSnippet: websiteContext.footerSnippet,
          metadata: websiteContext.metadata,
        },
        message,
        history,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(err || `Chat failed: ${res.status}`)
    }
    const data = (await res.json()) as { text?: string }
    return data.text ?? ""
  } catch {
    return fallbackAssistantReply(websiteContext, message)
  }
}

/** Fallback when backend chat is unavailable: reply from page context only */
function fallbackAssistantReply(ctx: WebsiteData, _message: string): string {
  const parts: string[] = []
  if (ctx.title) parts.push(`Seitentitel: ${ctx.title}.`)
  if (ctx.metadata?.description)
    parts.push(`Beschreibung: ${ctx.metadata.description}`)
  if (ctx.headings?.length)
    parts.push(`Überschriften: ${ctx.headings.slice(0, 10).join(", ")}.`)
  if (ctx.content?.slice(0, 500))
    parts.push(`Inhalt (Auszug): ${ctx.content.slice(0, 500).trim()}…`)
  if (parts.length === 0) return "Auf dieser Seite sind keine lesbaren Inhalte erkannt worden. Bitte stelle eine konkrete Frage oder wechsle die Seite."
  return `Auf Basis der aktuellen Seite: ${parts.join(" ")} Wenn du mehr wissen möchtest, nenne die gewünschte Information.`
}
