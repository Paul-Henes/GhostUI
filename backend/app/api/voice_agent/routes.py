# Voice Agent API – init (ElevenLabs Agent optional), status, chat with website context

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

router = APIRouter(prefix="/api/voice-agent", tags=["voice-agent"])


# --- Request/Response models ---


class WebsiteContext(BaseModel):
    url: str = ""
    title: str = ""
    content: str = ""
    headings: list[str] = []
    links: list[str] = []
    navSnippet: Optional[str] = None
    footerSnippet: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class InitRequest(BaseModel):
    websiteData: WebsiteContext


class InitResponse(BaseModel):
    agentId: str
    status: str


class ChatRequest(BaseModel):
    websiteContext: WebsiteContext
    message: str
    history: list[dict[str, str]] = []


class ChatResponse(BaseModel):
    text: str


# --- Endpoints ---


@router.post("/init", response_model=InitResponse)
async def voice_agent_init(body: InitRequest) -> InitResponse:
    """
    Initialize Voice Agent with website content.
    When ElevenLabs Conversational Agent is configured, returns agentId.
    Otherwise returns empty agentId so extension uses Chat + TTS mode.
    """
    # Stub: no ElevenLabs agent creation yet → extension uses chat panel + TTS
    return InitResponse(agentId="", status="chat_mode")


@router.get("/status")
async def voice_agent_status(
    domain: str = Query(..., description="Hostname to check"),
) -> dict[str, Optional[str]]:
    """Check if an agent is available for the given domain."""
    return {"agentId": None, "status": None}


@router.post("/chat", response_model=ChatResponse)
async def voice_agent_chat(body: ChatRequest) -> ChatResponse:
    """
    Assistant chat: answer only from website context (website-spezifischer Assistant).
    Backend should use LLM with strict context from websiteContext; no generic chatbot.
    """
    ctx = body.websiteContext
    msg = body.message.strip()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message is required",
        )

    # Fallback: reply from context only (no LLM). Replace with OpenAI/Gemini + context.
    parts = []
    if ctx.title:
        parts.append(f"Seitentitel: {ctx.title}.")
    if ctx.metadata and ctx.metadata.get("description"):
        parts.append(f"Beschreibung: {ctx.metadata['description']}")
    if ctx.headings:
        parts.append("Überschriften: " + ", ".join(ctx.headings[:10]))
    if ctx.content:
        excerpt = ctx.content[:600].strip()
        if len(ctx.content) > 600:
            excerpt += "…"
        parts.append(f"Inhalt (Auszug): {excerpt}")
    if not parts:
        text = "Auf dieser Seite sind keine lesbaren Inhalte erkannt worden. Bitte stelle eine konkrete Frage oder wechsle die Seite."
    else:
        text = "Auf Basis der aktuellen Seite: " + " ".join(parts) + " Wenn du mehr wissen möchtest, nenne die gewünschte Information."
    return ChatResponse(text=text)
