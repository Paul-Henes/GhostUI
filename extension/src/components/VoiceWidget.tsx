// Ghost-UI Voice Widget – Glass UI, Voice States, optional Chat Panel

import { createElement, useCallback, useEffect, useRef, useState } from "react"

import type { ChatMessage, VoiceState } from "~lib/types"

import "~styles/widget.css"

const WIDGET_SCRIPT_URL =
  process.env.PLASMO_PUBLIC_ELEVENLABS_WIDGET_URL ||
  "https://unpkg.com/@elevenlabs/convai-widget-embed"

const VOICE_STATE_LABELS: Record<VoiceState, string> = {
  idle: "Bereit",
  listening: "Höre zu",
  thinking: "Denke nach",
  speaking: "Spricht",
}

interface VoiceWidgetProps {
  /** When set, show ElevenLabs Conversational Agent embed; otherwise show Chat + TTS panel */
  agentId: string | null
  isExpanded: boolean
  onToggle: () => void
  voiceState?: VoiceState
  /** Chat mode: messages and send handler (when no agentId) */
  chatMessages?: ChatMessage[]
  onSendMessage?: (text: string) => void
  chatDisabled?: boolean
  onFocusIn?: () => void
  onFocusOut?: () => void
}

export function VoiceWidget({
  agentId,
  isExpanded,
  onToggle,
  voiceState = "idle",
  chatMessages = [],
  onSendMessage,
  chatDisabled = false,
  onFocusIn,
  onFocusOut,
}: VoiceWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [chatInput, setChatInput] = useState("")

  useEffect(() => {
    if (typeof document === "undefined" || !agentId) return

    const existing = document.querySelector(
      `script[src="${WIDGET_SCRIPT_URL}"]`
    )
    if (existing) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = WIDGET_SCRIPT_URL
    script.async = true
    script.type = "text/javascript"
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      console.warn("[Ghost-UI] ElevenLabs widget script failed to load")
    }
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [agentId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const showStateBar = isExpanded || voiceState !== "idle"
  const showConvai = Boolean(agentId && scriptLoaded)
  const showChatPanel = !agentId && onSendMessage

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const text = chatInput.trim()
      if (!text || chatDisabled || !onSendMessage) return
      onSendMessage(text)
      setChatInput("")
      inputRef.current?.focus()
    },
    [chatInput, chatDisabled, onSendMessage]
  )

  return (
    <div
      ref={containerRef}
      className="ghost-ui-voice-widget"
      role="complementary"
      aria-label="Ghost-UI Voice Assistant"
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic
        className="sr-only"
      >
        {isExpanded ? "Voice Assistant geöffnet" : "Voice Assistant geschlossen"}
        {showStateBar && ` – ${VOICE_STATE_LABELS[voiceState]}`}
      </div>

      {/* Voice state bar */}
      <div
        className={`ghost-ui-voice-state ${showStateBar ? "ghost-ui-voice-state--visible" : ""}`}
        data-state={voiceState}
        aria-live="polite"
      >
        <span className="ghost-ui-voice-state-dot" aria-hidden />
        {VOICE_STATE_LABELS[voiceState]}
      </div>

      <button
        type="button"
        onClick={onToggle}
        onFocus={onFocusIn}
        onBlur={onFocusOut}
        className="ghost-ui-voice-toggle"
        aria-expanded={isExpanded}
        aria-controls="ghost-ui-voice-panel"
        aria-label={
          isExpanded ? "Voice Assistant ausblenden" : "Voice Assistant einblenden"
        }
        title={isExpanded ? "Schließen" : "Öffnen"}
      >
        <span className="ghost-ui-voice-toggle-icon" aria-hidden>
          {isExpanded ? "✕" : "🎙"}
        </span>
      </button>

      <div
        id="ghost-ui-voice-panel"
        className={`ghost-ui-voice-panel ${isExpanded ? "ghost-ui-voice-panel--open" : ""}`}
        aria-hidden={!isExpanded}
        tabIndex={-1}
      >
        {showConvai &&
          createElement("elevenlabs-convai", { "agent-id": agentId! })}

        {showChatPanel && (
          <div className="ghost-ui-chat-inner">
            <div className="ghost-ui-chat-messages">
              {chatMessages.length === 0 && (
                <p
                  className="ghost-ui-chat-message ghost-ui-chat-message--assistant"
                  style={{ alignSelf: "center", opacity: 0.8 }}
                >
                  Stelle eine Frage zur aktuellen Seite. Der Assistent antwortet
                  auf Basis des Seiteninhalts.
                </p>
              )}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ghost-ui-chat-message ghost-ui-chat-message--${msg.role}`}
                >
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form
              className="ghost-ui-chat-input-wrap"
              onSubmit={handleSubmit}
              aria-label="Nachricht eingeben"
            >
              <textarea
                ref={inputRef}
                className="ghost-ui-chat-input"
                placeholder="Frage zur Seite stellen…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                rows={2}
                disabled={chatDisabled}
                aria-label="Chat-Eingabe"
              />
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
