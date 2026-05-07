#!/usr/bin/env bash
# Extension für Chrome vorbereiten - Keys aus Secret-Dateien einfügen

set -e
cd "$(dirname "$0")"

echo "Ghost-UI Extension wird vorbereitet..."

# API Keys aus Dateien laden und in chatbot.js einfügen
OPENAI_KEY_FILE="../openai-secret.txt"
ELEVENLABS_KEY_FILE="../elevenlabs-secret.txt"
CHATBOT_FILE="content/chatbot.js"

# OpenAI Key einfügen
if [ -f "$OPENAI_KEY_FILE" ]; then
  OPENAI_KEY=$(cat "$OPENAI_KEY_FILE" | tr -d '\n\r')
  if [ -n "$OPENAI_KEY" ]; then
    ESCAPED_KEY=$(echo "$OPENAI_KEY" | sed 's/[&/\]/\\&/g')
    sed -i '' "s/const OPENAI_DEFAULT_KEY = '';/const OPENAI_DEFAULT_KEY = '$ESCAPED_KEY';/" "$CHATBOT_FILE"
    echo "✓ OpenAI Key eingefügt"
  fi
else
  echo "⚠ openai-secret.txt nicht gefunden"
fi

# ElevenLabs Key einfügen
if [ -f "$ELEVENLABS_KEY_FILE" ]; then
  ELEVENLABS_KEY=$(cat "$ELEVENLABS_KEY_FILE" | tr -d '\n\r')
  if [ -n "$ELEVENLABS_KEY" ]; then
    ESCAPED_KEY=$(echo "$ELEVENLABS_KEY" | sed 's/[&/\]/\\&/g')
    sed -i '' "s/const ELEVENLABS_API_KEY = '';/const ELEVENLABS_API_KEY = '$ESCAPED_KEY';/" "$CHATBOT_FILE"
    echo "✓ ElevenLabs Key eingefügt"
  fi
else
  echo "⚠ elevenlabs-secret.txt nicht gefunden"
fi

# ============================================
# [SUPABASE INTEGRATION - ADDITIVE]
# Supabase URL und Anon Key einfügen
# ============================================
SUPABASE_FILE="lib/supabase-service.js"
SUPABASE_SECRET_FILE="../supabase-secret.txt"

if [ -f "$SUPABASE_SECRET_FILE" ]; then
  # Format: Line 1 = URL, Line 2 = ANON_KEY
  SUPABASE_URL=$(sed -n '1p' "$SUPABASE_SECRET_FILE" | tr -d '\n\r')
  SUPABASE_ANON_KEY=$(sed -n '2p' "$SUPABASE_SECRET_FILE" | tr -d '\n\r')
  
  if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
    ESCAPED_URL=$(echo "$SUPABASE_URL" | sed 's/[&/\]/\\&/g')
    ESCAPED_KEY=$(echo "$SUPABASE_ANON_KEY" | sed 's/[&/\]/\\&/g')
    
    sed -i '' "s|url: 'YOUR_SUPABASE_URL'|url: '$ESCAPED_URL'|" "$SUPABASE_FILE"
    sed -i '' "s|anonKey: 'YOUR_SUPABASE_ANON_KEY'|anonKey: '$ESCAPED_KEY'|" "$SUPABASE_FILE"
    echo "✓ Supabase URL und Key eingefügt"
  else
    echo "⚠ supabase-secret.txt unvollständig (benötigt URL auf Zeile 1, Key auf Zeile 2)"
  fi
else
  echo "⚠ supabase-secret.txt nicht gefunden (optional - Extension funktioniert auch ohne Supabase)"
fi
# ============================================
# [END SUPABASE INTEGRATION]
# ============================================

ABSOLUTE=$(pwd)
echo ""
echo "Fertig! In Chrome:"
echo "  1. chrome://extensions öffnen"
echo "  2. Entwicklermodus aktivieren"
echo "  3. „Entpackte Erweiterung laden“ → folgenden Ordner wählen:"
echo ""
echo "   $ABSOLUTE"
echo ""
echo "⚠ WICHTIG: Die Keys sind jetzt in chatbot.js - NICHT committen!"
echo "   Um die Keys zu entfernen: git checkout content/chatbot.js"
echo ""

# Ordner im Finder öffnen (macOS)
if command -v open >/dev/null 2>&1; then
  open "$ABSOLUTE"
  echo "Extension-Ordner wurde im Finder geöffnet."
fi
