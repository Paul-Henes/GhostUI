// Voice Agent Content Script – Chat + Voice, Website-Kontext, optional ElevenLabs Agent

import type { PlasmoCSConfig } from "plasmo"
import { useCallback, useEffect, useRef, useState } from "react"

import { VoiceWidget } from "~components/VoiceWidget"
import { scrapeWebsite } from "~lib/scraper"
import {
  getCachedAgentId,
  getVoiceAgentSettings,
  setCachedAgentId,
} from "~lib/storage"
import type { ChatMessage, VoiceState } from "~lib/types"
import { assistantChat, initVoiceAgent } from "~lib/voice-agent-api"

import "~styles/widget.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function VoiceAgentContent() {
  const [agentId, setAgentId] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [useAgent, setUseAgent] = useState(true)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  const initAgent = useCallback(async () => {
    const settings = await getVoiceAgentSettings()
    const hostname = window.location.hostname

    setUseAgent(settings.useConversationalAgent)

    if (!settings.enabled || settings.excludedDomains.includes(hostname)) {
      setLoading(false)
      setIsActive(false)
      return
    }

    setIsActive(true)

    if (!settings.useConversationalAgent) {
      setAgentId(null)
      setError(null)
      setLoading(false)
      return
    }

    const cached = await getCachedAgentId(hostname)
    if (cached) {
      setAgentId(cached)
      setLoading(false)
      return
    }

    const websiteData = scrapeWebsite()
    if (!websiteData) {
      setAgentId(null)
      setError(null)
      setLoading(false)
      return
    }

    try {
      const { agentId: id } = await initVoiceAgent({ websiteData })
      setAgentId(id || null)
      if (id) await setCachedAgentId(hostname, id)
      setError(null)
    } catch (err) {
      setAgentId(null)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initAgent()
  }, [initAgent])

  // Context bei Seitenwechsel: bei SPA URL-Änderung neu initialisieren
  useEffect(() => {
    const url = window.location.href
    const onNav = () => {
      if (window.location.href !== url) initAgent()
    }
    window.addEventListener("popstate", onNav)
    window.addEventListener("hashchange", onNav)
    return () => {
      window.removeEventListener("popstate", onNav)
      window.removeEventListener("hashchange", onNav)
    }
  }, [initAgent])

  const playTTS = useCallback(
    (text: string, voiceId: string, onEnd: () => void) => {
      chrome.runtime
        .sendMessage({ type: "TTS_REQUEST", text, voiceId })
        .then((res: { type: string; audio?: ArrayBuffer; error?: string }) => {
          if (res.type === "TTS_ERROR") {
            setVoiceState("idle")
            onEnd()
            return
          }
          if (res.type !== "TTS_RESPONSE" || !res.audio) {
            setVoiceState("idle")
            onEnd()
            return
          }
          const blob = new Blob([res.audio], { type: "audio/mpeg" })
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          currentAudioRef.current = audio
          audio.onended = () => {
            URL.revokeObjectURL(url)
            currentAudioRef.current = null
            setVoiceState("idle")
            onEnd()
          }
          audio.onerror = () => {
            URL.revokeObjectURL(url)
            setVoiceState("idle")
            onEnd()
          }
          setVoiceState("speaking")
          audio.play().catch(() => {
            setVoiceState("idle")
            onEnd()
          })
        })
        .catch(() => {
          setVoiceState("idle")
          onEnd()
        })
    },
    []
  )

  const handleSendMessage = useCallback(
    async (text: string) => {
      const websiteContext = scrapeWebsite()
      if (!websiteContext) {
        const fallback: ChatMessage = {
          id: generateId(),
          role: "assistant",
          text: "Diese Seite kann nicht ausgewertet werden (z. B. noindex).",
          timestamp: Date.now(),
        }
        setChatMessages((prev) => [...prev, fallback])
        return
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        text,
        timestamp: Date.now(),
      }
      setChatMessages((prev) => [...prev, userMsg])
      setVoiceState("thinking")

      const history = chatMessages.map((m) => ({ role: m.role, text: m.text }))
      let reply: string
      try {
        reply = await assistantChat(websiteContext, text, history)
      } catch (e) {
        reply =
          "Antwort konnte nicht geladen werden. Bitte Einstellungen (API/Backend) prüfen."
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: reply,
        timestamp: Date.now(),
      }
      setChatMessages((prev) => [...prev, assistantMsg])

      const settings = await getVoiceAgentSettings()
      if (settings.elevenLabsApiKey && reply) {
        playTTS(reply, settings.defaultVoiceId, () => {})
      } else {
        setVoiceState("idle")
      }
    },
    [chatMessages, playTTS]
  )

  useEffect(() => {
    const handleMessage = (
      msg: { type: string },
      _sender: unknown,
      sendResponse: (response: unknown) => void
    ) => {
      if (msg.type === "VOICE_AGENT_TOGGLE" || msg.type === "VOICE_AGENT_SETTINGS") {
        initAgent().then(() => sendResponse({ ok: true }))
        return true
      }
      if (msg.type === "VOICE_AGENT_TOGGLE_PANEL") {
        if (isActive) {
          window.dispatchEvent(new CustomEvent("ghost-ui-toggle-voice-panel"))
        }
        sendResponse({ ok: true })
        return false
      }
      if (msg.type === "VOICE_AGENT_STATUS") {
        sendResponse({ active: isActive, agentId, loading, error })
        return false
      }
      return false
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [initAgent, isActive, agentId, loading, error])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault()
        if (isActive) setIsExpanded((prev) => !prev)
      }
    }
    const handleToggleEvent = () => setIsExpanded((prev) => !prev)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("ghost-ui-toggle-voice-panel", handleToggleEvent)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("ghost-ui-toggle-voice-panel", handleToggleEvent)
    }
  }, [isActive])

  if (!isActive || loading) {
    return null
  }

  if (error && useAgent) {
    return null
  }

  return (
    <VoiceWidget
      agentId={agentId}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((prev) => !prev)}
      voiceState={voiceState}
      chatMessages={agentId ? undefined : chatMessages}
      onSendMessage={agentId ? undefined : handleSendMessage}
      chatDisabled={voiceState === "thinking" || voiceState === "speaking"}
    />
  )
}

export default VoiceAgentContent