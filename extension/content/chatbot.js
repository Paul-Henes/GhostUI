/**
 * Ghost UI Chatbot - Main Content Script
 * 
 * A modern, liquid glass styled voice chatbot interface with OpenAI integration.
 * Injects a floating trigger button and expandable chat window
 * into every webpage.
 * 
 * Architecture:
 * - LanguageManager: Handles bilingual (DE/EN) language settings
 * - SpeechController: Handles Web Speech API for voice input
 * - TTSController: Handles ElevenLabs TTS for voice output
 * - WebPageExtractor: Extracts and processes webpage content (external)
 * - OpenAIService: Handles OpenAI API interactions (external)
 * - ChatUI: Manages DOM creation and manipulation
 * - Chatbot: Main orchestrator class
 * 
 * OpenAI Integration:
 * - Extracts current page content for context
 * - Sends user queries with page context to OpenAI
 * - Supports subpage fetching for broader website understanding
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__liquidGlassInitialized) return;
  window.__liquidGlassInitialized = true;

  // ============================================
  // OpenAI Configuration
  // ============================================
  // API key is loaded from Chrome storage or can be set via the UI
  // The key from openai-secret.txt should be stored in Chrome storage
  const OPENAI_DEFAULT_KEY = ''; // Set via Chrome storage or build-for-chrome.sh - DO NOT HARDCODE
  const OPENAI_STORAGE_KEY = 'ghost-ui-openai-key';

  // ============================================
  // ElevenLabs Configuration
  // ============================================
  const ELEVENLABS_API_KEY = ''; // Set via Chrome storage or build-for-chrome.sh - DO NOT HARDCODE
  const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
  
  // Voice IDs for different languages
  const ELEVENLABS_VOICES = {
    'en': 'EXAVITQu4vr4xnSDxMaL', // Bella - clear English voice
    'de': 'onwK4e9ZLuTAKqWW03F9'  // Daniel - German voice
  };
  
  // Model that supports multiple languages
  const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

  // ============================================
  // Language Configuration
  // ============================================
  const SUPPORTED_LANGUAGES = {
    'en': { code: 'en-US', label: 'EN', name: 'English' },
    'de': { code: 'de-DE', label: 'DE', name: 'Deutsch' }
  };

  const STORAGE_KEY = 'liquid-glass-language';
  const STORAGE_KEY_TTS = 'liquid-glass-tts-enabled';
  const STORAGE_KEY_VOICE_DIALOGUE = 'liquid-glass-voice-dialogue-enabled';

  // ============================================
  // Voice Dialogue States
  // ============================================
  const VoiceDialogueState = {
    IDLE: 'idle',
    LISTENING: 'listening',
    THINKING: 'thinking',
    SPEAKING: 'speaking'
  };

  // ============================================
  // SVG Icons Library
  // ============================================
  const Icons = {
    chat: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.18-3.53-.5C5.55 21 2 21 2 21c2.33-2.33 2.7-3.9 2.75-4.5C3.05 15.07 2 13.13 2 11c0-4.42 4.5-8 10-8z"/>
    </svg>`,
    
    close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
    
    plus: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
    
    mic: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18.5v3.5M8 22h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
    
    send: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>`,
    
    bot: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" d="M12 2C7.58 2 4 5.58 4 10v11l2.5-2 2.5 2 3-2 3 2 2.5-2 2.5 2V10c0-4.42-3.58-8-8-8zM8 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 1 1-3 0zM13 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 1 1-3 0z" fill="currentColor"/>
    </svg>`,
    
    wave: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 12c2-2 4-4 6-4s4 2 6 2 4-2 6-2 4 2 6 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
    
    language: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>`,
    
    speaker: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
    
    speakerMuted: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
      <path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
    
    loading: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
    </svg>`,
    
    page: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" fill="none"/>
      <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" fill="none"/>
      <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
      <line x1="10" y1="9" x2="8" y2="9" stroke="currentColor" stroke-width="2"/>
    </svg>`,
    
    settings: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>`,
    
    link: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
    
    check: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <polyline points="20,6 9,17 4,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    
    x: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    
    externalLink: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    
    pages: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="12" height="14" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
      <path d="M4 4h10a1 1 0 0 1 1 1v1H6a2 2 0 0 0-2 2v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
    
    voiceDialogue: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor"/>
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M12 18.5v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="12" cy="22" r="1" fill="currentColor"/>
      <path d="M5.5 5.5L3 3M18.5 5.5L21 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    </svg>`
  };

  // ============================================
  // Language Manager
  // ============================================
  class LanguageManager {
    constructor() {
      this.currentLang = 'en';
      this.onLanguageChange = null;
      this._loadSavedLanguage();
    }

    /**
     * Load saved language from storage
     * Tries Chrome storage first, falls back to localStorage
     */
    _loadSavedLanguage() {
      // Try Chrome storage API (for extensions)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          if (result[STORAGE_KEY] && SUPPORTED_LANGUAGES[result[STORAGE_KEY]]) {
            this.currentLang = result[STORAGE_KEY];
            if (this.onLanguageChange) {
              this.onLanguageChange(this.currentLang);
            }
          }
        });
      } else {
        // Fallback to localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved && SUPPORTED_LANGUAGES[saved]) {
            this.currentLang = saved;
          }
        } catch (e) {
          console.warn('[Liquid Glass] Could not access localStorage:', e);
        }
      }
    }

    /**
     * Save language preference to storage
     */
    _saveLanguage(lang) {
      // Try Chrome storage API first
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [STORAGE_KEY]: lang });
      } else {
        // Fallback to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
          console.warn('[Liquid Glass] Could not save to localStorage:', e);
        }
      }
    }

    /**
     * Get the current language configuration
     */
    getLanguageConfig() {
      return SUPPORTED_LANGUAGES[this.currentLang];
    }

    /**
     * Get the speech recognition language code
     */
    getSpeechLang() {
      return SUPPORTED_LANGUAGES[this.currentLang].code;
    }

    /**
     * Toggle between DE and EN
     */
    toggleLanguage() {
      this.currentLang = this.currentLang === 'en' ? 'de' : 'en';
      this._saveLanguage(this.currentLang);
      
      if (this.onLanguageChange) {
        this.onLanguageChange(this.currentLang);
      }
      
      return this.currentLang;
    }

    /**
     * Set a specific language
     */
    setLanguage(lang) {
      if (SUPPORTED_LANGUAGES[lang]) {
        this.currentLang = lang;
        this._saveLanguage(this.currentLang);
        
        if (this.onLanguageChange) {
          this.onLanguageChange(this.currentLang);
        }
      }
    }

    /**
     * Get all supported languages for UI
     */
    getSupportedLanguages() {
      return SUPPORTED_LANGUAGES;
    }
  }

  // ============================================
  // Speech Recognition Controller
  // ============================================
  class SpeechController {
    constructor(options = {}) {
      this.onTranscript = options.onTranscript || (() => {});
      this.onStateChange = options.onStateChange || (() => {});
      this.onLanguageDetected = options.onLanguageDetected || (() => {});
      this.languageManager = options.languageManager || null;
      this.recognition = null;
      this.isActive = false;
      
      this._initialize();
    }

    _initialize() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('[Liquid Glass] Speech recognition unavailable');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      
      // Set initial language from language manager
      this._updateRecognitionLanguage();

      this.recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const transcript = results.map(r => r[0].transcript).join('');
        const isFinal = results[results.length - 1]?.isFinal ?? false;
        
        // Check for detected language (if available)
        if (isFinal && results.length > 0) {
          const result = results[results.length - 1];
          if (result && result[0] && result[0].lang) {
            this.onLanguageDetected(result[0].lang);
          }
        }
        
        this.onTranscript(transcript, isFinal);
      };

      this.recognition.onend = () => {
        this.isActive = false;
        this.onStateChange(false);
      };

      this.recognition.onerror = (event) => {
        console.warn('[Liquid Glass] Speech error:', event.error);
        this.isActive = false;
        this.onStateChange(false);
      };
    }

    /**
     * Update the recognition language from language manager
     */
    _updateRecognitionLanguage() {
      if (this.recognition && this.languageManager) {
        this.recognition.lang = this.languageManager.getSpeechLang();
      } else if (this.recognition) {
        this.recognition.lang = 'en-US'; // Default fallback
      }
    }

    /**
     * Set the speech recognition language
     */
    setLanguage(langCode) {
      if (this.recognition) {
        this.recognition.lang = langCode;
      }
    }

    /**
     * Update language from language manager (call when language changes)
     */
    updateLanguage() {
      this._updateRecognitionLanguage();
    }

    toggle() {
      if (!this.recognition) {
        alert('Voice input is not supported in this browser. Please use Chrome.');
        return;
      }

      this.isActive ? this.stop() : this.start();
    }

    start() {
      if (!this.recognition || this.isActive) return;
      
      // Ensure we have the latest language setting before starting
      this._updateRecognitionLanguage();
      
      try {
        this.recognition.start();
        this.isActive = true;
        this.onStateChange(true);
      } catch (err) {
        console.warn('[Liquid Glass] Failed to start:', err);
      }
    }

    stop() {
      if (!this.recognition || !this.isActive) return;
      this.recognition.stop();
    }

    isSupported() {
      return this.recognition !== null;
    }
  }

  // ============================================
  // Text-to-Speech Controller (ElevenLabs)
  // ============================================
  class TTSController {
    constructor(options = {}) {
      this.languageManager = options.languageManager || null;
      this.onStateChange = options.onStateChange || (() => {});
      this.onError = options.onError || (() => {});
      
      this.isEnabled = true;
      this.isPlaying = false;
      this.isFetching = false; // Track if we're fetching audio (for interrupt during fetch)
      this.currentAudio = null;
      this.audioQueue = [];
      this.isProcessing = false;
      
      this._loadSettings();
    }

    /**
     * Load TTS enabled state from storage
     * TTS is always enabled by default for voice-first experience
     */
    _loadSettings() {
      // TTS is always enabled by default - user can toggle off if needed
      this.isEnabled = true;
      this.onStateChange(this.isEnabled, this.isPlaying);
    }

    /**
     * Save TTS enabled state to storage
     */
    _saveSettings() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [STORAGE_KEY_TTS]: this.isEnabled });
      } else {
        try {
          localStorage.setItem(STORAGE_KEY_TTS, String(this.isEnabled));
        } catch (e) {
          console.warn('[Liquid Glass] Could not save to localStorage:', e);
        }
      }
    }

    /**
     * Toggle TTS on/off
     */
    toggle() {
      this.isEnabled = !this.isEnabled;
      this._saveSettings();
      
      if (!this.isEnabled) {
        this.stop();
      }
      
      this.onStateChange(this.isEnabled, this.isPlaying);
      console.log('[Liquid Glass] TTS', this.isEnabled ? 'enabled' : 'disabled');
      
      return this.isEnabled;
    }

    /**
     * Set TTS enabled state
     */
    setEnabled(enabled) {
      this.isEnabled = enabled;
      this._saveSettings();
      
      if (!this.isEnabled) {
        this.stop();
      }
      
      this.onStateChange(this.isEnabled, this.isPlaying);
    }

    /**
     * Detect language of text (simple heuristic)
     * Returns 'de' for German, 'en' for English
     */
    _detectLanguage(text) {
      // Common German words and patterns
      const germanIndicators = [
        /\b(und|oder|aber|nicht|ist|sind|haben|werden|können|müssen|sollen|wollen|ich|du|er|sie|es|wir|ihr|Sie|der|die|das|ein|eine|einer|eines|einem|einen|für|mit|von|zu|auf|in|an|bei|nach|vor|über|unter|zwischen|durch|gegen|ohne|um|aus|seit|während|wegen|trotz|nächste|letzte|erste|zweite|dritte|vierte|fünfte|heute|morgen|gestern|jetzt|dann|hier|dort|wo|wie|was|wer|warum|wann|ja|nein|vielleicht|natürlich|eigentlich|tatsächlich|übrigens|außerdem|deshalb|deswegen|trotzdem|jedoch|dennoch|obwohl|falls|sofern|bevor|nachdem|sobald|solange|damit|sodass|indem)\b/gi,
        /[äöüß]/i,
        /\b(sch|ch|ck|tz|ß)\b/i
      ];
      
      let germanScore = 0;
      for (const indicator of germanIndicators) {
        const matches = text.match(indicator);
        if (matches) {
          germanScore += matches.length;
        }
      }
      
      // If significant German indicators found, assume German
      // Threshold is relative to text length
      const threshold = Math.max(1, text.split(/\s+/).length * 0.15);
      
      return germanScore >= threshold ? 'de' : 'en';
    }

    /**
     * Get the appropriate voice ID for the detected language
     */
    _getVoiceId(lang) {
      return ELEVENLABS_VOICES[lang] || ELEVENLABS_VOICES['en'];
    }

    /**
     * Convert text to speech using ElevenLabs API
     */
    async speak(text) {
      if (!this.isEnabled || !text || text.trim().length === 0) {
        return;
      }

      // Add to queue
      this.audioQueue.push(text);
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        await this._processQueue();
      }
    }

    /**
     * Process the audio queue
     */
    async _processQueue() {
      if (this.isProcessing || this.audioQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      while (this.audioQueue.length > 0) {
        const text = this.audioQueue.shift();
        await this._speakText(text);
      }

      this.isProcessing = false;
    }

    /**
     * Internal method to speak a single text
     * Enhanced: Better state tracking for fast interrupt
     */
    async _speakText(text) {
      if (!this.isEnabled) {
        return;
      }

      // Detect language and get appropriate voice
      const detectedLang = this._detectLanguage(text);
      const voiceId = this._getVoiceId(detectedLang);
      
      console.log('[Liquid Glass] TTS speaking in', detectedLang, ':', text.substring(0, 50) + '...');

      // Mark as playing BEFORE fetch to enable early interrupt
      this.isPlaying = true;
      this.isFetching = true;
      this.onStateChange(this.isEnabled, this.isPlaying);

      try {
        const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: text,
            model_id: ELEVENLABS_MODEL,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true
            }
          })
        });

        // Check if we were interrupted during fetch
        if (!this.isPlaying) {
          console.log('[Liquid Glass] TTS interrupted during fetch');
          return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        
        // Check again if we were interrupted
        if (!this.isPlaying) {
          console.log('[Liquid Glass] TTS interrupted before playback');
          return;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        this.isFetching = false;
        
        await this._playAudio(audioUrl);
        
        // Clean up
        URL.revokeObjectURL(audioUrl);
        
      } catch (error) {
        // Don't log error if we were just interrupted
        if (this.isPlaying) {
          console.error('[Liquid Glass] TTS error:', error);
          this.onError(error);
        }
      } finally {
        this.isFetching = false;
        this.isPlaying = false;
        this.onStateChange(this.isEnabled, this.isPlaying);
      }
    }

    /**
     * Play audio from URL
     * Enhanced: Immediate stop support
     */
    _playAudio(audioUrl) {
      return new Promise((resolve, reject) => {
        // Check if already interrupted
        if (!this.isPlaying) {
          resolve();
          return;
        }
        
        this.currentAudio = new Audio(audioUrl);
        
        this.currentAudio.onended = () => {
          this.currentAudio = null;
          resolve();
        };
        
        this.currentAudio.onerror = (error) => {
          this.currentAudio = null;
          // Don't reject if we stopped intentionally
          if (this.isPlaying) {
            reject(error);
          } else {
            resolve();
          }
        };
        
        this.currentAudio.play().catch((err) => {
          // Don't reject if we stopped intentionally
          if (this.isPlaying) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    /**
     * Stop current audio playback immediately
     * Enhanced: Faster stop with immediate state update
     */
    stop() {
      // IMMEDIATE: Update state first for fast feedback
      const wasPlaying = this.isPlaying;
      this.isPlaying = false;
      this.isProcessing = false;
      this.isFetching = false;
      
      // Clear queue
      this.audioQueue = [];
      
      // Stop current audio immediately
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        } catch (e) {
          // Ignore errors when stopping
        }
        this.currentAudio = null;
      }
      
      // Notify state change only if we were actually playing
      if (wasPlaying) {
        this.onStateChange(this.isEnabled, this.isPlaying);
        console.log('[Liquid Glass] TTS stopped immediately');
      }
    }

    /**
     * Check if TTS is currently enabled
     */
    getIsEnabled() {
      return this.isEnabled;
    }

    /**
     * Check if audio is currently playing
     */
    getIsPlaying() {
      return this.isPlaying;
    }
  }

  // ============================================
  // Audio Level Monitor
  // Uses Web Audio API to detect user speech via microphone volume
  // This is ONLY for fast interrupt detection, NOT for transcription
  // Works independently of SpeechRecognition events
  // ============================================
  class AudioLevelMonitor {
    constructor(options = {}) {
      this.onSpeechActivityDetected = options.onSpeechActivityDetected || (() => {});
      this.onError = options.onError || (() => {});
      
      // Audio context and nodes
      this.audioContext = null;
      this.analyser = null;
      this.mediaStream = null;
      this.sourceNode = null;
      
      // Monitoring state
      this.isMonitoring = false;
      this.monitoringInterval = null;
      
      // Configuration for speech detection
      this.config = {
        // RMS threshold for detecting speech (0-1 scale, normalized)
        // Lower = more sensitive, Higher = less sensitive
        volumeThreshold: 0.015,
        
        // Duration (ms) audio must exceed threshold to trigger detection
        sustainedDurationMs: 100,
        
        // How often to sample audio levels (ms)
        sampleIntervalMs: 30,
        
        // FFT size for analyser (affects frequency resolution)
        fftSize: 256,
        
        // Cooldown after detection before another can trigger (ms)
        detectionCooldownMs: 500
      };
      
      // Detection state
      this.aboveThresholdStartTime = null;
      this.lastDetectionTime = 0;
      this.consecutiveHighSamples = 0;
      this.requiredConsecutiveSamples = Math.ceil(
        this.config.sustainedDurationMs / this.config.sampleIntervalMs
      );
    }

    /**
     * Initialize the audio context and get microphone access
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
      if (this.audioContext) {
        console.log('[AudioLevelMonitor] Already initialized');
        return true;
      }

      try {
        // Request microphone access
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        // Create analyser node
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.config.fftSize;
        this.analyser.smoothingTimeConstant = 0.3;

        // Connect microphone to analyser
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.sourceNode.connect(this.analyser);

        // Note: We intentionally don't connect to destination
        // This prevents echo/feedback issues

        console.log('[AudioLevelMonitor] Initialized successfully');
        return true;

      } catch (error) {
        console.error('[AudioLevelMonitor] Initialization failed:', error);
        this.onError(error);
        return false;
      }
    }

    /**
     * Start monitoring audio levels
     * Should be called when the system needs to detect user interrupts
     */
    start() {
      if (this.isMonitoring) {
        console.log('[AudioLevelMonitor] Already monitoring');
        return;
      }

      if (!this.audioContext || !this.analyser) {
        console.warn('[AudioLevelMonitor] Not initialized, cannot start');
        return;
      }

      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.isMonitoring = true;
      this.consecutiveHighSamples = 0;
      this.aboveThresholdStartTime = null;

      // Start the monitoring loop
      this.monitoringInterval = setInterval(() => {
        this._checkAudioLevel();
      }, this.config.sampleIntervalMs);

      console.log('[AudioLevelMonitor] Started monitoring');
    }

    /**
     * Stop monitoring audio levels
     * Should be called when interrupt detection is not needed
     */
    stop() {
      if (!this.isMonitoring) {
        return;
      }

      this.isMonitoring = false;

      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      this.consecutiveHighSamples = 0;
      this.aboveThresholdStartTime = null;

      console.log('[AudioLevelMonitor] Stopped monitoring');
    }

    /**
     * Check current audio level and detect speech activity
     * Called periodically by the monitoring interval
     * @private
     */
    _checkAudioLevel() {
      if (!this.analyser || !this.isMonitoring) {
        return;
      }

      // Get audio data
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS (Root Mean Square) for volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        // Convert from 0-255 to -1 to 1
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Check if above threshold
      if (rms > this.config.volumeThreshold) {
        this.consecutiveHighSamples++;

        // Track when we first went above threshold
        if (!this.aboveThresholdStartTime) {
          this.aboveThresholdStartTime = Date.now();
        }

        // Check if sustained for required duration
        if (this.consecutiveHighSamples >= this.requiredConsecutiveSamples) {
          this._triggerSpeechDetection(rms);
        }
      } else {
        // Reset counters when volume drops
        this.consecutiveHighSamples = 0;
        this.aboveThresholdStartTime = null;
      }
    }

    /**
     * Trigger speech activity detection callback
     * Includes cooldown to prevent rapid-fire detections
     * @private
     * @param {number} rms - Current RMS level
     */
    _triggerSpeechDetection(rms) {
      const now = Date.now();

      // Check cooldown
      if (now - this.lastDetectionTime < this.config.detectionCooldownMs) {
        return;
      }

      this.lastDetectionTime = now;
      
      // Reset counters after detection
      this.consecutiveHighSamples = 0;
      this.aboveThresholdStartTime = null;

      console.log('[AudioLevelMonitor] Speech activity detected, RMS:', rms.toFixed(4));
      this.onSpeechActivityDetected(rms);
    }

    /**
     * Update configuration
     * @param {Object} newConfig - Partial config to merge
     */
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      this.requiredConsecutiveSamples = Math.ceil(
        this.config.sustainedDurationMs / this.config.sampleIntervalMs
      );
    }

    /**
     * Clean up all audio resources
     * Should be called when voice dialogue mode is completely disabled
     */
    destroy() {
      console.log('[AudioLevelMonitor] Destroying...');
      
      // Stop monitoring
      this.stop();

      // Disconnect nodes
      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        this.sourceNode = null;
      }

      // Close audio context
      if (this.audioContext) {
        try {
          this.audioContext.close();
        } catch (e) {
          // Ignore close errors
        }
        this.audioContext = null;
      }

      // Stop media stream tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => {
          track.stop();
        });
        this.mediaStream = null;
      }

      this.analyser = null;
      console.log('[AudioLevelMonitor] Destroyed');
    }

    /**
     * Check if the monitor is initialized
     * @returns {boolean}
     */
    isInitialized() {
      return this.audioContext !== null && this.analyser !== null;
    }

    /**
     * Check if currently monitoring
     * @returns {boolean}
     */
    getIsMonitoring() {
      return this.isMonitoring;
    }

    /**
     * Get current audio level (for debugging/visualization)
     * @returns {number} Current RMS level (0-1)
     */
    getCurrentLevel() {
      if (!this.analyser || !this.isMonitoring) {
        return 0;
      }

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      return Math.sqrt(sum / bufferLength);
    }
  }

  // ============================================
  // Voice Dialogue Controller
  // Manages continuous voice conversation loop
  // 
  // Enhanced with:
  // - Optimistic Listening Model: System is logically always listening
  // - Dynamic Silence Threshold: Adapts based on utterance length
  // - Fast Interrupt: User speech immediately stops TTS
  // - Overlapping Preparation: Listening prepared during TTS
  // - Audio-Level-Based Interrupt Detection: Works during TTS playback
  // ============================================

  class VoiceDialogueController {
    constructor(options = {}) {
      this.onStateChange = options.onStateChange || (() => {});
      this.onTranscriptReady = options.onTranscriptReady || (() => {});
      this.onError = options.onError || (() => {});
      this.languageManager = options.languageManager || null;
      this.ttsController = options.ttsController || null;
      
      // State management
      this.state = VoiceDialogueState.IDLE;
      this.isActive = false;
      this.isEnabled = false;
      
      // Speech recognition for continuous mode
      this.recognition = null;
      this.recognitionSupported = false;
      
      // Transcript accumulation
      this.currentTranscript = '';
      this.finalTranscript = '';
      
      // ============================================
      // Dynamic Silence Detection (Enhanced)
      // ============================================
      this.silenceTimer = null;
      this.lastSpeechTime = 0;
      this.hasFinalTranscript = false; // Track if we've received final transcript
      
      // Dynamic silence threshold configuration
      this.silenceConfig = {
        minThreshold: 600,    // Minimum silence for short utterances (ms)
        maxThreshold: 1500,   // Maximum silence for long utterances (ms)
        shortUtteranceWords: 3, // Words considered "short"
        longUtteranceWords: 15  // Words considered "long"
      };
      
      // ============================================
      // Audio Level Monitor (for reliable interrupt detection)
      // Uses Web Audio API to detect user speech independently
      // of SpeechRecognition events (which are unreliable during TTS)
      // ============================================
      this.audioLevelMonitor = null;
      this.audioLevelMonitorInitialized = false;
      
      // ============================================
      // Optimistic Listening (Enhanced)
      // ============================================
      // Recognition is "prepared" during SPEAKING for fast restart
      this.isPreparedForListening = false;
      this.pendingRestart = false;
      this.speechDetectedDuringSpeaking = false;
      
      // Audio activity detection (for interrupt during TTS)
      this.audioActivityDetected = false;
      this.lastAudioActivityTime = 0;
      
      // ============================================
      // Auto-restart control
      // ============================================
      this.shouldRestart = false;
      this.restartAttempts = 0;
      this.maxRestartAttempts = 3;
      
      // Fast restart delay (minimal delay for responsiveness)
      this.fastRestartDelay = 50; // ms
      
      this._initialize();
    }

    /**
     * Initialize speech recognition for continuous mode
     */
    _initialize() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('[Voice Dialogue] Speech recognition not supported');
        this.recognitionSupported = false;
        return;
      }

      this.recognitionSupported = true;
      this._createRecognition();
      
      // Create audio level monitor (initialization happens on activate)
      this._createAudioLevelMonitor();
    }

    /**
     * Create the audio level monitor for interrupt detection
     * The monitor uses Web Audio API to detect user speech independently
     * of SpeechRecognition events, which are unreliable during TTS playback
     */
    _createAudioLevelMonitor() {
      this.audioLevelMonitor = new AudioLevelMonitor({
        onSpeechActivityDetected: (rms) => {
          this._handleAudioLevelInterrupt(rms);
        },
        onError: (error) => {
          console.warn('[Voice Dialogue] AudioLevelMonitor error:', error);
          // Don't propagate error - audio monitor is enhancement, not critical
        }
      });
    }

    /**
     * Initialize the audio level monitor (async - requires getUserMedia)
     * Called during activation to request microphone access
     * @returns {Promise<boolean>} Success status
     */
    async _initializeAudioLevelMonitor() {
      if (!this.audioLevelMonitor) {
        this._createAudioLevelMonitor();
      }
      
      if (this.audioLevelMonitorInitialized) {
        return true;
      }
      
      const success = await this.audioLevelMonitor.initialize();
      this.audioLevelMonitorInitialized = success;
      
      if (success) {
        console.log('[Voice Dialogue] AudioLevelMonitor initialized');
      } else {
        console.warn('[Voice Dialogue] AudioLevelMonitor initialization failed');
      }
      
      return success;
    }

    /**
     * Handle interrupt detected by audio level monitor
     * This is the PRIMARY interrupt detection during SPEAKING state
     * because SpeechRecognition events are unreliable during TTS playback
     * @param {number} rms - The detected RMS level
     */
    _handleAudioLevelInterrupt(rms) {
      console.log('[Voice Dialogue] Audio-level interrupt detected, RMS:', rms.toFixed(4), 'State:', this.state);
      
      // Only trigger interrupt if we're in a state where interruption makes sense
      if (this.state === VoiceDialogueState.SPEAKING || this.state === VoiceDialogueState.THINKING) {
        // IMMEDIATE PRIORITY: User speech always takes priority
        // 1. Stop TTS immediately
        if (this.ttsController) {
          this.ttsController.stop();
        }
        
        // 2. Track that speech was detected
        this.speechDetectedDuringSpeaking = true;
        this.audioActivityDetected = true;
        this.lastAudioActivityTime = Date.now();
        
        // 3. Transition to LISTENING
        this._setState(VoiceDialogueState.LISTENING);
        
        // 4. Stop audio level monitoring (we're now in LISTENING mode)
        if (this.audioLevelMonitor) {
          this.audioLevelMonitor.stop();
        }
        
        // 5. Start/restart SpeechRecognition for transcription
        // This is now safe because TTS has stopped
        this._ensureRecognitionRunning();
        
        console.log('[Voice Dialogue] Audio-level interrupt complete - now LISTENING');
      }
    }

    /**
     * Ensure speech recognition is running
     * Used after audio-level interrupt to start transcription
     */
    _ensureRecognitionRunning() {
      if (!this.recognition) {
        this._createRecognition();
      }
      
      // Try to start recognition
      try {
        // Check if already running - if so, don't restart
        // The recognition will pick up the ongoing speech
        this.recognition.start();
        this.shouldRestart = true;
        this.restartAttempts = 0;
      } catch (err) {
        if (err.name === 'InvalidStateError') {
          // Already running - this is fine
          console.log('[Voice Dialogue] Recognition already running');
        } else {
          console.error('[Voice Dialogue] Failed to start recognition after interrupt:', err);
        }
      }
    }

    /**
     * Start audio level monitoring for interrupt detection
     * Should be called when entering SPEAKING or THINKING state
     */
    _startAudioLevelMonitoring() {
      if (this.audioLevelMonitor && this.audioLevelMonitorInitialized) {
        this.audioLevelMonitor.start();
        console.log('[Voice Dialogue] Audio level monitoring started');
      }
    }

    /**
     * Stop audio level monitoring
     * Should be called when leaving SPEAKING/THINKING or entering IDLE
     */
    _stopAudioLevelMonitoring() {
      if (this.audioLevelMonitor) {
        this.audioLevelMonitor.stop();
      }
    }

    /**
     * Create a new speech recognition instance
     */
    _createRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // Keep listening
      this.recognition.interimResults = true;
      
      // Set language from manager
      if (this.languageManager) {
        this.recognition.lang = this.languageManager.getSpeechLang();
      } else {
        this.recognition.lang = 'en-US';
      }

      // Handle results
      this.recognition.onresult = (event) => {
        this._handleRecognitionResult(event);
      };

      // Handle end - auto-restart if active
      this.recognition.onend = () => {
        this._handleRecognitionEnd();
      };

      // Handle errors
      this.recognition.onerror = (event) => {
        this._handleRecognitionError(event);
      };

      // Handle speech start
      this.recognition.onspeechstart = () => {
        this._handleSpeechStart();
      };

      // Handle speech end
      this.recognition.onspeechend = () => {
        this._handleSpeechEnd();
      };
    }

    /**
     * Handle recognition results
     * Enhanced with optimistic listening and fast interrupt
     */
    _handleRecognitionResult(event) {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update current transcript
      this.currentTranscript = this.finalTranscript + finalTranscript + interimTranscript;
      
      // Track audio activity for interrupt detection
      this.audioActivityDetected = true;
      this.lastAudioActivityTime = Date.now();
      
      // If we got final results, accumulate them
      if (finalTranscript) {
        this.finalTranscript += finalTranscript;
        this.lastSpeechTime = Date.now();
        this.hasFinalTranscript = true;
        
        // Start dynamic silence detection ONLY after final transcript
        this._startDynamicSilenceDetection();
      }

      // If we're getting any results, the user is speaking
      if (interimTranscript || finalTranscript) {
        this.lastSpeechTime = Date.now();
        
        // FAST INTERRUPT: If speaking, immediately stop TTS
        // This is the core of the optimistic listening model
        if (this.state === VoiceDialogueState.SPEAKING) {
          this._fastInterruptSpeaking();
        }
        
        // Ensure we're in listening state
        if (this.state !== VoiceDialogueState.LISTENING) {
          this._setState(VoiceDialogueState.LISTENING);
        }
        
        // Reset silence timer on new speech
        if (this.hasFinalTranscript) {
          this._resetSilenceTimer();
        }
      }
    }

    /**
     * Handle recognition end
     * Enhanced: Faster restart with minimal delay
     */
    _handleRecognitionEnd() {
      console.log('[Voice Dialogue] Recognition ended, shouldRestart:', this.shouldRestart);
      
      // If we should restart and we're still active
      if (this.shouldRestart && this.isActive) {
        this.restartAttempts++;
        
        if (this.restartAttempts < this.maxRestartAttempts) {
          // FAST RESTART: Minimal delay for responsiveness
          setTimeout(() => {
            if (this.isActive && this.shouldRestart) {
              this._startRecognition();
            }
          }, this.fastRestartDelay);
        } else {
          console.warn('[Voice Dialogue] Max restart attempts reached');
          this.restartAttempts = 0;
          // Try creating a fresh recognition instance
          this._createRecognition();
          setTimeout(() => {
            if (this.isActive) {
              this._startRecognition();
            }
          }, 200); // Reduced from 500ms for faster recovery
        }
      }
    }

    /**
     * Handle recognition errors
     */
    _handleRecognitionError(event) {
      console.warn('[Voice Dialogue] Recognition error:', event.error);
      
      // Handle specific errors
      switch (event.error) {
        case 'no-speech':
          // No speech detected - this is normal, just restart
          if (this.isActive) {
            this.restartAttempts = 0; // Don't count this as a failure
          }
          break;
        case 'audio-capture':
          this.onError(new Error('Microphone not available'));
          this.deactivate();
          break;
        case 'not-allowed':
          this.onError(new Error('Microphone permission denied'));
          this.deactivate();
          break;
        case 'network':
          // Network error - try to recover
          if (this.isActive && this.restartAttempts < this.maxRestartAttempts) {
            setTimeout(() => this._startRecognition(), 1000);
          }
          break;
        case 'aborted':
          // Recognition was aborted - this is expected when we stop manually
          break;
        default:
          // Unknown error
          console.error('[Voice Dialogue] Unknown error:', event.error);
      }
    }

    /**
     * Handle speech start event
     * Enhanced: Fast interrupt during speaking
     */
    _handleSpeechStart() {
      console.log('[Voice Dialogue] Speech started');
      this.lastSpeechTime = Date.now();
      this.audioActivityDetected = true;
      
      // FAST INTERRUPT: If speaking, immediately stop TTS
      if (this.state === VoiceDialogueState.SPEAKING) {
        this._fastInterruptSpeaking();
      }
      
      // Transition to listening immediately
      if (this.state !== VoiceDialogueState.LISTENING) {
        this._setState(VoiceDialogueState.LISTENING);
      }
    }

    /**
     * Handle speech end event
     * Only start silence detection after final transcript
     */
    _handleSpeechEnd() {
      console.log('[Voice Dialogue] Speech ended');
      
      // Only start silence detection if we have final transcript content
      // This prevents premature processing on interim results
      if (this.hasFinalTranscript && this.currentTranscript.trim()) {
        this._startDynamicSilenceDetection();
      }
    }

    /**
     * Fast interrupt speaking and switch to listening
     * Optimized for minimal latency - user always has priority
     * Used by both SpeechRecognition events and audio-level detection
     */
    _fastInterruptSpeaking() {
      console.log('[Voice Dialogue] Fast interrupt - user speech detected');
      
      // IMMEDIATE: Stop TTS without any delay
      if (this.ttsController) {
        this.ttsController.stop();
      }
      
      // Stop audio level monitoring (we're transitioning to LISTENING
      // where SpeechRecognition handles the input)
      this._stopAudioLevelMonitoring();
      
      // Track that speech was detected during speaking
      this.speechDetectedDuringSpeaking = true;
      
      // Transition to listening immediately
      this._setState(VoiceDialogueState.LISTENING);
    }

    /**
     * Legacy interrupt method (kept for compatibility)
     */
    _interruptSpeaking() {
      this._fastInterruptSpeaking();
    }

    /**
     * Calculate dynamic silence threshold based on utterance length
     * Short utterances = shorter wait, Long utterances = longer wait
     * @returns {number} Silence threshold in ms
     */
    _calculateDynamicSilenceThreshold() {
      const transcript = this.currentTranscript.trim();
      if (!transcript) return this.silenceConfig.minThreshold;
      
      const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length;
      const { minThreshold, maxThreshold, shortUtteranceWords, longUtteranceWords } = this.silenceConfig;
      
      if (wordCount <= shortUtteranceWords) {
        // Short utterance: use minimum threshold (600-800ms)
        return minThreshold;
      } else if (wordCount >= longUtteranceWords) {
        // Long utterance: use maximum threshold (up to 1500ms)
        return maxThreshold;
      } else {
        // Interpolate between min and max based on word count
        const ratio = (wordCount - shortUtteranceWords) / (longUtteranceWords - shortUtteranceWords);
        return Math.round(minThreshold + ratio * (maxThreshold - minThreshold));
      }
    }

    /**
     * Start dynamic silence detection
     * Only called after receiving a final transcript
     */
    _startDynamicSilenceDetection() {
      this._clearSilenceTimer();
      
      const dynamicThreshold = this._calculateDynamicSilenceThreshold();
      console.log('[Voice Dialogue] Dynamic silence threshold:', dynamicThreshold, 'ms for', 
        this.currentTranscript.split(/\s+/).filter(w => w.length > 0).length, 'words');
      
      this.silenceTimer = setTimeout(() => {
        this._checkSilence(dynamicThreshold);
      }, dynamicThreshold);
    }

    /**
     * Start silence detection timer (legacy/fallback)
     */
    _startSilenceDetection() {
      this._startDynamicSilenceDetection();
    }

    /**
     * Reset silence detection timer
     */
    _resetSilenceTimer() {
      this._clearSilenceTimer();
      if (this.hasFinalTranscript) {
        this._startDynamicSilenceDetection();
      }
    }

    /**
     * Clear silence detection timer
     */
    _clearSilenceTimer() {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    }

    /**
     * Check if silence threshold has been reached
     * Enhanced with guard against empty speech
     * @param {number} threshold - The dynamic threshold used
     */
    _checkSilence(threshold) {
      const dynamicThreshold = threshold || this._calculateDynamicSilenceThreshold();
      const timeSinceLastSpeech = Date.now() - this.lastSpeechTime;
      const transcript = this.currentTranscript.trim();
      
      // Guard: Don't process if no meaningful speech was captured
      if (!transcript || transcript.length < 2) {
        console.log('[Voice Dialogue] No meaningful speech captured, continuing to listen');
        this.hasFinalTranscript = false;
        return;
      }
      
      if (timeSinceLastSpeech >= dynamicThreshold) {
        console.log('[Voice Dialogue] Silence detected after', timeSinceLastSpeech, 'ms, processing transcript');
        this._processCompletedUtterance();
      }
    }

    /**
     * Process completed utterance
     * Enhanced with early feedback - UI transitions IMMEDIATELY
     */
    _processCompletedUtterance() {
      const transcript = this.currentTranscript.trim();
      
      // Guard: Don't process empty or very short transcripts
      if (!transcript || transcript.length < 2) {
        console.log('[Voice Dialogue] Skipping empty/short transcript');
        this.hasFinalTranscript = false;
        return;
      }

      console.log('[Voice Dialogue] Completed utterance:', transcript);
      
      // EARLY FEEDBACK: Transition to THINKING immediately
      // This provides instant visual feedback to the user
      this._setState(VoiceDialogueState.THINKING);
      
      // Clear transcripts for next round
      const completedTranscript = transcript;
      this.currentTranscript = '';
      this.finalTranscript = '';
      this.hasFinalTranscript = false;
      this.speechDetectedDuringSpeaking = false;
      
      // Stop recognition during processing (will restart after TTS)
      this.shouldRestart = false;
      this._stopRecognition();
      
      // Prepare for fast restart after processing
      this.isPreparedForListening = true;
      
      // Notify callback with the transcript
      // This triggers OpenAI processing
      this.onTranscriptReady(completedTranscript);
    }

    /**
     * Set state and notify
     */
    _setState(newState) {
      if (this.state !== newState) {
        const oldState = this.state;
        this.state = newState;
        console.log('[Voice Dialogue] State:', oldState, '->', newState);
        
        // Manage audio level monitoring based on state
        // Audio monitoring should be active during SPEAKING and THINKING
        // for reliable interrupt detection
        this._updateAudioMonitoringForState(newState, oldState);
        
        this.onStateChange(newState, oldState);
      }
    }

    /**
     * Update audio level monitoring based on state transitions
     * Monitoring is active during SPEAKING/THINKING for interrupt detection
     * Monitoring is paused during LISTENING (SpeechRecognition handles it)
     * Monitoring is disabled during IDLE
     * @param {string} newState - The new state
     * @param {string} oldState - The previous state
     */
    _updateAudioMonitoringForState(newState, oldState) {
      // States where audio monitoring should be active
      const monitoringStates = [VoiceDialogueState.SPEAKING, VoiceDialogueState.THINKING];
      
      const shouldMonitor = monitoringStates.includes(newState);
      const wasMonitoring = monitoringStates.includes(oldState);
      
      if (shouldMonitor && !wasMonitoring) {
        // Entering a state where we need audio monitoring
        if (this.audioLevelMonitorInitialized) {
          this._startAudioLevelMonitoring();
        }
      } else if (!shouldMonitor && wasMonitoring) {
        // Leaving a state where audio monitoring was active
        this._stopAudioLevelMonitoring();
      }
      
      // Special case: When entering IDLE, ensure everything is stopped
      if (newState === VoiceDialogueState.IDLE) {
        this._stopAudioLevelMonitoring();
      }
    }

    /**
     * Start recognition
     */
    _startRecognition() {
      if (!this.recognition) {
        this._createRecognition();
      }

      try {
        // Update language before starting
        if (this.languageManager) {
          this.recognition.lang = this.languageManager.getSpeechLang();
        }
        
        this.recognition.start();
        this.shouldRestart = true;
        this.restartAttempts = 0;
        console.log('[Voice Dialogue] Recognition started');
      } catch (err) {
        if (err.name === 'InvalidStateError') {
          // Recognition already started, try to abort and restart
          try {
            this.recognition.abort();
            setTimeout(() => this._startRecognition(), 100);
          } catch (e) {
            console.error('[Voice Dialogue] Failed to restart recognition:', e);
          }
        } else {
          console.error('[Voice Dialogue] Failed to start recognition:', err);
          this.onError(err);
        }
      }
    }

    /**
     * Stop recognition
     */
    _stopRecognition() {
      this.shouldRestart = false;
      
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (err) {
          // Ignore errors when stopping
        }
      }
    }

    /**
     * Activate voice dialogue mode
     * Enhanced: Reset all optimistic listening state
     */
    async activate() {
      if (!this.recognitionSupported) {
        this.onError(new Error('Speech recognition not supported in this browser'));
        return false;
      }

      if (this.isActive) {
        return true;
      }

      console.log('[Voice Dialogue] Activating with optimistic listening + audio-level interrupt');
      this.isActive = true;
      
      // Reset transcript state
      this.currentTranscript = '';
      this.finalTranscript = '';
      this.hasFinalTranscript = false;
      
      // Reset restart state
      this.restartAttempts = 0;
      
      // Reset optimistic listening state
      this.isPreparedForListening = false;
      this.pendingRestart = false;
      this.speechDetectedDuringSpeaking = false;
      this.audioActivityDetected = false;
      this.lastAudioActivityTime = 0;
      
      // Initialize audio level monitor for interrupt detection
      // This runs async but doesn't block activation
      this._initializeAudioLevelMonitor().then(success => {
        if (success) {
          console.log('[Voice Dialogue] Audio-level interrupt detection ready');
        }
      });
      
      // Start listening immediately
      this._setState(VoiceDialogueState.LISTENING);
      this._startRecognition();
      
      return true;
    }

    /**
     * Deactivate voice dialogue mode
     * Enhanced: Clean up all optimistic listening state and audio resources
     */
    deactivate() {
      if (!this.isActive) {
        return;
      }

      console.log('[Voice Dialogue] Deactivating');
      this.isActive = false;
      this.shouldRestart = false;
      
      // Stop recognition
      this._stopRecognition();
      
      // Stop and clean up audio level monitor
      this._stopAudioLevelMonitoring();
      if (this.audioLevelMonitor) {
        this.audioLevelMonitor.destroy();
        this.audioLevelMonitor = null;
        this.audioLevelMonitorInitialized = false;
      }
      
      // Clear timers
      this._clearSilenceTimer();
      
      // Clear transcripts
      this.currentTranscript = '';
      this.finalTranscript = '';
      this.hasFinalTranscript = false;
      
      // Reset optimistic listening state
      this.isPreparedForListening = false;
      this.pendingRestart = false;
      this.speechDetectedDuringSpeaking = false;
      this.audioActivityDetected = false;
      
      // Set state to idle
      this._setState(VoiceDialogueState.IDLE);
    }

    /**
     * Toggle voice dialogue mode
     */
    toggle() {
      if (this.isActive) {
        this.deactivate();
      } else {
        this.activate();
      }
      return this.isActive;
    }

    /**
     * Called when TTS starts speaking
     * Transition to speaking state with audio-level interrupt monitoring
     * Enhanced: Uses AudioLevelMonitor for reliable interrupt detection
     */
    onSpeakingStart() {
      if (this.isActive) {
        this._setState(VoiceDialogueState.SPEAKING);
        
        // OPTIMISTIC LISTENING: Prepare recognition for fast restart
        // Don't start recognition yet (browser limitation), but prepare state
        this.isPreparedForListening = true;
        this.audioActivityDetected = false;
        this.speechDetectedDuringSpeaking = false;
        
        // Pre-create recognition instance if needed for faster restart
        if (!this.recognition) {
          this._createRecognition();
        }
        
        // START AUDIO LEVEL MONITORING for reliable interrupt detection
        // This is critical because SpeechRecognition events are unreliable
        // during TTS playback
        this._startAudioLevelMonitoring();
        
        console.log('[Voice Dialogue] Speaking started, audio-level interrupt monitoring active');
      }
    }

    /**
     * Called when TTS finishes speaking
     * Fast transition back to listening with minimal delay
     * Enhanced: Properly stops audio level monitoring
     */
    onSpeakingEnd() {
      if (this.isActive) {
        // Stop audio level monitoring (no longer needed, we're returning to normal listening)
        this._stopAudioLevelMonitoring();
        
        // FAST RESTART: Minimal delay to return to listening
        // Recognition was prepared during speaking
        this._setState(VoiceDialogueState.LISTENING);
        
        // Start recognition with minimal delay
        setTimeout(() => {
          if (this.isActive && this.state === VoiceDialogueState.LISTENING) {
            this._startRecognition();
            console.log('[Voice Dialogue] Fast restart - now listening');
          }
        }, this.fastRestartDelay);
        
        // Reset preparation state
        this.isPreparedForListening = false;
      }
    }

    /**
     * Called when processing is complete and ready to speak
     * Called by chatbot after OpenAI response is received
     * Enhanced: Prepares listening while TTS plays
     */
    onProcessingComplete() {
      // State will transition to SPEAKING when TTS starts
      // This is handled by onSpeakingStart
      // Pre-prepare recognition for overlapping preparation
      if (this.isActive && !this.recognition) {
        this._createRecognition();
      }
      
      // Start audio level monitoring for interrupt detection during THINKING->SPEAKING
      // This catches the case where user interrupts before TTS fully starts
      if (this.isActive && this.audioLevelMonitorInitialized) {
        this._startAudioLevelMonitoring();
      }
    }
    
    /**
     * Prepare listening without starting recognition
     * Used for overlapping preparation during TTS
     */
    _prepareListening() {
      if (!this.recognition) {
        this._createRecognition();
      }
      this.isPreparedForListening = true;
      console.log('[Voice Dialogue] Listening prepared for fast start');
    }

    /**
     * Update language (call when language changes)
     */
    updateLanguage() {
      if (this.recognition && this.languageManager) {
        this.recognition.lang = this.languageManager.getSpeechLang();
      }
    }

    /**
     * Check if voice dialogue is supported
     */
    isSupported() {
      return this.recognitionSupported;
    }

    /**
     * Check if voice dialogue is currently active
     */
    getIsActive() {
      return this.isActive;
    }

    /**
     * Get current state
     */
    getState() {
      return this.state;
    }

    /**
     * Get current transcript (for display purposes)
     */
    getCurrentTranscript() {
      return this.currentTranscript;
    }
  }

  // ============================================
  // Subpage Manager - Controlled Access with User Approval
  // Now with Sitemap-Based Discovery (Token-Efficient)
  // Sitemap data is NEVER sent to OpenAI - only used locally
  // ============================================
  class SubpageManager {
    constructor(options = {}) {
      this.onSuggestionReady = options.onSuggestionReady || (() => {});
      this.onSubpagesLoaded = options.onSubpagesLoaded || (() => {});
      this.onError = options.onError || (() => {});
      
      this.maxSubpages = 3;
      this.approvedSubpages = []; // URLs approved by user
      this.loadedSubpages = []; // Fetched and parsed subpage data
      this.pendingSuggestions = []; // Links waiting for user approval
      this.isLoading = false;
      
      // Sitemap-based discovery (token-efficient)
      this.sitemapUrls = []; // URLs from sitemap (local only, never sent to OpenAI)
      this.sitemapLoaded = false;
      this.sitemapLoading = false;
      
      // Validated URL pool - only validated URLs can be used for navigation/suggestions
      this.validatedUrls = new Map(); // URL -> { url, text, category, ... }
      this.validationInProgress = false;
    }

    /**
     * Initialize sitemap discovery (non-blocking)
     * Fetches and caches sitemap URLs for better subpage suggestions
     * IMPORTANT: Sitemap data is used locally only, never sent to OpenAI
     * IMPORTANT: All sitemap URLs are validated before use
     * CRITICAL FIX: Now waits for ongoing loading to complete instead of returning early
     */
    async initSitemapDiscovery() {
      // If already loaded, return immediately
      if (this.sitemapLoaded) {
        console.log('[Ghost UI] Sitemap already loaded, skipping');
        return;
      }
      
      // CRITICAL FIX: Wait for ongoing loading to complete instead of returning
      // This prevents race conditions where decideAction() gets empty URL pool
      if (this.sitemapLoading) {
        console.log('[Ghost UI] Sitemap loading in progress, waiting...');
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!this.sitemapLoading) {
              clearInterval(checkInterval);
              console.log('[Ghost UI] Sitemap loading completed (waited)');
              resolve();
            }
          }, 50);
        });
        return;
      }
      
      if (typeof SitemapDiscovery === 'undefined') {
        console.log('[Ghost UI] SitemapDiscovery not available');
        return;
      }

      this.sitemapLoading = true;
      console.log('[Ghost UI] Starting sitemap discovery...');
      
      try {
        const rawUrls = await SitemapDiscovery.getUrlsWithMetadata();
        console.log('[Ghost UI] Sitemap discovery found:', rawUrls.length, 'URLs');
        
        // Validate sitemap URLs before use
        this.sitemapUrls = await this._validateAndCacheUrls(rawUrls);
        this.sitemapLoaded = true;
        console.log('[Ghost UI] Sitemap validation complete:', this.sitemapUrls.length, 'validated URLs');
      } catch (error) {
        console.log('[Ghost UI] Sitemap discovery failed (falling back to direct links):', error.message);
        this.sitemapUrls = [];
        this.sitemapLoaded = true; // Mark as loaded even on failure to prevent infinite retries
      } finally {
        this.sitemapLoading = false;
      }
    }
    
    /**
     * Validate URLs and add them to the validated pool
     * Only validated URLs can be used for navigation and suggestions
     * 
     * @param {Array<Object>} urlItems - URL items with metadata
     * @returns {Promise<Array<Object>>} Validated URL items
     */
    async _validateAndCacheUrls(urlItems) {
      if (typeof URLValidator === 'undefined') {
        console.warn('[Ghost UI] URLValidator not available, skipping validation');
        return urlItems;
      }
      
      if (this.validationInProgress) {
        console.log('[Ghost UI] Validation already in progress, waiting...');
        // Wait for existing validation to complete
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!this.validationInProgress) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
      
      this.validationInProgress = true;
      
      try {
        // Filter to validated URLs only
        const validatedItems = await URLValidator.filterValidUrls(urlItems, {
          urlKey: 'url',
          maxItems: 30, // Limit to prevent too many requests
          preserveOrder: true
        });
        
        // Cache validated URLs in our pool
        validatedItems.forEach(item => {
          const normalizedUrl = this._normalizeUrl(item.url);
          this.validatedUrls.set(normalizedUrl, item);
        });
        
        console.log('[Ghost UI] Cached', this.validatedUrls.size, 'validated URLs');
        return validatedItems;
        
      } catch (error) {
        console.error('[Ghost UI] URL validation failed:', error);
        return [];
      } finally {
        this.validationInProgress = false;
      }
    }
    
    /**
     * Check if a URL is in the validated pool
     * 
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    isUrlValidated(url) {
      const normalizedUrl = this._normalizeUrl(url);
      
      // Check our local cache first
      if (this.validatedUrls.has(normalizedUrl)) {
        return true;
      }
      
      // Also check URLValidator's cache
      if (typeof URLValidator !== 'undefined') {
        return URLValidator.isValidated(url);
      }
      
      return false;
    }
    
    /**
     * Validate a single URL and add to pool if valid
     * 
     * @param {string} url - URL to validate
     * @returns {Promise<boolean>} Whether URL is valid
     */
    async validateSingleUrl(url) {
      if (typeof URLValidator === 'undefined') {
        console.warn('[Ghost UI] URLValidator not available');
        return false;
      }
      
      const result = await URLValidator.validateUrl(url);
      
      if (result.valid) {
        const normalizedUrl = this._normalizeUrl(result.finalUrl || url);
        if (!this.validatedUrls.has(normalizedUrl)) {
          this.validatedUrls.set(normalizedUrl, {
            url: result.finalUrl || url,
            text: this._getPageNameFromUrl(result.finalUrl || url),
            isValidated: true
          });
        }
      }
      
      return result.valid;
    }

    /**
     * Extract and rank relevant same-origin links from current page
     * Combines direct page links with sitemap-discovered URLs
     * IMPORTANT: Sitemap URLs are used for local ranking only, never sent to OpenAI
     * IMPORTANT: Only validated URLs are returned to prevent 404 errors
     * 
     * @param {Object} pageContext - Current page data from WebPageExtractor
     * @returns {Array} Ranked list of suggested subpages (validated only)
     */
    extractRelevantLinks(pageContext) {
      if (!pageContext || !pageContext.links) {
        return [];
      }

      const currentOrigin = new URL(pageContext.url).origin;
      const currentPath = new URL(pageContext.url).pathname;
      const seenUrls = new Set();
      const combinedLinks = [];

      // Filter same-origin links from current page
      const sameOriginLinks = pageContext.links.filter(link => {
        try {
          const linkUrl = new URL(link.url);
          return linkUrl.origin === currentOrigin && 
                 linkUrl.pathname !== currentPath &&
                 !link.url.includes('#') &&
                 !this.approvedSubpages.includes(link.url);
        } catch {
          return false;
        }
      });

      // Add page links first (they have real link text)
      // Only include if validated OR if from sitemap (sitemap URLs are pre-validated)
      sameOriginLinks.forEach(link => {
        const normalizedUrl = this._normalizeUrl(link.url);
        if (!seenUrls.has(normalizedUrl)) {
          // Check if this URL is in our validated pool
          const isValidated = this.validatedUrls.has(normalizedUrl) || this.isUrlValidated(link.url);
          
          seenUrls.add(normalizedUrl);
          combinedLinks.push({
            ...link,
            isFromPage: true,
            isFromSitemap: false,
            isValidated: isValidated,
            // Mark for async validation if not yet validated
            needsValidation: !isValidated
          });
        }
      });

      // Add sitemap URLs that aren't already in page links
      // These are pre-validated during sitemap discovery
      if (this.sitemapUrls && this.sitemapUrls.length > 0) {
        this.sitemapUrls.forEach(sitemapLink => {
          const normalizedUrl = this._normalizeUrl(sitemapLink.url);
          if (!seenUrls.has(normalizedUrl) && 
              !this.approvedSubpages.includes(sitemapLink.url)) {
            seenUrls.add(normalizedUrl);
            combinedLinks.push({
              url: sitemapLink.url,
              text: sitemapLink.text || this._getPageNameFromUrl(sitemapLink.url),
              isSameOrigin: true,
              category: sitemapLink.category || 'other',
              isFromPage: false,
              isFromSitemap: true,
              isValidated: true, // Sitemap URLs are pre-validated
              pathDepth: sitemapLink.pathDepth || 1
            });
          }
        });
      }

      // Score and rank combined links by relevance
      const scoredLinks = combinedLinks.map(link => {
        let score = 0;
        const text = (link.text || '').toLowerCase();
        const url = link.url.toLowerCase();

        // High priority keywords (navigation, important pages)
        const highPriorityKeywords = [
          'about', 'pricing', 'features', 'faq', 'help', 'documentation',
          'docs', 'guide', 'tutorial', 'overview', 'introduction',
          'services', 'products', 'solutions', 'contact', 'support'
        ];

        // Medium priority keywords
        const mediumPriorityKeywords = [
          'blog', 'news', 'resources', 'learn', 'how', 'what', 'why',
          'getting-started', 'quick-start', 'api', 'reference'
        ];

        // Check text and URL for keywords
        highPriorityKeywords.forEach(kw => {
          if (text.includes(kw)) score += 10;
          if (url.includes(kw)) score += 5;
        });

        mediumPriorityKeywords.forEach(kw => {
          if (text.includes(kw)) score += 5;
          if (url.includes(kw)) score += 3;
        });

        // Category-based scoring
        const categoryScores = {
          'home': 8,
          'about': 12,
          'pricing': 12,
          'features': 12,
          'help': 10,
          'docs': 10,
          'contact': 8,
          'products': 10,
          'navigation': 6,
          'content': 4,
          'blog': 3,
          'legal': 1
        };
        score += categoryScores[link.category] || 2;

        // Prefer shorter paths (usually more important pages)
        const pathDepth = link.pathDepth || (link.url.match(/\//g) || []).length - 2;
        score += Math.max(0, 6 - pathDepth);

        // Prefer links with meaningful text
        if (text.length > 3 && text.length < 50) {
          score += 3;
        }

        // Slight preference for page-visible links (user can see them)
        if (link.isFromPage) {
          score += 2;
        }

        // Boost sitemap-only URLs slightly if they're high-value pages
        // (They're confirmed to exist and be indexable)
        if (link.isFromSitemap && !link.isFromPage) {
          const isHighValue = ['about', 'pricing', 'features', 'docs', 'help'].some(kw => url.includes(kw));
          if (isHighValue) score += 3;
        }
        
        // Strongly boost validated URLs (they are guaranteed to work)
        if (link.isValidated) {
          score += 15;
        }

        return { ...link, score };
      });

      // Sort by score and return top suggestions
      // CRITICAL: Filter to only validated URLs to prevent 404 errors
      return scoredLinks
        .filter(link => link.score > 0 && link.isValidated === true)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.maxSubpages + 2); // Extra options in case user skips some
    }
    
    /**
     * Extract relevant links with async validation
     * This version validates page links before returning
     * Use when you need guaranteed valid URLs
     * 
     * @param {Object} pageContext - Current page data from WebPageExtractor
     * @returns {Promise<Array>} Ranked list of validated subpages
     */
    async extractRelevantLinksWithValidation(pageContext) {
      if (!pageContext || !pageContext.links) {
        return [];
      }
      
      // Get initial links (may include unvalidated page links)
      const allLinks = this.extractRelevantLinks(pageContext);
      
      // Separate validated and unvalidated links
      const validated = allLinks.filter(l => l.isValidated);
      const needsValidation = allLinks.filter(l => !l.isValidated);
      
      // If we already have enough validated links, return them
      if (validated.length >= this.maxSubpages + 2) {
        return validated.slice(0, this.maxSubpages + 2);
      }
      
      // Validate remaining links if needed
      if (needsValidation.length > 0 && typeof URLValidator !== 'undefined') {
        console.log('[Ghost UI] Validating', needsValidation.length, 'page links...');
        
        const toValidate = needsValidation.slice(0, 10); // Limit validation batch
        const validatedBatch = await URLValidator.filterValidUrls(toValidate, {
          urlKey: 'url',
          maxItems: 10
        });
        
        // Add newly validated links to our pool and results
        validatedBatch.forEach(link => {
          const normalizedUrl = this._normalizeUrl(link.url);
          this.validatedUrls.set(normalizedUrl, { ...link, isValidated: true });
          link.isValidated = true;
          validated.push(link);
        });
      }
      
      // Re-sort by score and return
      return validated
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, this.maxSubpages + 2);
    }

    /**
     * Normalize URL for deduplication
     * @param {string} url - URL to normalize
     * @returns {string} Normalized URL
     */
    _normalizeUrl(url) {
      try {
        const parsed = new URL(url);
        // Remove trailing slash, lowercase path
        return parsed.origin + parsed.pathname.replace(/\/$/, '').toLowerCase();
      } catch {
        return url.toLowerCase();
      }
    }

    /**
     * Extract page name from URL
     * @param {string} url 
     * @returns {string}
     */
    _getPageNameFromUrl(url) {
      try {
        const pathname = new URL(url).pathname;
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length === 0) return 'Home';
        const lastPart = parts[parts.length - 1];
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, '')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } catch {
        return 'Page';
      }
    }

    /**
     * Analyze if user question might benefit from subpage context
     * Uses sitemap discovery for better URL awareness (token-efficient)
     * 
     * @param {string} question - User's question
     * @param {Object} pageContext - Current page data
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeQuestionForSubpages(question, pageContext) {
      const q = question.toLowerCase();
      
      // Ensure sitemap discovery has been attempted
      // This is non-blocking and cached after first call
      if (!this.sitemapLoaded && !this.sitemapLoading) {
        // Don't await - let it load in background for future queries
        this.initSitemapDiscovery().catch(() => {});
      }

      // Keywords suggesting need for broader context
      const broadContextKeywords = [
        'entire site', 'whole website', 'all pages', 'other pages',
        'linked pages', 'related pages', 'more information', 'more details',
        'elsewhere', 'another page', 'different page', 'navigation',
        'what else', 'anything else', 'additional', 'complete', 'full',
        'overall', 'everything', 'comprehensive'
      ];

      // Check if question might benefit from subpage context
      const needsBroaderContext = broadContextKeywords.some(kw => q.includes(kw));
      
      // Get relevant suggestions (combines page links + sitemap URLs locally)
      const suggestions = this.extractRelevantLinks(pageContext);
      
      // Log sitemap contribution for debugging
      const sitemapContribution = suggestions.filter(s => s.isFromSitemap && !s.isFromPage).length;
      if (sitemapContribution > 0) {
        console.log('[Ghost UI] Sitemap contributed', sitemapContribution, 'unique URL suggestions');
      }
      
      return {
        suggestSubpages: needsBroaderContext && suggestions.length > 0,
        suggestions: suggestions.slice(0, this.maxSubpages),
        reason: needsBroaderContext 
          ? 'Your question might benefit from information on related pages.'
          : null,
        // Metadata for debugging (never sent to OpenAI)
        _debug: {
          totalSuggestions: suggestions.length,
          fromPage: suggestions.filter(s => s.isFromPage).length,
          fromSitemapOnly: sitemapContribution,
          sitemapLoaded: this.sitemapLoaded
        }
      };
    }

    /**
     * Set pending suggestions for user approval
     * @param {Array} suggestions - Links to suggest
     */
    setSuggestions(suggestions) {
      this.pendingSuggestions = suggestions.slice(0, this.maxSubpages);
      if (this.pendingSuggestions.length > 0) {
        this.onSuggestionReady(this.pendingSuggestions);
      }
    }

    /**
     * Approve a subpage for loading
     * @param {string} url - URL to approve
     * @returns {boolean} Success
     */
    approveSubpage(url) {
      if (this.approvedSubpages.length >= this.maxSubpages) {
        console.warn('[Ghost UI] Maximum subpages reached');
        return false;
      }

      if (!this.approvedSubpages.includes(url)) {
        this.approvedSubpages.push(url);
        // Remove from pending
        this.pendingSuggestions = this.pendingSuggestions.filter(s => s.url !== url);
        return true;
      }
      return false;
    }

    /**
     * Skip a suggested subpage
     * @param {string} url - URL to skip
     */
    skipSubpage(url) {
      this.pendingSuggestions = this.pendingSuggestions.filter(s => s.url !== url);
    }

    /**
     * Load all approved subpages
     * @returns {Promise<Array>} Loaded subpage data
     */
    async loadApprovedSubpages() {
      if (this.approvedSubpages.length === 0) {
        return [];
      }

      if (typeof WebPageExtractor === 'undefined') {
        console.error('[Ghost UI] WebPageExtractor not available');
        return [];
      }

      this.isLoading = true;

      try {
        const results = await WebPageExtractor.fetchSubpages(
          this.approvedSubpages, 
          this.maxSubpages
        );
        
        this.loadedSubpages = results.filter(Boolean);
        this.onSubpagesLoaded(this.loadedSubpages);
        
        console.log('[Ghost UI] Loaded subpages:', this.loadedSubpages.length);
        return this.loadedSubpages;
      } catch (error) {
        console.error('[Ghost UI] Failed to load subpages:', error);
        this.onError(error);
        return [];
      } finally {
        this.isLoading = false;
      }
    }

    /**
     * Get loaded subpage data
     * @returns {Array}
     */
    getLoadedSubpages() {
      return this.loadedSubpages;
    }

    /**
     * Get count of approved subpages
     * @returns {number}
     */
    getApprovedCount() {
      return this.approvedSubpages.length;
    }

    /**
     * Check if more subpages can be added
     * @returns {boolean}
     */
    canAddMore() {
      return this.approvedSubpages.length < this.maxSubpages;
    }

    /**
     * Clear all subpage data
     * Note: Sitemap cache and validated URLs are preserved (they're page-independent)
     */
    clear() {
      this.approvedSubpages = [];
      this.loadedSubpages = [];
      this.pendingSuggestions = [];
      // Sitemap URLs and validated URLs are NOT cleared - they're page-independent and reusable
    }

    /**
     * Force reload sitemap discovery
     * Use when navigating to a different origin
     * Also clears the validated URL pool
     */
    resetSitemapDiscovery() {
      this.sitemapUrls = [];
      this.sitemapLoaded = false;
      this.sitemapLoading = false;
      this.validatedUrls.clear(); // Clear validated pool on origin change
      
      if (typeof SitemapDiscovery !== 'undefined') {
        SitemapDiscovery.clearCache();
      }
      if (typeof URLValidator !== 'undefined') {
        URLValidator.clearCache();
      }
    }

    /**
     * Get summary of loaded subpages for display
     * @returns {Array<Object>}
     */
    getSubpageSummary() {
      return this.loadedSubpages.map(page => ({
        title: page.title || 'Untitled',
        url: page.url,
        contentLength: page.content?.length || 0
      }));
    }

    /**
     * Find the best matching URL for a navigation request
     * Uses sitemap + page links to find the most relevant page
     * CRITICAL: Only returns validated URLs to prevent 404 errors
     * 
     * @param {string} query - User's navigation query (e.g., "contact page", "pricing")
     * @returns {Object|null} Best matching URL with confidence score (validated only)
     */
    findNavigationTarget(query) {
      const q = query.toLowerCase();
      
      console.log('[Ghost UI] DEBUG: findNavigationTarget called with query:', q);
      console.log('[Ghost UI] DEBUG: sitemapLoaded:', this.sitemapLoaded, 'sitemapUrls.length:', this.sitemapUrls?.length, 'validatedUrls.size:', this.validatedUrls?.size);
      
      // CRITICAL: Only use validated URLs from our pool
      // This prevents navigation to non-existent pages
      const allUrls = [];
      const seenUrls = new Set();
      
      // Add validated sitemap URLs only
      // Sitemap URLs are validated during initSitemapDiscovery()
      if (this.sitemapUrls && this.sitemapUrls.length > 0) {
        this.sitemapUrls.forEach(item => {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            // Double-check validation status
            const isValidated = this.isUrlValidated(item.url);
            if (isValidated) {
              allUrls.push({ ...item, isValidated: true });
            }
          }
        });
      }
      
      // Also include any other URLs from our validated pool that aren't in sitemap
      this.validatedUrls.forEach((item, normalizedUrl) => {
        if (!seenUrls.has(item.url) && !seenUrls.has(normalizedUrl)) {
          seenUrls.add(item.url);
          allUrls.push({ ...item, isValidated: true });
        }
      });
      
      if (allUrls.length === 0) {
        console.log('[Ghost UI] findNavigationTarget: No validated URLs available');
        return null;
      }
      
      console.log('[Ghost UI] findNavigationTarget: Searching', allUrls.length, 'validated URLs for query:', q);
      
      // Score each URL based on match with query
      const scored = allUrls.map(item => {
        let score = 0;
        const url = item.url.toLowerCase();
        const path = item.path?.toLowerCase() || new URL(item.url).pathname.toLowerCase();
        const text = (item.text || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        
        // Direct keyword matches
        const keywords = q.split(/\s+/).filter(w => w.length > 2);
        keywords.forEach(kw => {
          if (path.includes(kw)) score += 20;
          if (text.includes(kw)) score += 15;
          if (category === kw) score += 25;
        });
        
        // Common page type matches
        const pageTypeMatches = [
          { patterns: ['contact', 'kontakt', 'reach', 'get in touch'], category: 'contact', boost: 30 },
          { patterns: ['pricing', 'price', 'cost', 'plans', 'preise'], category: 'pricing', boost: 30 },
          { patterns: ['about', 'über uns', 'who we are', 'team', 'company'], category: 'about', boost: 30 },
          { patterns: ['features', 'funktionen', 'capabilities'], category: 'features', boost: 30 },
          { patterns: ['faq', 'questions', 'help', 'hilfe'], category: 'help', boost: 30 },
          { patterns: ['docs', 'documentation', 'guide', 'tutorial'], category: 'docs', boost: 30 },
          { patterns: ['blog', 'news', 'articles'], category: 'blog', boost: 20 },
          { patterns: ['home', 'start', 'main'], category: 'home', boost: 20 },
          { patterns: ['products', 'services', 'solutions', 'produkte'], category: 'products', boost: 25 },
          { patterns: ['login', 'signin', 'anmelden'], category: 'login', boost: 15 },
          { patterns: ['signup', 'register', 'registrieren'], category: 'signup', boost: 15 },
          { patterns: ['support', 'customer service'], category: 'support', boost: 25 },
          { patterns: ['impressum', 'legal', 'imprint'], category: 'legal', boost: 15 },
          { patterns: ['privacy', 'datenschutz'], category: 'privacy', boost: 15 },
          { patterns: ['terms', 'agb', 'conditions'], category: 'terms', boost: 15 }
        ];
        
        pageTypeMatches.forEach(({ patterns, category: cat, boost }) => {
          const queryMatches = patterns.some(p => q.includes(p));
          const urlMatches = patterns.some(p => path.includes(p) || text.includes(p));
          if (queryMatches && urlMatches) {
            score += boost;
          }
          if (item.category === cat && queryMatches) {
            score += boost * 0.5;
          }
        });
        
        // Prefer shorter paths (usually main pages)
        const pathDepth = item.pathDepth || (path.match(/\//g) || []).length;
        if (pathDepth <= 2) score += 5;
        
        return { ...item, score };
      });
      
      // Sort by score and return the best match
      const sorted = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
      
      if (sorted.length === 0) {
        console.log('[Ghost UI] findNavigationTarget: No matches found for query');
        return null;
      }
      
      const best = sorted[0];
      
      // Only return if confidence is high enough
      if (best.score >= 20) {
        console.log('[Ghost UI] findNavigationTarget: Found validated target:', best.url, 'score:', best.score);
        return {
          url: best.url,
          text: best.text || this._getPageNameFromUrl(best.url),
          score: best.score,
          confidence: best.score >= 40 ? 'high' : 'medium',
          isValidated: true // Mark as validated for downstream safety
        };
      }
      
      console.log('[Ghost UI] findNavigationTarget: Best match score too low:', best.score);
      return null;
    }
    
    /**
     * Async version of findNavigationTarget that validates URLs before returning
     * Use when you need to ensure real-time validation
     * 
     * @param {string} query - User's navigation query
     * @returns {Promise<Object|null>} Best matching validated URL
     */
    async findNavigationTargetAsync(query) {
      console.log('[Ghost UI] DEBUG: findNavigationTargetAsync called with query:', query);
      
      // First try synchronous version (uses cached validations)
      const syncResult = this.findNavigationTarget(query);
      
      console.log('[Ghost UI] DEBUG: findNavigationTarget (sync) returned:', syncResult ? 
        { url: syncResult.url, score: syncResult.score, confidence: syncResult.confidence } : 'null');
      
      if (syncResult) {
        // Double-verify the URL is still valid (in case cache expired)
        if (typeof URLValidator !== 'undefined') {
          const revalidation = await URLValidator.validateUrl(syncResult.url);
          if (revalidation.valid) {
            console.log('[Ghost UI] DEBUG: URL revalidation passed:', syncResult.url);
            // Update URL in case of redirect
            return {
              ...syncResult,
              url: revalidation.finalUrl || syncResult.url,
              isValidated: true
            };
          } else {
            // URL no longer valid, remove from pool
            console.warn('[Ghost UI] Previously valid URL is now invalid:', syncResult.url, revalidation.reason);
            const normalizedUrl = this._normalizeUrl(syncResult.url);
            this.validatedUrls.delete(normalizedUrl);
            // Try to find another match by recursing (won't infinite loop since we removed the bad URL)
            return this.findNavigationTarget(query);
          }
        }
        return syncResult;
      }
      
      console.log('[Ghost UI] DEBUG: findNavigationTargetAsync returning null - no target found');
      return null;
    }
  }

  // ============================================
  // Navigation Agent - Agent-Style Page Navigation
  // Handles detection of navigation intent and page routing
  // ============================================
  class NavigationAgent {
    constructor(options = {}) {
      this.subpageManager = options.subpageManager || null;
      this.onNavigate = options.onNavigate || (() => {});
      this.onNavigationConfirm = options.onNavigationConfirm || (() => Promise.resolve(true));
      
      // ============================================
      // AUTO-NAVIGATION CONTROL FLAG
      // Set to false to disable automatic navigation and require user confirmation
      // Set to true to re-enable automatic navigation for high-confidence matches
      // ============================================
      this.autoNavigationEnabled = options.autoNavigationEnabled ?? false;
      
      // Navigation intent patterns (bilingual DE/EN)
      this.navigationPatterns = [
        // Direct navigation requests
        /(?:take me to|bring me to|go to|navigate to|open|show me|zeig mir|zeige mir|öffne|gehe zu|navigiere zu|bring mich zu|führ mich zu)\s+(?:the\s+)?(.+?)(?:\s+page)?$/i,
        // Question-style navigation
        /(?:where (?:can i find|is)|wo (?:finde ich|ist))\s+(?:the\s+)?(.+?)(?:\s+page)?(?:\s*\?)?$/i,
        // Implicit navigation
        /^(?:i want to see|i need|ich möchte|ich brauche|ich will)\s+(?:the\s+)?(.+?)(?:\s+page)?$/i
      ];
      
      // Strong navigation keywords that indicate definite navigation intent
      this.strongNavigationKeywords = [
        'take me', 'bring me', 'go to', 'navigate to', 'open the',
        'show me the page', 'führ mich', 'bring mich', 'gehe zu',
        'navigiere zu', 'öffne die seite'
      ];
      
      // Page type synonyms for better matching
      this.pageTypeSynonyms = {
        'contact': ['contact', 'kontakt', 'reach us', 'get in touch', 'erreichen'],
        'pricing': ['pricing', 'prices', 'cost', 'plans', 'preise', 'kosten', 'tarife'],
        'about': ['about', 'about us', 'über uns', 'who we are', 'team', 'company'],
        'features': ['features', 'funktionen', 'capabilities', 'what we offer'],
        'help': ['help', 'faq', 'support', 'hilfe', 'fragen'],
        'docs': ['documentation', 'docs', 'guide', 'guides', 'tutorial', 'anleitung'],
        'home': ['home', 'homepage', 'main page', 'startseite', 'hauptseite'],
        'blog': ['blog', 'news', 'articles', 'neuigkeiten', 'artikel'],
        'products': ['products', 'services', 'solutions', 'produkte', 'dienstleistungen'],
        'login': ['login', 'sign in', 'anmelden', 'einloggen'],
        'signup': ['signup', 'sign up', 'register', 'registrieren', 'anmelden']
      };
      
      // ============================================
      // Information-based navigation keywords
      // These are topics typically found on subpages, not on the main page
      // ============================================
      this.informationKeywords = {
        'contact': {
          keywords: ['kontakt', 'contact', 'kontaktieren', 'erreichen', 'anrufen', 'email', 'e-mail', 'telefon', 'phone', 'adresse', 'address', 'anschrift', 'kontaktformular', 'contact form', 'reach out'],
          queryPatterns: [
            /(?:wie|how)\s+(?:kann ich|can i)\s+(?:euch|you|sie)\s+(?:kontaktieren|erreichen|contact|reach)/i,
            /(?:wo|where)\s+(?:finde ich|find|ist|is)\s+(?:die\s+)?(?:kontakt|contact)/i,
            /(?:kontakt|contact)\s*(?:daten|informationen|info|details)/i,
            /(?:telefon|phone|email|e-mail)\s*(?:nummer|number|adresse|address)?/i
          ]
        },
        'impressum': {
          keywords: ['impressum', 'imprint', 'legal notice', 'rechtliche hinweise', 'legal', 'herausgeber', 'publisher'],
          queryPatterns: [
            /(?:wo|where)\s+(?:finde ich|find|ist|is)\s+(?:das\s+)?impressum/i,
            /(?:wer|who)\s+(?:betreibt|runs|is behind)\s+(?:diese|this)\s+(?:seite|website|page)/i,
            /impressum|imprint|legal\s+notice/i
          ]
        },
        'privacy': {
          keywords: ['datenschutz', 'privacy', 'dsgvo', 'gdpr', 'privatsphäre', 'data protection', 'cookies', 'datenschutzerklärung', 'privacy policy'],
          queryPatterns: [
            /(?:wo|where)\s+(?:finde ich|find|ist|is)\s+(?:die\s+)?(?:datenschutz|privacy)/i,
            /(?:datenschutz|privacy)\s*(?:erklärung|policy|hinweise|info)/i,
            /(?:wie|how)\s+(?:werden|are)\s+(?:meine\s+)?daten\s+(?:verwendet|verarbeitet|used|processed)/i,
            /dsgvo|gdpr|cookie/i
          ]
        },
        'pricing': {
          keywords: ['preise', 'pricing', 'kosten', 'cost', 'tarife', 'plans', 'gebühren', 'fees', 'preis', 'price', 'pakete', 'packages'],
          queryPatterns: [
            /(?:was|what)\s+(?:kostet|costs|does.*cost)/i,
            /(?:wo|where)\s+(?:finde ich|find|sind|are)\s+(?:die\s+)?(?:preise|pricing|kosten|prices)/i,
            /(?:wie|how)\s+(?:viel|much)\s+(?:kostet|costs)/i,
            /(?:preise|pricing|kosten|prices|tarife|plans)/i
          ]
        },
        'faq': {
          keywords: ['faq', 'häufige fragen', 'frequently asked', 'hilfe', 'help', 'fragen und antworten', 'q&a'],
          queryPatterns: [
            /(?:häufige|frequently)\s+(?:gestellte\s+)?(?:fragen|asked|questions)/i,
            /faq|q\s*&\s*a/i,
            /(?:wo|where)\s+(?:finde ich|find|ist|is)\s+(?:die\s+)?(?:hilfe|help|faq)/i
          ]
        },
        'about': {
          keywords: ['über uns', 'about us', 'about', 'wer wir sind', 'who we are', 'team', 'unternehmen', 'company', 'firma', 'geschichte', 'history'],
          queryPatterns: [
            /(?:wer|who)\s+(?:seid ihr|sind sie|are you)/i,
            /(?:über|about)\s+(?:uns|euch|das unternehmen|you|the company)/i,
            /(?:wo|where)\s+(?:finde ich|find|ist|is)\s+(?:infos?\s+)?(?:über|about)/i,
            /(?:team|unternehmen|company|firma)/i
          ]
        },
        'careers': {
          keywords: ['karriere', 'careers', 'jobs', 'stellen', 'positions', 'stellenangebote', 'job openings', 'arbeiten bei', 'work with us'],
          queryPatterns: [
            /(?:habt ihr|do you have)\s+(?:offene\s+)?(?:stellen|jobs|positions)/i,
            /(?:karriere|careers|jobs|stellenangebote)/i,
            /(?:kann ich|can i)\s+(?:bei euch|with you)\s+(?:arbeiten|work)/i,
            /(?:wo|where)\s+(?:finde ich|find)\s+(?:die\s+)?(?:karriere|careers|jobs)/i
          ]
        },
        'terms': {
          keywords: ['agb', 'terms', 'nutzungsbedingungen', 'terms of service', 'terms of use', 'conditions', 'bedingungen', 'tos'],
          queryPatterns: [
            /(?:wo|where)\s+(?:finde ich|find|sind|are)\s+(?:die\s+)?(?:agb|nutzungsbedingungen|terms)/i,
            /agb|terms\s+(?:of\s+)?(?:service|use)|nutzungsbedingungen/i
          ]
        },
        'support': {
          keywords: ['support', 'kundenservice', 'customer service', 'kundensupport', 'hilfe', 'help', 'service'],
          queryPatterns: [
            /(?:wie|how)\s+(?:erreiche ich|do i reach)\s+(?:den\s+)?(?:support|kundenservice)/i,
            /(?:wo|where)\s+(?:finde ich|find|ist|is)\s+(?:der\s+)?(?:support|kundenservice|customer service)/i,
            /(?:brauche|need)\s+(?:hilfe|help|support)/i
          ]
        }
      };
      
      // Question indicators that suggest looking for information
      this.informationQueryIndicators = [
        // German
        'wo finde ich', 'wo ist', 'wo steht', 'wo sind', 'wo kann ich',
        'wie finde ich', 'wie erreiche ich', 'wie kontaktiere ich',
        'gibt es', 'habt ihr', 'haben sie',
        'was sind', 'was ist', 'welche',
        'zeig mir', 'zeige mir',
        // English
        'where can i find', 'where is', 'where are', 'where do i find',
        'how can i', 'how do i', 'how to',
        'do you have', 'is there', 'are there',
        'what is', 'what are', 'which',
        'show me', 'tell me about'
      ];
    }

    /**
     * Analyze user message to detect navigation intent
     * 
     * @param {string} message - User's message
     * @returns {Object} Analysis result with intent type and target
     */
    analyzeIntent(message) {
      const msg = message.toLowerCase().trim();
      
      // Check for strong navigation keywords first
      const hasStrongNavKeyword = this.strongNavigationKeywords.some(kw => 
        msg.includes(kw.toLowerCase())
      );
      
      // Try to match navigation patterns
      let targetPage = null;
      for (const pattern of this.navigationPatterns) {
        const match = msg.match(pattern);
        if (match && match[1]) {
          targetPage = match[1].trim();
          break;
        }
      }
      
      // Normalize the target page using synonyms
      if (targetPage) {
        targetPage = this._normalizePageType(targetPage);
      }
      
      // Determine if this is a navigation request
      const isNavigationRequest = hasStrongNavKeyword || 
        (targetPage && this._isLikelyNavigationTarget(targetPage));
      
      return {
        type: isNavigationRequest ? 'NAVIGATE' : 'UNKNOWN',
        targetPage: targetPage,
        confidence: hasStrongNavKeyword ? 'high' : (targetPage ? 'medium' : 'low'),
        rawQuery: message
      };
    }

    /**
     * Normalize page type using synonyms
     * @param {string} target - Raw target from user query
     * @returns {string} Normalized page type
     */
    _normalizePageType(target) {
      const t = target.toLowerCase();
      
      for (const [canonical, synonyms] of Object.entries(this.pageTypeSynonyms)) {
        if (synonyms.some(syn => t.includes(syn.toLowerCase()))) {
          return canonical;
        }
      }
      
      return target;
    }

    /**
     * Check if a target is likely a navigation target (not a general question)
     * @param {string} target 
     * @returns {boolean}
     */
    _isLikelyNavigationTarget(target) {
      const t = target.toLowerCase();
      
      // Check if it matches any known page type
      for (const synonyms of Object.values(this.pageTypeSynonyms)) {
        if (synonyms.some(syn => t.includes(syn.toLowerCase()))) {
          return true;
        }
      }
      
      // Check for common page indicators
      const pageIndicators = ['page', 'seite', 'section', 'bereich', 'area'];
      return pageIndicators.some(ind => t.includes(ind));
    }

    /**
     * Analyze if a user message is an information query that typically
     * requires navigation to a subpage (contact, impressum, privacy, etc.)
     * 
     * @param {string} message - User's message
     * @returns {Object} Analysis with detected topic and confidence
     */
    analyzeInformationQuery(message) {
      const msg = message.toLowerCase().trim();
      
      // Check if message contains information query indicators
      const hasQueryIndicator = this.informationQueryIndicators.some(ind => 
        msg.includes(ind.toLowerCase())
      );
      
      // Find matching information topics
      const matches = [];
      
      for (const [topic, config] of Object.entries(this.informationKeywords)) {
        let score = 0;
        
        // Check keywords
        const keywordMatches = config.keywords.filter(kw => msg.includes(kw.toLowerCase()));
        score += keywordMatches.length * 10;
        
        // Check query patterns
        const patternMatches = config.queryPatterns.filter(pattern => pattern.test(msg));
        score += patternMatches.length * 20;
        
        if (score > 0) {
          matches.push({
            topic,
            score,
            keywordMatches,
            patternMatches: patternMatches.length
          });
        }
      }
      
      // Sort by score
      matches.sort((a, b) => b.score - a.score);
      
      if (matches.length === 0) {
        return {
          isInformationQuery: false,
          topic: null,
          confidence: 'none',
          allMatches: []
        };
      }
      
      const bestMatch = matches[0];
      const confidence = bestMatch.score >= 30 ? 'high' : 
                        bestMatch.score >= 15 ? 'medium' : 'low';
      
      // Check if there are multiple equally good matches (ambiguous)
      const isAmbiguous = matches.length > 1 && 
                         matches[1].score >= bestMatch.score * 0.7;
      
      return {
        isInformationQuery: hasQueryIndicator || confidence !== 'low',
        topic: bestMatch.topic,
        confidence,
        score: bestMatch.score,
        isAmbiguous,
        allMatches: matches.slice(0, 3) // Top 3 matches for disambiguation
      };
    }

    /**
     * Check if the requested information is available on the current page
     * 
     * @param {string} topic - The information topic (contact, privacy, etc.)
     * @param {Object} pageContext - Current page context with extracted content
     * @returns {Object} Result indicating if info is found and where
     */
    checkInformationOnCurrentPage(topic, pageContext) {
      if (!pageContext || !topic) {
        return { found: false, confidence: 'none' };
      }
      
      const config = this.informationKeywords[topic];
      if (!config) {
        return { found: false, confidence: 'none' };
      }
      
      // Build searchable text from page context
      // CRITICAL: Exclude link text to avoid false positives from navigation links
      // Only check actual page content, not navigation elements
      const searchableText = [
        pageContext.title || '',
        pageContext.description || '',
        pageContext.mainContent || '',
        // Don't include raw pageContent as it may contain nav link text
        (pageContext.headings || []).join(' ')
      ].join(' ').toLowerCase();
      
      console.log('[Ghost UI] DEBUG: checkInformationOnCurrentPage for topic:', topic, 
                 'searchableText length:', searchableText.length);
      
      // Check current URL - if we're already on the relevant page
      const currentUrl = (pageContext.url || window.location.href).toLowerCase();
      const currentPath = new URL(currentUrl).pathname.toLowerCase();
      
      // Check if current page IS the target page
      const isOnTargetPage = config.keywords.some(kw => 
        currentPath.includes(kw.toLowerCase()) || 
        currentUrl.includes(kw.toLowerCase())
      );
      
      if (isOnTargetPage) {
        return {
          found: true,
          confidence: 'high',
          reason: 'Already on the target page',
          isCurrentPage: true
        };
      }
      
      // Check if information is present in page content
      let keywordHits = 0;
      const foundKeywords = [];
      
      for (const keyword of config.keywords) {
        if (searchableText.includes(keyword.toLowerCase())) {
          keywordHits++;
          foundKeywords.push(keyword);
        }
      }
      
      // Determine if enough relevant content is present
      // Higher threshold means we're more likely to suggest navigation
      const threshold = config.keywords.length * 0.3; // At least 30% of keywords should be present
      
      if (keywordHits >= 3 || keywordHits >= threshold) {
        return {
          found: true,
          confidence: keywordHits >= 5 ? 'high' : 'medium',
          reason: `Found ${keywordHits} relevant keywords on current page`,
          foundKeywords,
          isCurrentPage: false
        };
      }
      
      return {
        found: false,
        confidence: 'low',
        reason: `Only ${keywordHits} keyword matches, likely on another page`,
        foundKeywords
      };
    }

    /**
     * Find multiple navigation targets for disambiguation
     * Returns up to 3 matching validated URLs
     * 
     * @param {string} query - Search query
     * @returns {Array} Array of matching targets with scores
     */
    findMultipleNavigationTargets(query) {
      if (!this.subpageManager) return [];
      
      const q = query.toLowerCase();
      const allUrls = [];
      const seenUrls = new Set();
      
      // Collect validated URLs
      if (this.subpageManager.sitemapUrls && this.subpageManager.sitemapUrls.length > 0) {
        this.subpageManager.sitemapUrls.forEach(item => {
          if (!seenUrls.has(item.url) && this.subpageManager.isUrlValidated(item.url)) {
            seenUrls.add(item.url);
            allUrls.push({ ...item, isValidated: true });
          }
        });
      }
      
      this.subpageManager.validatedUrls.forEach((item, normalizedUrl) => {
        if (!seenUrls.has(item.url) && !seenUrls.has(normalizedUrl)) {
          seenUrls.add(item.url);
          allUrls.push({ ...item, isValidated: true });
        }
      });
      
      if (allUrls.length === 0) return [];
      
      // Score each URL
      const scored = allUrls.map(item => {
        let score = 0;
        const url = item.url.toLowerCase();
        const path = item.path?.toLowerCase() || new URL(item.url).pathname.toLowerCase();
        const text = (item.text || '').toLowerCase();
        
        // Check against information keywords
        for (const [topic, config] of Object.entries(this.informationKeywords)) {
          const queryMatches = config.keywords.some(kw => q.includes(kw.toLowerCase()));
          const urlMatches = config.keywords.some(kw => 
            path.includes(kw.toLowerCase()) || text.includes(kw.toLowerCase())
          );
          
          if (queryMatches && urlMatches) {
            score += 25;
          }
        }
        
        // Direct keyword matches in path
        const keywords = q.split(/\s+/).filter(w => w.length > 2);
        keywords.forEach(kw => {
          if (path.includes(kw)) score += 15;
          if (text.includes(kw)) score += 10;
        });
        
        return { ...item, score, displayName: item.text || this._getPageNameFromPath(path) };
      });
      
      // Return top matches with score > 0, sorted by score
      return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    }

    /**
     * Get a readable page name from URL path
     * @param {string} path - URL path
     * @returns {string} Human-readable name
     */
    _getPageNameFromPath(path) {
      // Remove leading/trailing slashes and file extension
      let name = path.replace(/^\/|\/$/g, '').replace(/\.\w+$/, '');
      
      // Get last segment
      const segments = name.split('/');
      name = segments[segments.length - 1] || 'Page';
      
      // Convert to title case
      return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Determine the best action for a user message
     * Returns one of: ANSWER, LOAD, NAVIGATE, SUGGEST_NAVIGATION
     * CRITICAL: Only returns NAVIGATE/SUGGEST_NAVIGATION actions with validated URLs
     * 
     * When autoNavigationEnabled is false:
     * - All navigation intents return SUGGEST_NAVIGATION
     * - User must explicitly confirm before navigation occurs
     * 
     * @param {string} message - User's message
     * @param {Object} pageContext - Current page context
     * @returns {Object} Decision with action type and details
     */
    async decideAction(message, pageContext) {
      // First, analyze for navigation intent
      const navAnalysis = this.analyzeIntent(message);
      
      // If strong navigation intent detected
      if (navAnalysis.type === 'NAVIGATE' && navAnalysis.confidence === 'high') {
        // Try to find the target URL (validated only)
        if (this.subpageManager) {
          // Ensure sitemap is loaded and URLs are validated
          await this.subpageManager.initSitemapDiscovery();
          
          // Use async version for real-time validation
          const target = await this.subpageManager.findNavigationTargetAsync(navAnalysis.targetPage);
          
          if (target && target.confidence === 'high' && target.isValidated) {
            // ============================================
            // AUTO-NAVIGATION CONTROL: Check if auto-navigation is enabled
            // If disabled, use SUGGEST_NAVIGATION instead of auto-navigating
            // ============================================
            if (this.autoNavigationEnabled) {
              return {
                action: 'NAVIGATE',
                target: target,
                reason: `Navigating to ${target.text}`,
                requiresConfirmation: false // High confidence + validated, no confirmation needed
              };
            } else {
              // Auto-navigation disabled - suggest instead
              return {
                action: 'SUGGEST_NAVIGATION',
                target: target,
                reason: `Die Informationen findest du auf der ${target.text}-Seite. Soll ich sie für dich öffnen?`,
                originalAction: 'NAVIGATE', // For easy re-enablement tracking
                wasHighConfidence: true
              };
            }
          } else if (target && target.isValidated) {
            // Medium confidence - always suggest (same behavior as before)
            return {
              action: 'SUGGEST_NAVIGATION',
              target: target,
              reason: `Found ${target.text} - would you like to go there?`,
              originalAction: 'NAVIGATE',
              wasHighConfidence: false
            };
          }
        }
        
        // Navigation intent but no valid target found - fall through to ANSWER
        console.log('[Ghost UI] Navigation intent detected but no validated target found');
        return {
          action: 'ANSWER',
          reason: 'Navigation target not found or not validated, will answer instead'
        };
      }
      
      // Medium confidence navigation intent - suggest but don't auto-navigate
      if (navAnalysis.type === 'NAVIGATE' && navAnalysis.targetPage) {
        if (this.subpageManager) {
          await this.subpageManager.initSitemapDiscovery();
          // Use async version for validation
          const target = await this.subpageManager.findNavigationTargetAsync(navAnalysis.targetPage);
          
          if (target && target.isValidated) {
            return {
              action: 'SUGGEST_NAVIGATION',
              target: target,
              reason: `Ich kann dich zur ${target.text}-Seite bringen. Möchtest du dorthin?`,
              originalAction: 'NAVIGATE',
              wasHighConfidence: false
            };
          }
        }
      }
      
      // ============================================
      // NEW: Information-based automatic navigation
      // Detects questions about typical subpage content and navigates there
      // ============================================
      const infoAnalysis = this.analyzeInformationQuery(message);
      
      console.log('[Ghost UI] DEBUG: analyzeInformationQuery result:', JSON.stringify(infoAnalysis, null, 2));
      
      if (infoAnalysis.isInformationQuery && infoAnalysis.topic) {
        console.log('[Ghost UI] Information query detected:', infoAnalysis.topic, 'confidence:', infoAnalysis.confidence);
        
        // Check if the information is on the current page
        const onCurrentPage = this.checkInformationOnCurrentPage(infoAnalysis.topic, pageContext);
        console.log('[Ghost UI] Information on current page:', onCurrentPage.found, onCurrentPage.reason);
        
        // If info is NOT on current page, try to navigate
        if (!onCurrentPage.found || onCurrentPage.confidence === 'low') {
          if (this.subpageManager) {
            console.log('[Ghost UI] DEBUG: Calling initSitemapDiscovery from decideAction...');
            await this.subpageManager.initSitemapDiscovery();
            console.log('[Ghost UI] DEBUG: initSitemapDiscovery complete. validatedUrls.size:', this.subpageManager.validatedUrls.size, 'sitemapUrls.length:', this.subpageManager.sitemapUrls?.length);
            
            // Check for ambiguous matches (multiple possible destinations)
            if (infoAnalysis.isAmbiguous && infoAnalysis.allMatches.length > 1) {
              // Find targets for disambiguation
              const multipleTargets = this.findMultipleNavigationTargets(message);
              
              if (multipleTargets.length > 1) {
                return {
                  action: 'DISAMBIGUATE',
                  targets: multipleTargets,
                  topic: infoAnalysis.topic,
                  allTopics: infoAnalysis.allMatches.map(m => m.topic),
                  reason: 'Multiple matching pages found - asking user to choose'
                };
              }
            }
            
            // Find single best target
            const target = await this.subpageManager.findNavigationTargetAsync(infoAnalysis.topic);
            
            if (target && target.isValidated) {
              // High confidence info query + validated target = auto-navigate (if enabled)
              const wouldAutoNavigate = infoAnalysis.confidence === 'high' && target.confidence === 'high';
              
              console.log('[Ghost UI] Found navigation target for info query:', target.url, 
                         'auto-navigate-enabled:', this.autoNavigationEnabled,
                         'would-auto-navigate:', wouldAutoNavigate);
              
              // ============================================
              // AUTO-NAVIGATION CONTROL: Check if auto-navigation is enabled
              // If disabled, always use SUGGEST_NAVIGATION for information queries
              // ============================================
              if (this.autoNavigationEnabled && wouldAutoNavigate) {
                return {
                  action: 'NAVIGATE',
                  target: target,
                  reason: `Ich öffne dir die ${target.text}-Seite.`,
                  requiresConfirmation: false,
                  isInformationBased: true,
                  infoTopic: infoAnalysis.topic
                };
              } else {
                // Auto-navigation disabled OR lower confidence - suggest instead
                return {
                  action: 'SUGGEST_NAVIGATION',
                  target: target,
                  reason: `Die Information zu "${infoAnalysis.topic}" findest du auf der ${target.text}-Seite. Soll ich sie für dich öffnen?`,
                  originalAction: 'NAVIGATE',
                  wasHighConfidence: wouldAutoNavigate,
                  isInformationBased: true,
                  infoTopic: infoAnalysis.topic
                };
              }
            }
          }
          
          // No matching subpage found - will answer with text
          console.log('[Ghost UI] No validated navigation target found for info query:', infoAnalysis.topic);
        } else if (onCurrentPage.isCurrentPage) {
          // User is already on the target page, just answer
          console.log('[Ghost UI] User is already on the target page for:', infoAnalysis.topic);
          return {
            action: 'ANSWER',
            reason: `Information about ${infoAnalysis.topic} is on this page`
          };
        }
        // If info IS on current page, fall through to ANSWER
      }
      
      // Check if question needs subpage context (existing behavior)
      const msg = message.toLowerCase();
      const broadContextKeywords = [
        'entire site', 'whole website', 'all pages', 'other pages',
        'linked pages', 'related pages', 'more information', 'more details',
        'elsewhere', 'another page', 'different page', 'navigation',
        'what else', 'anything else', 'additional', 'complete', 'full',
        'overall', 'everything', 'comprehensive'
      ];
      
      const needsBroaderContext = broadContextKeywords.some(kw => msg.includes(kw));
      
      if (needsBroaderContext && this.subpageManager?.canAddMore()) {
        return {
          action: 'LOAD',
          reason: 'Question may benefit from additional page context'
        };
      }
      
      // Default: just answer the question
      return {
        action: 'ANSWER',
        reason: 'Answering from current page context'
      };
    }

    /**
     * Perform navigation to a target URL
     * CRITICAL: Only navigates to validated, same-origin URLs
     * 
     * @param {string} targetUrl - URL to navigate to
     * @param {Object} options - Navigation options
     * @returns {boolean} Success status
     */
    performNavigation(targetUrl, options = {}) {
      const { skipValidationCheck = false } = options;
      
      try {
        const target = new URL(targetUrl);
        const current = new URL(window.location.href);
        
        // Security check: same origin only
        if (target.origin !== current.origin) {
          console.warn('[Ghost UI] Navigation blocked: cross-origin not allowed');
          return false;
        }
        
        // CRITICAL: Verify URL is in validated pool before navigating
        // This prevents navigation to 404 pages
        if (!skipValidationCheck && typeof URLValidator !== 'undefined') {
          const isValidated = URLValidator.isValidated(targetUrl);
          if (!isValidated) {
            console.warn('[Ghost UI] Navigation blocked: URL not in validated pool:', targetUrl);
            console.log('[Ghost UI] Use async validation or skipValidationCheck to override');
            return false;
          }
          
          // Use the final URL from validation (handles redirects)
          const finalUrl = URLValidator.getFinalUrl(targetUrl);
          if (finalUrl && finalUrl !== targetUrl) {
            console.log('[Ghost UI] Using final URL after redirect:', finalUrl);
            targetUrl = finalUrl;
          }
        }
        
        // Perform navigation
        console.log('[Ghost UI] Navigating to validated URL:', targetUrl);
        window.location.href = targetUrl;
        return true;
        
      } catch (error) {
        console.error('[Ghost UI] Navigation error:', error);
        return false;
      }
    }
    
    /**
     * Perform navigation with async validation
     * Validates URL before navigating to ensure it's reachable
     * 
     * @param {string} targetUrl - URL to navigate to
     * @returns {Promise<boolean>} Success status
     */
    async performNavigationAsync(targetUrl) {
      try {
        const target = new URL(targetUrl);
        const current = new URL(window.location.href);
        
        // Security check: same origin only
        if (target.origin !== current.origin) {
          console.warn('[Ghost UI] Navigation blocked: cross-origin not allowed');
          return false;
        }
        
        // Validate URL before navigation
        if (typeof URLValidator !== 'undefined') {
          console.log('[Ghost UI] Validating URL before navigation:', targetUrl);
          const validation = await URLValidator.validateUrl(targetUrl);
          
          if (!validation.valid) {
            console.warn('[Ghost UI] Navigation blocked: URL validation failed:', targetUrl, validation.reason);
            return false;
          }
          
          // Use the final URL (handles redirects)
          const finalUrl = validation.finalUrl || targetUrl;
          console.log('[Ghost UI] Navigating to validated URL:', finalUrl);
          window.location.href = finalUrl;
          return true;
        }
        
        // Fallback if URLValidator not available
        console.log('[Ghost UI] Navigating to:', targetUrl);
        window.location.href = targetUrl;
        return true;
        
      } catch (error) {
        console.error('[Ghost UI] Navigation error:', error);
        return false;
      }
    }
  }

  // ============================================
  // Chat UI Builder
  // ============================================
  class ChatUI {
    constructor() {
      this.root = null;
      this.elements = {};
    }

    create(initialLang = 'en') {
      // Create isolated root container
      this.root = document.createElement('div');
      this.root.id = 'liquid-glass-root';

      // Build trigger button
      const trigger = this._createTrigger();
      
      // Build chat window
      const chat = this._createChatWindow(initialLang);

      this.root.appendChild(trigger);
      this.root.appendChild(chat);
      document.body.appendChild(this.root);

      return this.elements;
    }

    _createTrigger() {
      const trigger = document.createElement('button');
      trigger.className = 'liquid-trigger';
      trigger.setAttribute('aria-label', 'Open chat');
      trigger.innerHTML = `<span class="liquid-trigger-icon">${Icons.chat}</span>`;
      
      this.elements.trigger = trigger;
      return trigger;
    }

    _createChatWindow(initialLang) {
      const chat = document.createElement('div');
      chat.className = 'liquid-chat';
      chat.setAttribute('role', 'dialog');
      chat.setAttribute('aria-label', 'Chat window');

      const langConfig = SUPPORTED_LANGUAGES[initialLang];
      const otherLang = initialLang === 'en' ? 'de' : 'en';
      const otherLangConfig = SUPPORTED_LANGUAGES[otherLang];

      chat.innerHTML = `
        <header class="liquid-header">
          <div class="liquid-header-info">
            <div class="liquid-avatar">
              ${Icons.bot}
            </div>
            <div>
              <h2 class="liquid-title">Ghost</h2>
              <div class="liquid-status">
                <span class="liquid-status-dot"></span>
                <span>Ready</span>
              </div>
            </div>
            <div class="liquid-voice-state-indicator" aria-live="polite">
              <span class="liquid-voice-state-dot"></span>
              <span class="liquid-voice-state-text">Listening</span>
            </div>
          </div>
          <div class="liquid-header-actions">
            <button class="liquid-voice-dialogue-toggle" aria-label="Toggle continuous voice dialogue" title="Continuous voice dialogue">
              <span class="liquid-voice-dialogue-icon">${Icons.voiceDialogue}</span>
            </button>
            <button class="liquid-tts-toggle" aria-label="Toggle voice output" title="Voice output enabled">
              <span class="liquid-tts-icon">${Icons.speaker}</span>
            </button>
            <button class="liquid-lang-toggle" aria-label="Switch language" title="Switch language (${langConfig.name})">
              <span class="liquid-lang-label" data-lang="${initialLang}">${langConfig.label}</span>
            </button>
            <button class="liquid-close" aria-label="Close chat">
              ${Icons.close}
            </button>
          </div>
        </header>
        
        <div class="liquid-messages">
          <div class="liquid-welcome">
            <div class="liquid-welcome-icon">
              ${Icons.wave}
            </div>
            <h3>Hello there!</h3>
            <p>Type a message or use voice input to get started.</p>
          </div>
        </div>
        
        <div class="liquid-input-area">
          <div class="liquid-input-container">
            <input 
              type="text" 
              class="liquid-input" 
              placeholder="Type your message..."
              aria-label="Message input"
            />
            <button class="liquid-btn liquid-btn-mic" aria-label="Voice input (${langConfig.name})">
              ${Icons.mic}
            </button>
            <button class="liquid-btn liquid-btn-send" aria-label="Send message">
              ${Icons.send}
            </button>
          </div>
          <div class="liquid-input-lang-hint">
            <span class="liquid-lang-indicator">${Icons.language}</span>
            <span class="liquid-lang-text">Voice: ${langConfig.name}</span>
          </div>
        </div>
        
        <button class="liquid-focus-mode-bar" aria-label="Toggle Focus Mode" aria-pressed="false">
          <span class="liquid-focus-mode-label">Enable Focus Mode</span>
        </button>
        
        <!-- Voice Dialogue Overlay (for listening animation) -->
        <div class="liquid-voice-dialogue-overlay">
          <div class="liquid-voice-dialogue-rings"><span></span></div>
          <div class="liquid-voice-dialogue-center-mic">${Icons.mic}</div>
        </div>
        
        <!-- Voice Dialogue Interrupt Notice -->
        <div class="liquid-voice-interrupt-notice">
          Speak to interrupt
        </div>
      `;

      // Cache element references
      this.elements.chat = chat;
      this.elements.closeBtn = chat.querySelector('.liquid-close');
      this.elements.ttsToggle = chat.querySelector('.liquid-tts-toggle');
      this.elements.ttsIcon = chat.querySelector('.liquid-tts-icon');
      this.elements.langToggle = chat.querySelector('.liquid-lang-toggle');
      this.elements.langLabel = chat.querySelector('.liquid-lang-label');
      this.elements.langText = chat.querySelector('.liquid-lang-text');
      this.elements.messages = chat.querySelector('.liquid-messages');
      this.elements.input = chat.querySelector('.liquid-input');
      this.elements.micBtn = chat.querySelector('.liquid-btn-mic');
      this.elements.sendBtn = chat.querySelector('.liquid-btn-send');
      
      // Voice dialogue elements
      this.elements.voiceDialogueToggle = chat.querySelector('.liquid-voice-dialogue-toggle');
      this.elements.voiceStateIndicator = chat.querySelector('.liquid-voice-state-indicator');
      this.elements.voiceStateDot = chat.querySelector('.liquid-voice-state-dot');
      this.elements.voiceStateText = chat.querySelector('.liquid-voice-state-text');
      
      // Focus Mode elements
      this.elements.focusModeBar = chat.querySelector('.liquid-focus-mode-bar');
      this.elements.focusModeLabel = chat.querySelector('.liquid-focus-mode-label');

      return chat;
    }

    /**
     * Update UI to reflect language change
     */
    updateLanguageUI(lang) {
      const config = SUPPORTED_LANGUAGES[lang];
      if (!config) return;

      // Update language toggle button
      if (this.elements.langLabel) {
        this.elements.langLabel.textContent = config.label;
        this.elements.langLabel.dataset.lang = lang;
      }

      // Update language toggle tooltip
      if (this.elements.langToggle) {
        this.elements.langToggle.title = `Switch language (${config.name})`;
      }

      // Update mic button aria-label
      if (this.elements.micBtn) {
        const isRecording = this.elements.micBtn.classList.contains('is-recording');
        this.elements.micBtn.setAttribute(
          'aria-label',
          isRecording ? 'Stop recording' : `Voice input (${config.name})`
        );
      }

      // Update language hint text
      if (this.elements.langText) {
        this.elements.langText.textContent = `Voice: ${config.name}`;
      }
    }

    /**
     * Update TTS toggle UI
     */
    updateTTSUI(isEnabled, isPlaying) {
      if (this.elements.ttsToggle) {
        this.elements.ttsToggle.classList.toggle('is-disabled', !isEnabled);
        this.elements.ttsToggle.classList.toggle('is-playing', isPlaying);
        this.elements.ttsToggle.title = isEnabled ? 'Voice output enabled' : 'Voice output disabled';
        this.elements.ttsToggle.setAttribute('aria-label', isEnabled ? 'Disable voice output' : 'Enable voice output');
      }
      
      if (this.elements.ttsIcon) {
        this.elements.ttsIcon.innerHTML = isEnabled ? Icons.speaker : Icons.speakerMuted;
      }
    }

    /**
     * Update voice dialogue toggle UI
     */
    updateVoiceDialogueToggleUI(isActive) {
      if (this.elements.voiceDialogueToggle) {
        this.elements.voiceDialogueToggle.classList.toggle('is-active', isActive);
        this.elements.voiceDialogueToggle.title = isActive 
          ? 'Disable continuous voice dialogue' 
          : 'Enable continuous voice dialogue';
        this.elements.voiceDialogueToggle.setAttribute(
          'aria-label', 
          isActive ? 'Disable continuous voice dialogue' : 'Enable continuous voice dialogue'
        );
      }
      
      if (this.elements.chat) {
        this.elements.chat.classList.toggle('voice-dialogue-active', isActive);
      }
    }

    /**
     * Update Focus Mode UI
     * @param {boolean} isActive - Whether Focus Mode is active
     */
    updateFocusModeUI(isActive) {
      const { focusModeBar, focusModeLabel, chat } = this.elements;
      
      if (focusModeBar) {
        focusModeBar.classList.toggle('is-active', isActive);
        focusModeBar.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        focusModeBar.setAttribute(
          'aria-label',
          isActive ? 'Disable Focus Mode' : 'Enable Focus Mode'
        );
      }
      
      if (focusModeLabel) {
        focusModeLabel.textContent = isActive ? 'Focus Mode Active' : 'Enable Focus Mode';
      }
      
      // Toggle Focus Mode overlay and page dimming
      if (isActive) {
        this._enableFocusModeEffects();
      } else {
        this._disableFocusModeEffects();
      }
    }

    /**
     * Enable Focus Mode visual effects on the page
     * - Dims non-essential page areas
     * - Hides common distractions (ads, cookie banners, popups)
     */
    _enableFocusModeEffects() {
      // Add Focus Mode class to document body
      document.body.classList.add('ghost-focus-mode-active');
      
      // Create dimming overlay if it doesn't exist
      if (!document.getElementById('ghost-focus-mode-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'ghost-focus-mode-overlay';
        overlay.className = 'ghost-focus-mode-overlay';
        document.body.appendChild(overlay);
      }
    }

    /**
     * Disable Focus Mode visual effects
     * Restores the page to its original state
     */
    _disableFocusModeEffects() {
      // Remove Focus Mode class from document body
      document.body.classList.remove('ghost-focus-mode-active');
      
      // Remove dimming overlay
      const overlay = document.getElementById('ghost-focus-mode-overlay');
      if (overlay) {
        overlay.remove();
      }
    }

    /**
     * Update voice dialogue state UI
     * @param {string} state - Current voice dialogue state
     */
    updateVoiceDialogueStateUI(state) {
      const { voiceStateIndicator, voiceStateDot, voiceStateText, chat } = this.elements;
      
      if (!voiceStateIndicator) return;
      
      // Show/hide indicator based on state
      const isIdle = state === VoiceDialogueState.IDLE;
      voiceStateIndicator.classList.toggle('is-visible', !isIdle);
      
      // Remove all state classes
      voiceStateIndicator.classList.remove('is-listening', 'is-thinking', 'is-speaking');
      
      if (chat) {
        chat.classList.remove('voice-dialogue-listening', 'voice-dialogue-thinking', 'voice-dialogue-speaking');
      }
      
      // Apply state-specific styling
      switch (state) {
        case VoiceDialogueState.LISTENING:
          voiceStateIndicator.classList.add('is-listening');
          if (voiceStateText) voiceStateText.textContent = 'Listening';
          if (chat) chat.classList.add('voice-dialogue-listening');
          break;
          
        case VoiceDialogueState.THINKING:
          voiceStateIndicator.classList.add('is-thinking');
          if (voiceStateText) voiceStateText.textContent = 'Thinking';
          if (chat) chat.classList.add('voice-dialogue-thinking');
          break;
          
        case VoiceDialogueState.SPEAKING:
          voiceStateIndicator.classList.add('is-speaking');
          if (voiceStateText) voiceStateText.textContent = 'Speaking';
          if (chat) chat.classList.add('voice-dialogue-speaking');
          break;
          
        default:
          // IDLE state - indicator is hidden
          break;
      }
    }

    /**
     * Create subpage suggestion card UI
     * @param {Array} suggestions - Suggested subpages
     * @param {Object} callbacks - Callback functions for approve/skip
     * @returns {HTMLElement}
     */
    createSubpageSuggestionCard(suggestions, callbacks = {}) {
      const { onApprove, onSkip, onSkipAll } = callbacks;
      
      const card = document.createElement('div');
      card.className = 'liquid-subpage-suggestion';
      
      const headerHtml = `
        <div class="liquid-subpage-header">
          <span class="liquid-subpage-icon">${Icons.pages}</span>
          <span class="liquid-subpage-title">Related pages found</span>
        </div>
        <p class="liquid-subpage-desc">Would you like me to include information from these pages? (max 3)</p>
      `;
      
      const suggestionsHtml = suggestions.map((s, index) => `
        <div class="liquid-subpage-item" data-url="${this._escapeHtml(s.url)}" data-index="${index}">
          <div class="liquid-subpage-item-info">
            <span class="liquid-subpage-item-icon">${Icons.link}</span>
            <div class="liquid-subpage-item-text">
              <span class="liquid-subpage-item-title">${this._escapeHtml(s.text || this._getPageNameFromUrl(s.url))}</span>
              <span class="liquid-subpage-item-url">${this._escapeHtml(this._shortenUrl(s.url))}</span>
            </div>
          </div>
          <div class="liquid-subpage-item-actions">
            <button class="liquid-subpage-btn liquid-subpage-btn-include" data-action="approve" title="Include this page">
              ${Icons.check}
            </button>
            <button class="liquid-subpage-btn liquid-subpage-btn-skip" data-action="skip" title="Skip this page">
              ${Icons.x}
            </button>
          </div>
        </div>
      `).join('');
      
      const footerHtml = `
        <div class="liquid-subpage-footer">
          <button class="liquid-subpage-skip-all">Skip all and continue</button>
        </div>
      `;
      
      card.innerHTML = headerHtml + suggestionsHtml + footerHtml;
      
      // Bind event listeners
      card.querySelectorAll('.liquid-subpage-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const item = btn.closest('.liquid-subpage-item');
          const url = item.dataset.url;
          
          if (action === 'approve' && onApprove) {
            onApprove(url, item);
          } else if (action === 'skip' && onSkip) {
            onSkip(url, item);
          }
        });
      });
      
      const skipAllBtn = card.querySelector('.liquid-subpage-skip-all');
      if (skipAllBtn && onSkipAll) {
        skipAllBtn.addEventListener('click', () => onSkipAll(card));
      }
      
      return card;
    }

    /**
     * Update subpage item to show approved state
     * @param {HTMLElement} item - The subpage item element
     */
    markSubpageApproved(item) {
      item.classList.add('is-approved');
      item.querySelector('.liquid-subpage-item-actions').innerHTML = `
        <span class="liquid-subpage-approved-badge">${Icons.check} Included</span>
      `;
    }

    /**
     * Remove subpage item from suggestion list
     * @param {HTMLElement} item - The subpage item element
     */
    removeSubpageItem(item) {
      item.classList.add('is-removed');
      setTimeout(() => item.remove(), 300);
    }

    /**
     * Create loading indicator for subpage fetching
     * @returns {HTMLElement}
     */
    createSubpageLoadingIndicator() {
      const indicator = document.createElement('div');
      indicator.className = 'liquid-subpage-loading';
      indicator.innerHTML = `
        <span class="liquid-loading-indicator">${Icons.loading}</span>
        <span>Loading selected pages...</span>
      `;
      return indicator;
    }

    /**
     * Create subpage context indicator (shows which pages are loaded)
     * @param {Array} subpages - Loaded subpage summaries
     * @returns {HTMLElement}
     */
    createSubpageContextIndicator(subpages) {
      const indicator = document.createElement('div');
      indicator.className = 'liquid-context-indicator';
      
      const pagesHtml = subpages.map(p => `
        <span class="liquid-context-page" title="${this._escapeHtml(p.url)}">
          ${Icons.page} ${this._escapeHtml(p.title)}
        </span>
      `).join('');
      
      indicator.innerHTML = `
        <span class="liquid-context-label">Context includes:</span>
        <span class="liquid-context-page liquid-context-current">${Icons.page} Current page</span>
        ${pagesHtml}
      `;
      
      return indicator;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text 
     * @returns {string}
     */
    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * Extract page name from URL
     * @param {string} url 
     * @returns {string}
     */
    _getPageNameFromUrl(url) {
      try {
        const pathname = new URL(url).pathname;
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length === 0) return 'Home';
        const lastPart = parts[parts.length - 1];
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, '')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } catch {
        return 'Page';
      }
    }

    /**
     * Shorten URL for display
     * @param {string} url 
     * @returns {string}
     */
    _shortenUrl(url) {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        if (path.length > 40) {
          return path.substring(0, 37) + '...';
        }
        return path || '/';
      } catch {
        return url;
      }
    }

    destroy() {
      if (this.root) {
        this.root.remove();
        this.root = null;
        this.elements = {};
      }
    }
  }

  // ============================================
  // Trigger Drag Handler
  // Allows the floating chat button to be dragged anywhere on screen
  // ============================================
  class TriggerDragHandler {
    constructor(trigger, root, options = {}) {
      this.trigger = trigger;
      this.root = root;
      this.options = {
        storageKey: 'ghostui-trigger-position',
        dragThreshold: 5, // pixels of movement to distinguish drag from click
        edgeMargin: 20, // minimum distance from viewport edge
        ...options
      };
      
      // Drag state
      this.isDragging = false;
      this.hasMoved = false;
      this._suppressNextClick = false;
      this.startX = 0;
      this.startY = 0;
      this.initialLeft = 0;
      this.initialTop = 0;
      
      // Bound handlers for cleanup
      this._onMouseDown = this._handleMouseDown.bind(this);
      this._onMouseMove = this._handleMouseMove.bind(this);
      this._onMouseUp = this._handleMouseUp.bind(this);
      this._onTouchStart = this._handleTouchStart.bind(this);
      this._onTouchMove = this._handleTouchMove.bind(this);
      this._onTouchEnd = this._handleTouchEnd.bind(this);
      
      this._init();
    }
    
    _init() {
      // Restore saved position or use default
      this._restorePosition();
      
      // Add event listeners
      this.trigger.addEventListener('mousedown', this._onMouseDown);
      this.trigger.addEventListener('touchstart', this._onTouchStart, { passive: false });
      
      // Add draggable cursor style
      this.trigger.style.cursor = 'grab';
    }
    
    /**
     * Restore button position from storage
     */
    _restorePosition() {
      try {
        const saved = localStorage.getItem(this.options.storageKey);
        if (saved) {
          const position = JSON.parse(saved);
          this._applyPosition(position.left, position.top);
        }
        // If no saved position, button stays at default (bottom-right via CSS)
      } catch (e) {
        console.warn('[TriggerDragHandler] Could not restore position:', e);
      }
    }
    
    /**
     * Save current position to storage
     */
    _savePosition(left, top) {
      try {
        localStorage.setItem(this.options.storageKey, JSON.stringify({ left, top }));
      } catch (e) {
        console.warn('[TriggerDragHandler] Could not save position:', e);
      }
    }
    
    /**
     * Apply position to trigger button and root container
     */
    _applyPosition(left, top) {
      const viewport = this._getViewportSize();
      const triggerRect = this.trigger.getBoundingClientRect();
      const triggerWidth = triggerRect.width || 60;
      const triggerHeight = triggerRect.height || 60;
      
      // Clamp to viewport with margin
      const margin = this.options.edgeMargin;
      left = Math.max(margin, Math.min(left, viewport.width - triggerWidth - margin));
      top = Math.max(margin, Math.min(top, viewport.height - triggerHeight - margin));
      
      // When position is set, we need to override the default positioning
      // The root is positioned fixed, and trigger is absolute within root
      // To allow free positioning, we position the root at (0,0) and move trigger
      this.root.style.bottom = 'auto';
      this.root.style.right = 'auto';
      this.root.style.top = '0';
      this.root.style.left = '0';
      
      this.trigger.style.bottom = 'auto';
      this.trigger.style.right = 'auto';
      this.trigger.style.left = left + 'px';
      this.trigger.style.top = top + 'px';
      
      // Also update chat window position relative to trigger
      this._updateChatPosition(left, top, triggerWidth, triggerHeight);
    }
    
    /**
     * Update chat window position based on trigger position
     */
    _updateChatPosition(triggerLeft, triggerTop, triggerWidth, triggerHeight) {
      const chat = this.root.querySelector('.liquid-chat');
      if (!chat) return;
      
      const viewport = this._getViewportSize();
      const chatWidth = 400;
      const chatHeight = 560;
      const gap = 16;
      
      // Determine best position for chat (above or below, left or right)
      let chatLeft, chatTop;
      
      // Horizontal: align chat to trigger, prefer right-aligned
      if (triggerLeft + chatWidth > viewport.width - this.options.edgeMargin) {
        // Align right edge of chat with right edge of trigger
        chatLeft = triggerLeft + triggerWidth - chatWidth;
      } else {
        // Align left edge
        chatLeft = triggerLeft;
      }
      chatLeft = Math.max(this.options.edgeMargin, Math.min(chatLeft, viewport.width - chatWidth - this.options.edgeMargin));
      
      // Vertical: prefer above trigger, fall back to below
      if (triggerTop - chatHeight - gap >= this.options.edgeMargin) {
        // Place above
        chatTop = triggerTop - chatHeight - gap;
      } else {
        // Place below
        chatTop = triggerTop + triggerHeight + gap;
      }
      chatTop = Math.max(this.options.edgeMargin, Math.min(chatTop, viewport.height - chatHeight - this.options.edgeMargin));
      
      chat.style.bottom = 'auto';
      chat.style.right = 'auto';
      chat.style.left = chatLeft + 'px';
      chat.style.top = chatTop + 'px';
      chat.style.transformOrigin = this._getTransformOrigin(triggerLeft, triggerTop, chatLeft, chatTop);
    }
    
    /**
     * Get appropriate transform origin based on relative positions
     */
    _getTransformOrigin(triggerLeft, triggerTop, chatLeft, chatTop) {
      const horizontal = triggerLeft >= chatLeft ? 'right' : 'left';
      const vertical = triggerTop >= chatTop ? 'bottom' : 'top';
      return `${vertical} ${horizontal}`;
    }
    
    _getViewportSize() {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    }
    
    // ===== Mouse event handlers =====
    
    _handleMouseDown(e) {
      // Only handle left click
      if (e.button !== 0) return;
      
      e.preventDefault();
      this._startDrag(e.clientX, e.clientY);
      
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('mouseup', this._onMouseUp);
    }
    
    _handleMouseMove(e) {
      e.preventDefault();
      this._moveDrag(e.clientX, e.clientY);
    }
    
    _handleMouseUp(e) {
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mouseup', this._onMouseUp);
      this._endDrag();
    }
    
    // ===== Touch event handlers =====
    
    _handleTouchStart(e) {
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      this._startDrag(touch.clientX, touch.clientY);
      
      document.addEventListener('touchmove', this._onTouchMove, { passive: false });
      document.addEventListener('touchend', this._onTouchEnd);
      document.addEventListener('touchcancel', this._onTouchEnd);
    }
    
    _handleTouchMove(e) {
      if (e.touches.length !== 1) return;
      
      e.preventDefault();
      const touch = e.touches[0];
      this._moveDrag(touch.clientX, touch.clientY);
    }
    
    _handleTouchEnd(e) {
      document.removeEventListener('touchmove', this._onTouchMove);
      document.removeEventListener('touchend', this._onTouchEnd);
      document.removeEventListener('touchcancel', this._onTouchEnd);
      this._endDrag();
    }
    
    // ===== Core drag logic =====
    
    _startDrag(clientX, clientY) {
      this.isDragging = true;
      this.hasMoved = false;
      this.startX = clientX;
      this.startY = clientY;
      
      // Get current position
      const rect = this.trigger.getBoundingClientRect();
      this.initialLeft = rect.left;
      this.initialTop = rect.top;
      
      this.trigger.style.cursor = 'grabbing';
      this.trigger.classList.add('is-dragging');
    }
    
    _moveDrag(clientX, clientY) {
      if (!this.isDragging) return;
      
      const deltaX = clientX - this.startX;
      const deltaY = clientY - this.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Check if we've moved past the threshold
      if (distance >= this.options.dragThreshold) {
        this.hasMoved = true;
      }
      
      if (this.hasMoved) {
        const newLeft = this.initialLeft + deltaX;
        const newTop = this.initialTop + deltaY;
        this._applyPosition(newLeft, newTop);
      }
    }
    
    _endDrag() {
      const wasDragging = this.hasMoved;
      
      this.isDragging = false;
      this.trigger.style.cursor = 'grab';
      this.trigger.classList.remove('is-dragging');
      
      if (wasDragging) {
        // Save final position
        const rect = this.trigger.getBoundingClientRect();
        this._savePosition(rect.left, rect.top);
        
        // Mark that we should suppress the upcoming click
        this._suppressNextClick = true;
      }
    }
    
    /**
     * Check if a click should be suppressed because it was actually a drag
     * This method also resets the flag after checking
     */
    shouldSuppressClick() {
      if (this._suppressNextClick) {
        this._suppressNextClick = false;
        return true;
      }
      return false;
    }
    
    /**
     * Reset position to default (bottom-right)
     */
    resetPosition() {
      localStorage.removeItem(this.options.storageKey);
      
      // Restore default CSS positioning
      this.root.style.bottom = '24px';
      this.root.style.right = '24px';
      this.root.style.top = '';
      this.root.style.left = '';
      
      this.trigger.style.bottom = '0';
      this.trigger.style.right = '0';
      this.trigger.style.left = '';
      this.trigger.style.top = '';
      
      // Reset chat position
      const chat = this.root.querySelector('.liquid-chat');
      if (chat) {
        chat.style.bottom = '76px';
        chat.style.right = '0';
        chat.style.left = '';
        chat.style.top = '';
        chat.style.transformOrigin = 'bottom right';
      }
    }
    
    /**
     * Clean up event listeners
     */
    destroy() {
      this.trigger.removeEventListener('mousedown', this._onMouseDown);
      this.trigger.removeEventListener('touchstart', this._onTouchStart);
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mouseup', this._onMouseUp);
      document.removeEventListener('touchmove', this._onTouchMove);
      document.removeEventListener('touchend', this._onTouchEnd);
      document.removeEventListener('touchcancel', this._onTouchEnd);
    }
  }

  // ============================================
  // Focus Plus Add-on (Modular Enhancement)
  // ============================================
  // This addon extends the existing Focus Mode without modifying any original code.
  // All state uses the 'focusPlus' prefix to avoid conflicts.
  // Activation is triggered by observing the existing isFocusMode state.
  
  class FocusPlusAddon {
    constructor() {
      // FocusPlus-specific state (prefixed to avoid conflicts)
      this.focusPlusEnabled = false;
      this.focusPlusSettings = {
        dimmingLevel: 0.35,        // Default dimming (matches original)
        highlightMainContent: true, // Highlight main content area
        readingModeEnabled: false,  // Simplified text formatting
        hideScrollbars: false,      // Optional scrollbar hiding
        focusTimerEnabled: false,   // Optional focus timer
        focusTimerMinutes: 25,      // Pomodoro-style default
      };
      this.focusPlusTimerInterval = null;
      this.focusPlusTimerStartTime = null;
      this.focusPlusElements = {};
      this.focusPlusStylesInjected = false;
      this.focusPlusChatbotRef = null;
      
      // [Focus Mode Add-on] Enhanced Features State
      this.focusPlusMainContentElement = null;  // Detected main content element
      this.focusPlusAutoHideTimer = null;       // Timer for UI auto-hide
      this.focusPlusAutoHideDelay = 4000;       // 4 seconds delay
      this.focusPlusScrollHandler = null;       // Scroll event handler
      this.focusPlusInteractionHandler = null;  // Interaction event handler
      
      // Bind methods
      this._focusPlusInjectStyles = this._focusPlusInjectStyles.bind(this);
      this._focusPlusOnActivate = this._focusPlusOnActivate.bind(this);
      this._focusPlusOnDeactivate = this._focusPlusOnDeactivate.bind(this);
      this._focusPlusHandleInteraction = this._focusPlusHandleInteraction.bind(this);
      this._focusPlusHandleScroll = this._focusPlusHandleScroll.bind(this);
    }

    /**
     * Initialize the addon and connect to the chatbot instance
     * @param {Chatbot} chatbotInstance - Reference to the main chatbot
     */
    focusPlusInit(chatbotInstance) {
      this.focusPlusChatbotRef = chatbotInstance;
      this._focusPlusInjectStyles();
      this._focusPlusCreateControlPanel();
      console.log('[FocusPlus Addon] Initialized');
    }

    /**
     * Inject FocusPlus-specific CSS styles
     * These styles are additive and don't override existing styles
     */
    _focusPlusInjectStyles() {
      if (this.focusPlusStylesInjected) return;
      
      const styleId = 'ghost-focus-plus-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* ============================================
           FocusPlus Add-on Styles
           All classes prefixed with 'focus-plus-' to avoid conflicts
           ============================================ */
        
        /* Enhanced dimming overlay (variable opacity) */
        .ghost-focus-mode-overlay.focus-plus-enhanced {
          transition: background 0.3s ease;
        }
        
        /* Main content highlighting */
        .focus-plus-content-highlight {
          position: relative;
          z-index: 2147483641 !important;
          box-shadow: 0 0 0 4px rgba(88, 166, 255, 0.15),
                      0 0 30px rgba(88, 166, 255, 0.1) !important;
          border-radius: 8px;
        }
        
        /* Reading mode enhancements */
        body.focus-plus-reading-mode main,
        body.focus-plus-reading-mode article,
        body.focus-plus-reading-mode [role="main"],
        body.focus-plus-reading-mode .content,
        body.focus-plus-reading-mode .post-content,
        body.focus-plus-reading-mode .article-content,
        body.focus-plus-reading-mode .entry-content {
          font-size: 18px !important;
          line-height: 1.8 !important;
          max-width: 720px !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        
        body.focus-plus-reading-mode p {
          margin-bottom: 1.5em !important;
        }
        
        /* Hide scrollbars option */
        body.focus-plus-hide-scrollbars::-webkit-scrollbar {
          display: none !important;
        }
        
        body.focus-plus-hide-scrollbars {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        
        /* FocusPlus Control Panel */
        .focus-plus-panel {
          position: fixed;
          bottom: 100px;
          right: 440px;
          width: 280px;
          padding: 16px;
          background: rgba(22, 22, 24, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: 2147483646;
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px) scale(0.95);
          transition: all 0.25s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .focus-plus-panel.is-visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }
        
        .focus-plus-panel-title {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .focus-plus-panel-title::before {
          content: '✨';
        }
        
        .focus-plus-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        
        .focus-plus-control:last-child {
          border-bottom: none;
        }
        
        .focus-plus-control-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .focus-plus-control-sublabel {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 2px;
        }
        
        /* Toggle switch */
        .focus-plus-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .focus-plus-toggle.is-on {
          background: rgba(88, 166, 255, 0.5);
        }
        
        .focus-plus-toggle::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s ease;
        }
        
        .focus-plus-toggle.is-on::after {
          transform: translateX(20px);
        }
        
        /* Slider for dimming */
        .focus-plus-slider-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .focus-plus-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          outline: none;
        }
        
        .focus-plus-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: rgba(88, 166, 255, 0.9);
          border-radius: 50%;
          cursor: pointer;
        }
        
        .focus-plus-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: rgba(88, 166, 255, 0.9);
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
        
        .focus-plus-slider-value {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          min-width: 35px;
          text-align: right;
        }
        
        /* Timer display */
        .focus-plus-timer-display {
          font-size: 16px;
          font-weight: 600;
          color: rgba(88, 166, 255, 0.9);
          font-family: 'SF Mono', Monaco, monospace;
        }
        
        /* Panel toggle button (appears when Focus Mode is active) */
        .focus-plus-panel-toggle {
          position: absolute;
          bottom: 460px;
          right: 20px;
          width: 32px;
          height: 32px;
          background: rgba(88, 166, 255, 0.15);
          border: 1px solid rgba(88, 166, 255, 0.3);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease;
          z-index: 2147483646;
        }
        
        .focus-plus-panel-toggle.is-visible {
          opacity: 1;
          visibility: visible;
        }
        
        .focus-plus-panel-toggle:hover {
          background: rgba(88, 166, 255, 0.25);
          border-color: rgba(88, 166, 255, 0.5);
        }
        
        .focus-plus-panel-toggle svg {
          width: 16px;
          height: 16px;
          fill: rgba(88, 166, 255, 0.9);
        }
      `;
      
      document.head.appendChild(style);
      this.focusPlusStylesInjected = true;
    }

    /**
     * Create the FocusPlus control panel UI
     * Panel appears only when Focus Mode is active
     */
    _focusPlusCreateControlPanel() {
      // Create panel toggle button (gear icon)
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'focus-plus-panel-toggle';
      toggleBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/></svg>`;
      toggleBtn.setAttribute('aria-label', 'FocusPlus Settings');
      toggleBtn.title = 'FocusPlus Settings';
      
      // Create control panel
      const panel = document.createElement('div');
      panel.className = 'focus-plus-panel';
      panel.innerHTML = `
        <div class="focus-plus-panel-title">Focus Plus Settings</div>
        
        <div class="focus-plus-control">
          <div>
            <div class="focus-plus-control-label">Dimming Level</div>
            <div class="focus-plus-control-sublabel">Adjust background darkness</div>
          </div>
          <div class="focus-plus-slider-container">
            <input type="range" class="focus-plus-slider" id="focus-plus-dimming" min="0" max="80" value="35">
            <span class="focus-plus-slider-value" id="focus-plus-dimming-value">35%</span>
          </div>
        </div>
        
        <div class="focus-plus-control">
          <div>
            <div class="focus-plus-control-label">Highlight Content</div>
            <div class="focus-plus-control-sublabel">Emphasize main content area</div>
          </div>
          <div class="focus-plus-toggle is-on" id="focus-plus-highlight"></div>
        </div>
        
        <div class="focus-plus-control">
          <div>
            <div class="focus-plus-control-label">Reading Mode</div>
            <div class="focus-plus-control-sublabel">Improve text readability</div>
          </div>
          <div class="focus-plus-toggle" id="focus-plus-reading"></div>
        </div>
        
        <div class="focus-plus-control">
          <div>
            <div class="focus-plus-control-label">Hide Scrollbars</div>
            <div class="focus-plus-control-sublabel">Cleaner visual appearance</div>
          </div>
          <div class="focus-plus-toggle" id="focus-plus-scrollbars"></div>
        </div>
        
        <div class="focus-plus-control">
          <div>
            <div class="focus-plus-control-label">Focus Timer</div>
            <div class="focus-plus-control-sublabel">Track focused time</div>
          </div>
          <div class="focus-plus-timer-display" id="focus-plus-timer">00:00</div>
        </div>
      `;
      
      // Cache elements
      this.focusPlusElements.toggleBtn = toggleBtn;
      this.focusPlusElements.panel = panel;
      
      // Append to Ghost UI root (will be added when chatbot initializes)
      const root = document.getElementById('liquid-glass-root');
      if (root) {
        root.appendChild(toggleBtn);
        root.appendChild(panel);
        this._focusPlusSetupEventListeners();
      } else {
        // Retry after DOM is ready
        setTimeout(() => {
          const retryRoot = document.getElementById('liquid-glass-root');
          if (retryRoot) {
            retryRoot.appendChild(toggleBtn);
            retryRoot.appendChild(panel);
            this._focusPlusSetupEventListeners();
          }
        }, 500);
      }
    }

    /**
     * Set up event listeners for the control panel
     */
    _focusPlusSetupEventListeners() {
      const { toggleBtn, panel } = this.focusPlusElements;
      
      // Toggle panel visibility
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('is-visible');
      });
      
      // Dimming slider
      const dimmingSlider = panel.querySelector('#focus-plus-dimming');
      const dimmingValue = panel.querySelector('#focus-plus-dimming-value');
      
      dimmingSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        dimmingValue.textContent = `${value}%`;
        this.focusPlusSettings.dimmingLevel = value / 100;
        this._focusPlusUpdateDimming();
      });
      
      // Highlight toggle
      panel.querySelector('#focus-plus-highlight').addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('is-on');
        this.focusPlusSettings.highlightMainContent = e.currentTarget.classList.contains('is-on');
        this._focusPlusUpdateContentHighlight();
      });
      
      // Reading mode toggle
      panel.querySelector('#focus-plus-reading').addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('is-on');
        this.focusPlusSettings.readingModeEnabled = e.currentTarget.classList.contains('is-on');
        this._focusPlusUpdateReadingMode();
      });
      
      // Scrollbars toggle
      panel.querySelector('#focus-plus-scrollbars').addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('is-on');
        this.focusPlusSettings.hideScrollbars = e.currentTarget.classList.contains('is-on');
        this._focusPlusUpdateScrollbars();
      });
      
      // Close panel when clicking outside
      document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
          panel.classList.remove('is-visible');
        }
      });
    }

    /**
     * Called when Focus Mode is activated
     * Wrapper function that observes existing behavior
     */
    _focusPlusOnActivate() {
      this.focusPlusEnabled = true;
      
      // Show the settings toggle button
      if (this.focusPlusElements.toggleBtn) {
        this.focusPlusElements.toggleBtn.classList.add('is-visible');
      }
      
      // Apply FocusPlus enhancements
      this._focusPlusUpdateDimming();
      this._focusPlusUpdateContentHighlight();
      this._focusPlusStartTimer();
      
      // [Focus Mode Add-on] Enhanced Features Activation
      this._focusPlusDetectMainContent();
      this._focusPlusSetupAutoHide();
      this._focusPlusSetupScrollIndicator();
      
      console.log('[FocusPlus Addon] Activated');
    }

    /**
     * Called when Focus Mode is deactivated
     * Wrapper function that observes existing behavior
     */
    _focusPlusOnDeactivate() {
      this.focusPlusEnabled = false;
      
      // Hide the settings toggle button and panel
      if (this.focusPlusElements.toggleBtn) {
        this.focusPlusElements.toggleBtn.classList.remove('is-visible');
      }
      if (this.focusPlusElements.panel) {
        this.focusPlusElements.panel.classList.remove('is-visible');
      }
      
      // Remove FocusPlus enhancements
      this._focusPlusRemoveContentHighlight();
      this._focusPlusRemoveReadingMode();
      this._focusPlusRemoveScrollbars();
      this._focusPlusStopTimer();
      
      // [Focus Mode Add-on] Enhanced Features Cleanup
      this._focusPlusCleanupAutoHide();
      this._focusPlusCleanupScrollIndicator();
      this._focusPlusCleanupMainContent();
      
      console.log('[FocusPlus Addon] Deactivated');
    }

    /**
     * Update dimming level on the overlay
     */
    _focusPlusUpdateDimming() {
      if (!this.focusPlusEnabled) return;
      
      const overlay = document.getElementById('ghost-focus-mode-overlay');
      if (overlay) {
        overlay.classList.add('focus-plus-enhanced');
        overlay.style.background = `rgba(0, 0, 0, ${this.focusPlusSettings.dimmingLevel})`;
      }
    }

    /**
     * Highlight main content area
     */
    _focusPlusUpdateContentHighlight() {
      if (!this.focusPlusEnabled || !this.focusPlusSettings.highlightMainContent) {
        this._focusPlusRemoveContentHighlight();
        return;
      }
      
      // Find main content elements
      const mainSelectors = ['main', 'article', '[role="main"]', '.main-content', '.content', '.post', '.entry'];
      let mainElement = null;
      
      for (const selector of mainSelectors) {
        mainElement = document.querySelector(selector);
        if (mainElement) break;
      }
      
      if (mainElement && !mainElement.classList.contains('focus-plus-content-highlight')) {
        mainElement.classList.add('focus-plus-content-highlight');
        this.focusPlusElements.highlightedContent = mainElement;
      }
    }

    /**
     * Remove content highlight
     */
    _focusPlusRemoveContentHighlight() {
      if (this.focusPlusElements.highlightedContent) {
        this.focusPlusElements.highlightedContent.classList.remove('focus-plus-content-highlight');
        this.focusPlusElements.highlightedContent = null;
      }
      
      // Also remove from any element that might have it
      document.querySelectorAll('.focus-plus-content-highlight').forEach(el => {
        el.classList.remove('focus-plus-content-highlight');
      });
    }

    /**
     * Update reading mode
     */
    _focusPlusUpdateReadingMode() {
      if (this.focusPlusSettings.readingModeEnabled) {
        document.body.classList.add('focus-plus-reading-mode');
      } else {
        this._focusPlusRemoveReadingMode();
      }
    }

    /**
     * Remove reading mode
     */
    _focusPlusRemoveReadingMode() {
      document.body.classList.remove('focus-plus-reading-mode');
    }

    /**
     * Update scrollbar visibility
     */
    _focusPlusUpdateScrollbars() {
      if (this.focusPlusSettings.hideScrollbars) {
        document.body.classList.add('focus-plus-hide-scrollbars');
      } else {
        this._focusPlusRemoveScrollbars();
      }
    }

    /**
     * Remove scrollbar hiding
     */
    _focusPlusRemoveScrollbars() {
      document.body.classList.remove('focus-plus-hide-scrollbars');
    }

    /**
     * Start focus timer
     */
    _focusPlusStartTimer() {
      this.focusPlusTimerStartTime = Date.now();
      
      this.focusPlusTimerInterval = setInterval(() => {
        const elapsed = Date.now() - this.focusPlusTimerStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timerDisplay = this.focusPlusElements.panel?.querySelector('#focus-plus-timer');
        if (timerDisplay) {
          timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
      }, 1000);
    }

    /**
     * Stop focus timer
     */
    _focusPlusStopTimer() {
      if (this.focusPlusTimerInterval) {
        clearInterval(this.focusPlusTimerInterval);
        this.focusPlusTimerInterval = null;
      }
      this.focusPlusTimerStartTime = null;
      
      const timerDisplay = this.focusPlusElements.panel?.querySelector('#focus-plus-timer');
      if (timerDisplay) {
        timerDisplay.textContent = '00:00';
      }
    }

    // ============================================
    // Focus Mode Add-on: Enhanced Features
    // ============================================

    /**
     * [Focus Mode Add-on] Detect main content using heuristic
     * Priority: main → article → [role="main"] → body (fallback)
     */
    _focusPlusDetectMainContent() {
      const selectors = ['main', 'article', '[role="main"]'];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          this.focusPlusMainContentElement = element;
          element.setAttribute('data-focus-main-content', 'true');
          console.log('[FocusPlus Addon] Main content detected:', selector);
          return;
        }
      }
      
      // Fallback to body
      this.focusPlusMainContentElement = document.body;
      console.log('[FocusPlus Addon] Main content fallback: body');
    }

    /**
     * [Focus Mode Add-on] Cleanup main content detection
     */
    _focusPlusCleanupMainContent() {
      if (this.focusPlusMainContentElement) {
        this.focusPlusMainContentElement.removeAttribute('data-focus-main-content');
      }
      this.focusPlusMainContentElement = null;
    }

    /**
     * [Focus Mode Add-on] Get visible content from main content area
     * Used by agent to restrict context when Focus Mode is active
     */
    _focusPlusGetVisibleContent() {
      if (!this.focusPlusEnabled || !this.focusPlusMainContentElement) {
        return null; // Return null to use default behavior
      }

      const mainContent = this.focusPlusMainContentElement;
      const viewportHeight = window.innerHeight;
      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + viewportHeight;

      // Get all text nodes within main content that are visible in viewport
      const visibleText = [];
      const walker = document.createTreeWalker(
        mainContent,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            // Skip hidden elements
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Check if element is in viewport
            const rect = parent.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            const elementBottom = elementTop + rect.height;
            
            if (elementBottom < viewportTop || elementTop > viewportBottom) {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim();
        if (text) {
          visibleText.push(text);
        }
      }

      return visibleText.join(' ').substring(0, 5000); // Limit to 5000 chars
    }

    /**
     * [Focus Mode Add-on] Setup UI auto-hide after inactivity
     */
    _focusPlusSetupAutoHide() {
      // Add interaction listeners
      this.focusPlusInteractionHandler = this._focusPlusHandleInteraction;
      document.addEventListener('mousemove', this.focusPlusInteractionHandler);
      document.addEventListener('keydown', this.focusPlusInteractionHandler);
      document.addEventListener('click', this.focusPlusInteractionHandler);
      document.addEventListener('touchstart', this.focusPlusInteractionHandler);
      
      // Start auto-hide timer
      this._focusPlusResetAutoHideTimer();
    }

    /**
     * [Focus Mode Add-on] Handle user interaction - reset auto-hide timer
     */
    _focusPlusHandleInteraction() {
      // Show trigger if it was dimmed
      const trigger = document.querySelector('.liquid-trigger');
      if (trigger) {
        trigger.classList.remove('focus-auto-dim');
      }
      
      // Reset the auto-hide timer
      this._focusPlusResetAutoHideTimer();
    }

    /**
     * [Focus Mode Add-on] Reset the auto-hide timer
     */
    _focusPlusResetAutoHideTimer() {
      // Clear existing timer
      if (this.focusPlusAutoHideTimer) {
        clearTimeout(this.focusPlusAutoHideTimer);
      }
      
      // Start new timer
      this.focusPlusAutoHideTimer = setTimeout(() => {
        if (!this.focusPlusEnabled) return;
        
        const trigger = document.querySelector('.liquid-trigger');
        const chat = document.querySelector('.liquid-chat');
        
        // Only dim if chat is not open
        if (trigger && (!chat || !chat.classList.contains('is-open'))) {
          trigger.classList.add('focus-auto-dim');
        }
      }, this.focusPlusAutoHideDelay);
    }

    /**
     * [Focus Mode Add-on] Cleanup auto-hide feature
     */
    _focusPlusCleanupAutoHide() {
      // Clear timer
      if (this.focusPlusAutoHideTimer) {
        clearTimeout(this.focusPlusAutoHideTimer);
        this.focusPlusAutoHideTimer = null;
      }
      
      // Remove listeners
      if (this.focusPlusInteractionHandler) {
        document.removeEventListener('mousemove', this.focusPlusInteractionHandler);
        document.removeEventListener('keydown', this.focusPlusInteractionHandler);
        document.removeEventListener('click', this.focusPlusInteractionHandler);
        document.removeEventListener('touchstart', this.focusPlusInteractionHandler);
        this.focusPlusInteractionHandler = null;
      }
      
      // Remove auto-dim class
      const trigger = document.querySelector('.liquid-trigger');
      if (trigger) {
        trigger.classList.remove('focus-auto-dim');
      }
    }

    /**
     * [Focus Mode Add-on] Setup scroll indicator
     */
    _focusPlusSetupScrollIndicator() {
      // Create scroll indicator element
      const indicator = document.createElement('div');
      indicator.className = 'focus-scroll-indicator';
      document.body.appendChild(indicator);
      this.focusPlusElements.scrollIndicator = indicator;
      
      // Add scroll listener
      this.focusPlusScrollHandler = this._focusPlusHandleScroll;
      window.addEventListener('scroll', this.focusPlusScrollHandler, { passive: true });
      
      // Initial check
      this._focusPlusHandleScroll();
    }

    /**
     * [Focus Mode Add-on] Handle scroll - update indicator visibility
     */
    _focusPlusHandleScroll() {
      const indicator = this.focusPlusElements?.scrollIndicator;
      if (!indicator) return;
      
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      
      // Show indicator if there's more content below (with 50px threshold)
      const hasMoreContent = scrollTop + clientHeight < scrollHeight - 50;
      
      if (hasMoreContent) {
        indicator.classList.add('is-visible');
      } else {
        indicator.classList.remove('is-visible');
      }
    }

    /**
     * [Focus Mode Add-on] Cleanup scroll indicator
     */
    _focusPlusCleanupScrollIndicator() {
      // Remove scroll listener
      if (this.focusPlusScrollHandler) {
        window.removeEventListener('scroll', this.focusPlusScrollHandler);
        this.focusPlusScrollHandler = null;
      }
      
      // Remove indicator element
      if (this.focusPlusElements.scrollIndicator) {
        this.focusPlusElements.scrollIndicator.remove();
        this.focusPlusElements.scrollIndicator = null;
      }
    }

    /**
     * Destroy the addon and clean up
     */
    focusPlusDestroy() {
      this._focusPlusOnDeactivate();
      
      // Remove elements
      if (this.focusPlusElements.toggleBtn) {
        this.focusPlusElements.toggleBtn.remove();
      }
      if (this.focusPlusElements.panel) {
        this.focusPlusElements.panel.remove();
      }
      
      // Remove injected styles
      const style = document.getElementById('ghost-focus-plus-styles');
      if (style) {
        style.remove();
      }
      
      this.focusPlusStylesInjected = false;
      console.log('[FocusPlus Addon] Destroyed');
    }
  }

  // Global FocusPlus addon instance
  const focusPlusAddon = new FocusPlusAddon();

  // ============================================
  // Ghost Auth Service (Account Login/Registration)
  // ============================================
  // [Account Add-on] Lightweight authentication layer for optional account features.
  // All keys are namespaced with 'ghost_auth_' to avoid conflicts with existing storage.
  // This is purely ADDITIVE - no existing functionality is modified.
  
  const GHOST_AUTH_STORAGE_KEYS = {
    users: 'ghost_auth_users',           // { username: { passwordHash: "..." } }
    session: 'ghost_auth_session',       // { currentUser: "username" | null }
    userSettings: 'ghost_user_settings'  // { username: { ...settings } }
  };

  /**
   * SHA-256 hash helper using Web Crypto API
   * @param {string} message - Plain text to hash
   * @returns {Promise<string>} - Hex-encoded hash
   */
  async function ghostAuthHashPassword(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Ghost Auth Service - Handles user authentication
   * Uses chrome.storage.local with namespaced keys
   */
  class GhostAuthService {
    constructor() {
      this.currentUser = null;
      this.onAuthStateChange = null; // Callback when auth state changes
    }

    /**
     * Initialize auth service and check for existing session
     * @returns {Promise<string|null>} - Current username if logged in
     */
    async init() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          return new Promise((resolve) => {
            chrome.storage.local.get([GHOST_AUTH_STORAGE_KEYS.session], (result) => {
              const session = result[GHOST_AUTH_STORAGE_KEYS.session];
              if (session && session.currentUser) {
                this.currentUser = session.currentUser;
                console.log('[GhostAuth] Session restored:', this.currentUser);
              }
              resolve(this.currentUser);
            });
          });
        }
      } catch (e) {
        console.warn('[GhostAuth] Could not init auth:', e);
      }
      return null;
    }

    /**
     * Get all registered users
     * @returns {Promise<Object>} - Users object { username: { passwordHash } }
     */
    async _getUsers() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([GHOST_AUTH_STORAGE_KEYS.users], (result) => {
            resolve(result[GHOST_AUTH_STORAGE_KEYS.users] || {});
          });
        } else {
          resolve({});
        }
      });
    }

    /**
     * Save users object
     * @param {Object} users - Users object
     */
    async _saveUsers(users) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [GHOST_AUTH_STORAGE_KEYS.users]: users }, resolve);
        });
      }
    }

    /**
     * Save session
     * @param {string|null} username - Username or null to clear
     */
    async _saveSession(username) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ 
            [GHOST_AUTH_STORAGE_KEYS.session]: { currentUser: username } 
          }, resolve);
        });
      }
    }

    /**
     * Login or Register user
     * If username doesn't exist -> creates user
     * If exists -> verifies password
     * @param {string} username - Username
     * @param {string} password - Plain text password
     * @returns {Promise<{success: boolean, error?: string, isNewUser?: boolean}>}
     */
    async loginOrRegister(username, password) {
      if (!username || !password) {
        return { success: false, error: 'Username and password required' };
      }

      username = username.trim().toLowerCase();
      if (username.length < 2) {
        return { success: false, error: 'Username too short' };
      }
      if (password.length < 4) {
        return { success: false, error: 'Password too short' };
      }

      try {
        const users = await this._getUsers();
        const passwordHash = await ghostAuthHashPassword(password);

        // ============================================
        // [SUPABASE INTEGRATION - ADDITIVE]
        // Try Supabase auth first if available, then sync with local storage
        // ============================================
        let supabaseResult = null;
        if (typeof supabaseUserService !== 'undefined' && supabaseUserService.isAvailable()) {
          console.log('[GhostAuth] Attempting Supabase auth for:', username);
          supabaseResult = await supabaseUserService.loginOrRegister(username, passwordHash);
          
          if (supabaseResult.success) {
            console.log('[GhostAuth] Supabase auth successful, syncing local storage');
            // Sync local storage with Supabase (ensures local and remote are in sync)
            if (!users[username]) {
              users[username] = { passwordHash, createdAt: Date.now() };
              await this._saveUsers(users);
            }
            this.currentUser = username;
            await this._saveSession(username);
            if (this.onAuthStateChange) this.onAuthStateChange(username);
            return { success: true, isNewUser: supabaseResult.isNewUser };
          } else if (supabaseResult.error === 'Wrong password') {
            // Supabase says wrong password - trust Supabase over local
            return { success: false, error: 'Wrong password' };
          }
          // If Supabase failed for other reasons, fall through to local auth
          console.log('[GhostAuth] Supabase unavailable, using local auth');
        }
        // ============================================
        // [END SUPABASE INTEGRATION]
        // ============================================

        if (users[username]) {
          // User exists - verify password
          if (users[username].passwordHash === passwordHash) {
            this.currentUser = username;
            await this._saveSession(username);
            console.log('[GhostAuth] Login successful:', username);
            if (this.onAuthStateChange) this.onAuthStateChange(username);
            return { success: true, isNewUser: false };
          } else {
            return { success: false, error: 'Wrong password' };
          }
        } else {
          // New user - create account
          users[username] = { passwordHash, createdAt: Date.now() };
          await this._saveUsers(users);
          this.currentUser = username;
          await this._saveSession(username);
          console.log('[GhostAuth] Account created:', username);
          if (this.onAuthStateChange) this.onAuthStateChange(username);
          return { success: true, isNewUser: true };
        }
      } catch (e) {
        console.error('[GhostAuth] Auth error:', e);
        return { success: false, error: 'Authentication failed' };
      }
    }

    /**
     * Logout current user
     */
    async logout() {
      const prevUser = this.currentUser;
      this.currentUser = null;
      await this._saveSession(null);
      console.log('[GhostAuth] Logged out:', prevUser);
      if (this.onAuthStateChange) this.onAuthStateChange(null);
    }

    /**
     * Get current logged in user
     * @returns {string|null}
     */
    getCurrentUser() {
      return this.currentUser;
    }

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
      return this.currentUser !== null;
    }
  }

  /**
   * Ghost User Settings Service - Handles per-user settings storage
   * Settings are stored separately from auth and are user-specific
   */
  class GhostUserSettingsService {
    /**
     * Get settings for a specific user
     * @param {string} username - Username
     * @returns {Promise<Object|null>} - User settings or null
     */
    async getUserSettings(username) {
      if (!username) return null;
      
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([GHOST_AUTH_STORAGE_KEYS.userSettings], (result) => {
            const allSettings = result[GHOST_AUTH_STORAGE_KEYS.userSettings] || {};
            resolve(allSettings[username] || null);
          });
        } else {
          resolve(null);
        }
      });
    }

    /**
     * Save settings for a specific user
     * @param {string} username - Username
     * @param {Object} settings - Settings object to save
     */
    async saveUserSettings(username, settings) {
      if (!username) return;

      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([GHOST_AUTH_STORAGE_KEYS.userSettings], (result) => {
            const allSettings = result[GHOST_AUTH_STORAGE_KEYS.userSettings] || {};
            allSettings[username] = {
              ...settings,
              updatedAt: Date.now()
            };
            chrome.storage.local.set({ 
              [GHOST_AUTH_STORAGE_KEYS.userSettings]: allSettings 
            }, () => {
              console.log('[GhostUserSettings] Saved settings for:', username);
              resolve();
            });
          });
        } else {
          resolve();
        }
      });
    }

    /**
     * Delete settings for a user
     * @param {string} username - Username
     */
    async deleteUserSettings(username) {
      if (!username) return;

      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([GHOST_AUTH_STORAGE_KEYS.userSettings], (result) => {
            const allSettings = result[GHOST_AUTH_STORAGE_KEYS.userSettings] || {};
            delete allSettings[username];
            chrome.storage.local.set({ 
              [GHOST_AUTH_STORAGE_KEYS.userSettings]: allSettings 
            }, resolve);
          });
        } else {
          resolve();
        }
      });
    }
  }

  // Global auth and settings service instances
  const ghostAuthService = new GhostAuthService();
  const ghostUserSettingsService = new GhostUserSettingsService();

  // ============================================
  // Focus Personalization Add-on (Page Personalization)
  // ============================================
  // [Focus Mode Add-on] This addon extends the existing Focus Mode without modifying any original code.
  // All state uses the 'focusPersonalization' prefix to avoid conflicts.
  // Activation is triggered by observing the existing isFocusMode state.
  // The personalization bar appears ONLY when Focus Mode is active.
  
  class FocusPersonalizationAddon {
    constructor() {
      // FocusPersonalization-specific state (prefixed to avoid conflicts)
      this.focusPersonalizationEnabled = false;
      this.isPagePersonalizationOpen = false;
      this.focusPersonalizationElements = {};
      this.focusPersonalizationStylesInjected = false;
      this.focusPersonalizationChatbotRef = null;
      
      // ============================================
      // Page Personalization Feature States
      // ============================================
      // These states control the 5 page personalization features.
      // All features are only active when Focus Mode is enabled.
      // Settings persist when menu is closed, reset when Focus Mode is deactivated.
      
      // 1. Font Size (Slider) - Percentage value (80-150), default 100
      this.personalizationFontSize = 100;
      
      // 2. Contrast Enhancement (Toggle) - Boolean, default false
      this.personalizationContrast = false;
      
      // 3. Page Brightness (Slider) - Percentage value (50-150), default 100
      this.personalizationBrightness = 100;
      
      // 4. Line Height (Slider) - Multiplier value (1.0-2.5), default 1.5
      this.personalizationLineHeight = 1.5;
      
      // 5. Reduce Animations (Toggle) - Boolean, default false
      this.personalizationReduceAnimations = false;
      
      // ============================================
      // [SUPABASE SETTINGS SYNC – FIX ALL FIELDS]
      // 6. Highlight Mode - Boolean, default false
      // Required for Supabase userx_settings.highlight_mode column
      // ============================================
      this.personalizationHighlightMode = false;
      
      // ============================================
      // Independent Mode Flag (Focus-Mode Decoupling)
      // ============================================
      // When true, Page-Personalization works independently of Focus-Mode.
      // This flag bypasses the Focus-Mode requirement additively.
      // Setting this to true means:
      //   - Features work with or without Focus-Mode
      //   - Deactivating Focus-Mode does NOT reset personalization settings
      //   - CSS effects apply regardless of ghost-focus-mode-active class
      this.personalizationIndependentMode = true;
      
      // ============================================
      // Menu Position & Drag State (Floating Panel)
      // ============================================
      // These states control the draggable floating panel behavior.
      // Menu floats above the chatbot and can be repositioned by dragging.
      
      // Stored position for the menu (null = centered default)
      this.personalizationMenuPosition = null; // { x: number, y: number }
      
      // Drag operation state
      this.personalizationMenuDragging = false;
      this.personalizationMenuDragOffset = { x: 0, y: 0 };
      
      // Bind methods
      this._focusPersonalizationInjectStyles = this._focusPersonalizationInjectStyles.bind(this);
      this._focusPersonalizationOnActivate = this._focusPersonalizationOnActivate.bind(this);
      this._focusPersonalizationOnDeactivate = this._focusPersonalizationOnDeactivate.bind(this);
      this._focusPersonalizationToggleMenu = this._focusPersonalizationToggleMenu.bind(this);
      this._focusPersonalizationCloseMenu = this._focusPersonalizationCloseMenu.bind(this);
      this._focusPersonalizationApplySettings = this._focusPersonalizationApplySettings.bind(this);
      this._focusPersonalizationResetSettings = this._focusPersonalizationResetSettings.bind(this);
      
      // Bind drag handlers (Floating Panel Add-on)
      this._focusPersonalizationDragStart = this._focusPersonalizationDragStart.bind(this);
      this._focusPersonalizationDragMove = this._focusPersonalizationDragMove.bind(this);
      this._focusPersonalizationDragEnd = this._focusPersonalizationDragEnd.bind(this);
    }

    /**
     * Initialize the addon and connect to the chatbot instance
     * @param {Chatbot} chatbotInstance - Reference to the main chatbot
     */
    focusPersonalizationInit(chatbotInstance) {
      this.focusPersonalizationChatbotRef = chatbotInstance;
      this._focusPersonalizationInjectStyles();
      this._focusPersonalizationCreateBar();
      this._focusPersonalizationCreateMenu();
      
      // Insert bar immediately into the chat UI (always visible, independent of Focus Mode)
      this._focusPersonalizationInsertBar();
      
      // [GhostAccount Integration] Initialize auth and check session
      this._ghostAccountInitAuth();
      
      console.log('[FocusPersonalization Addon] Initialized');
    }
    
    /**
     * Initialize ghost account auth service and restore session
     * Called during addon initialization
     */
    async _ghostAccountInitAuth() {
      try {
        // Initialize auth service and get current user
        const currentUser = await ghostAuthService.init();
        
        if (currentUser) {
          // User has an active session - update UI and load their settings
          this._ghostAccountUpdateUI(currentUser);
          await this._ghostAccountLoadUserSettings();
          console.log('[GhostAccount] Session restored, settings loaded for:', currentUser);
        } else {
          // No active session - ensure UI shows logged-out state
          this._ghostAccountUpdateUI(null);
          console.log('[GhostAccount] No active session');
        }
      } catch (e) {
        console.warn('[GhostAccount] Init error:', e);
        // Fail silently - extension works without auth
        this._ghostAccountUpdateUI(null);
      }
    }
    
    /**
     * Insert the personalization bar into the chat UI
     * Bar is always visible, positioned below the Focus Mode bar
     */
    _focusPersonalizationInsertBar() {
      const chatElement = document.querySelector('.liquid-chat');
      const focusModeBar = chatElement?.querySelector('.liquid-focus-mode-bar');
      
      if (chatElement && focusModeBar && this.focusPersonalizationElements.bar) {
        // Insert the personalization bar after the focus mode bar
        if (!this.focusPersonalizationElements.bar.parentElement) {
          focusModeBar.insertAdjacentElement('afterend', this.focusPersonalizationElements.bar);
        }
      }
      
      this.focusPersonalizationEnabled = true;
    }

    /**
     * Inject FocusPersonalization-specific CSS styles
     * These styles are additive and don't override existing styles
     */
    _focusPersonalizationInjectStyles() {
      if (this.focusPersonalizationStylesInjected) return;
      
      const styleId = 'ghost-focus-personalization-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* ============================================
           FocusPersonalization Add-on Styles
           All classes prefixed with 'focus-personalization-' to avoid conflicts
           [Focus Mode Add-on] Page Personalization Bar & Menu
           ============================================ */
        
        /* Page Personalization Bar - always visible below Focus Mode bar */
        .focus-personalization-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: calc(100% - 40px);
          margin: 0 20px 16px 20px;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(22, 27, 34, 0.6);
          cursor: pointer;
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateY(0);
          transition: 
            opacity 0.25s ease,
            visibility 0.25s ease,
            transform 0.25s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }
        
        .focus-personalization-bar.is-visible {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateY(0);
        }
        
        .focus-personalization-bar:hover {
          background: rgba(33, 38, 45, 0.8);
          border-color: rgba(88, 166, 255, 0.25);
        }
        
        .focus-personalization-bar:active {
          transform: scale(0.99);
        }
        
        .focus-personalization-bar-icon {
          width: 14px;
          height: 14px;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .focus-personalization-bar-icon svg {
          width: 14px;
          height: 14px;
          fill: rgba(255, 255, 255, 0.5);
          transition: fill 0.2s ease;
        }
        
        .focus-personalization-bar:hover .focus-personalization-bar-icon svg {
          fill: rgba(88, 166, 255, 0.9);
        }
        
        .focus-personalization-bar-label {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.2px;
          transition: color 0.2s ease;
        }
        
        .focus-personalization-bar:hover .focus-personalization-bar-label {
          color: rgba(255, 255, 255, 0.8);
        }
        
        /* Page Personalization Menu - overlay panel */
        .focus-personalization-menu {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.95);
          width: 420px;
          max-width: calc(100vw - 48px);
          min-height: 300px;
          max-height: calc(100vh - 120px);
          background: rgba(22, 22, 24, 0.98);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          box-shadow: 
            0 24px 80px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          z-index: 2147483648;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: 
            opacity 0.3s ease,
            visibility 0.3s ease,
            transform 0.3s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .focus-personalization-menu.is-open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translate(-50%, -50%) scale(1);
        }
        
        /* Menu Header - Drag Handle */
        .focus-personalization-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }
        
        .focus-personalization-menu-header:active {
          cursor: grabbing;
        }
        
        /* Prevent text selection during drag */
        .focus-personalization-menu.is-dragging {
          user-select: none;
          -webkit-user-select: none;
        }
        
        .focus-personalization-menu.is-dragging .focus-personalization-menu-header {
          cursor: grabbing;
        }
        
        /* Custom positioned state (overrides center transform) */
        .focus-personalization-menu.has-custom-position {
          transform: none !important;
          top: auto !important;
          left: auto !important;
        }
        
        .focus-personalization-menu.has-custom-position.is-open {
          transform: none !important;
        }
        
        .focus-personalization-menu-title {
          font-size: 16px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .focus-personalization-menu-title-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .focus-personalization-menu-title-icon svg {
          width: 20px;
          height: 20px;
          fill: rgba(88, 166, 255, 0.9);
        }
        
        .focus-personalization-menu-close {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        
        .focus-personalization-menu-close:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        
        .focus-personalization-menu-close:active {
          transform: scale(0.95);
        }
        
        .focus-personalization-menu-close svg {
          width: 16px;
          height: 16px;
          fill: rgba(255, 255, 255, 0.6);
          transition: fill 0.2s ease;
        }
        
        .focus-personalization-menu-close:hover svg {
          fill: rgba(255, 255, 255, 0.9);
        }
        
        /* Menu Content - Controls Container */
        .focus-personalization-menu-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
        }
        
        .focus-personalization-placeholder {
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .focus-personalization-placeholder-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          background: rgba(88, 166, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .focus-personalization-placeholder-icon svg {
          width: 24px;
          height: 24px;
          fill: rgba(88, 166, 255, 0.6);
        }
        
        .focus-personalization-placeholder-text {
          font-size: 14px;
          line-height: 1.5;
          max-width: 280px;
        }
        
        /* Menu Backdrop */
        .focus-personalization-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 2147483644;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        
        .focus-personalization-backdrop.is-visible {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }
        
        /* ============================================
           Floating Panel Layering (Add-on)
           ============================================
           Ensures menu floats above chatbot while
           chatbot remains functional and accessible.
           ============================================ */
        
        /* Menu stays at highest z-index */
        .focus-personalization-menu {
          z-index: 2147483650 !important;
        }
        
        /* Chatbot stays above backdrop but below menu */
        .liquid-chat {
          z-index: 2147483646 !important;
        }
        
        /* Backdrop below chatbot - allows chatbot interaction */
        .focus-personalization-backdrop {
          z-index: 2147483644 !important;
        }
        
        /* Responsive adjustments */
        @media (max-width: 480px) {
          .focus-personalization-menu {
            width: calc(100vw - 32px);
            min-height: 250px;
            max-height: calc(100vh - 80px);
          }
        }
        
        /* ============================================
           Page Personalization Feature Styles
           ============================================
           These styles implement the 5 page personalization features.
           All classes use 'focus-personalization-' prefix.
           Effects only apply when Focus Mode is active (via body class).
           ============================================ */
        
        /* --- 1. Font Size Feature --- */
        /* Custom property for font size scaling */
        html.focus-personalization-font-size-active {
          --focus-personalization-font-scale: 1;
        }
        
        /* Apply font size to page content (not extension UI) */
        body.ghost-focus-mode-active.focus-personalization-font-size-active {
          font-size: calc(1rem * var(--focus-personalization-font-scale, 1)) !important;
        }
        
        body.ghost-focus-mode-active.focus-personalization-font-size-active main,
        body.ghost-focus-mode-active.focus-personalization-font-size-active article,
        body.ghost-focus-mode-active.focus-personalization-font-size-active section,
        body.ghost-focus-mode-active.focus-personalization-font-size-active p,
        body.ghost-focus-mode-active.focus-personalization-font-size-active h1,
        body.ghost-focus-mode-active.focus-personalization-font-size-active h2,
        body.ghost-focus-mode-active.focus-personalization-font-size-active h3,
        body.ghost-focus-mode-active.focus-personalization-font-size-active h4,
        body.ghost-focus-mode-active.focus-personalization-font-size-active h5,
        body.ghost-focus-mode-active.focus-personalization-font-size-active h6,
        body.ghost-focus-mode-active.focus-personalization-font-size-active li,
        body.ghost-focus-mode-active.focus-personalization-font-size-active span,
        body.ghost-focus-mode-active.focus-personalization-font-size-active div {
          font-size: calc(1em * var(--focus-personalization-font-scale, 1));
        }
        
        /* Exclude extension UI from font size changes */
        .liquid-chat,
        .liquid-chat *,
        .focus-personalization-menu,
        .focus-personalization-menu *,
        .focus-personalization-bar,
        .focus-personalization-bar * {
          font-size: revert !important;
        }
        
        /* --- 2. Contrast Enhancement Feature --- */
        /* Apply contrast via overlay to avoid breaking z-index stacking */
        body.ghost-focus-mode-active.focus-personalization-contrast-active::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: transparent;
          pointer-events: none;
          z-index: 2147483643;
          mix-blend-mode: overlay;
          background-color: rgba(128, 128, 128, 0.15);
        }
        
        /* Apply actual contrast to page content elements only */
        body.ghost-focus-mode-active.focus-personalization-contrast-active > *:not(.liquid-chat):not(.focus-personalization-menu):not(.focus-personalization-backdrop):not(script):not(style) {
          filter: contrast(1.2) saturate(1.1);
        }
        
        /* --- 3. Page Brightness Feature --- */
        /* Custom property for brightness value */
        html.focus-personalization-brightness-active {
          --focus-personalization-brightness: 1;
        }
        
        /* Apply brightness filter via overlay on page */
        body.ghost-focus-mode-active.focus-personalization-brightness-active::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, calc((1 - var(--focus-personalization-brightness, 1)) * 0.6));
          pointer-events: none;
          z-index: 2147483640;
          transition: background 0.2s ease;
        }
        
        /* Bright mode (brightness > 1) uses white overlay */
        body.ghost-focus-mode-active.focus-personalization-brightness-bright::before {
          background: rgba(255, 255, 255, calc((var(--focus-personalization-brightness, 1) - 1) * 0.4));
        }
        
        /* Ensure extension UI stays above brightness overlay */
        .liquid-chat {
          z-index: 2147483646 !important;
        }
        
        /* Menu floats above chatbot */
        .focus-personalization-menu {
          z-index: 2147483650 !important;
        }
        
        .focus-personalization-backdrop {
          z-index: 2147483644 !important;
        }
        
        /* --- 4. Line Height Feature --- */
        /* Custom property for line height */
        html.focus-personalization-line-height-active {
          --focus-personalization-line-height: 1.5;
        }
        
        /* Apply line height to main content areas only */
        body.ghost-focus-mode-active.focus-personalization-line-height-active main,
        body.ghost-focus-mode-active.focus-personalization-line-height-active article,
        body.ghost-focus-mode-active.focus-personalization-line-height-active section,
        body.ghost-focus-mode-active.focus-personalization-line-height-active p,
        body.ghost-focus-mode-active.focus-personalization-line-height-active li,
        body.ghost-focus-mode-active.focus-personalization-line-height-active td,
        body.ghost-focus-mode-active.focus-personalization-line-height-active th {
          line-height: var(--focus-personalization-line-height, 1.5) !important;
        }
        
        /* Fallback: apply to body if no semantic containers */
        body.ghost-focus-mode-active.focus-personalization-line-height-active {
          line-height: var(--focus-personalization-line-height, 1.5);
        }
        
        /* --- 5. Reduce Animations Feature --- */
        /* Reduce animations and transitions across the page */
        body.ghost-focus-mode-active.focus-personalization-reduce-animations-active,
        body.ghost-focus-mode-active.focus-personalization-reduce-animations-active * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
        
        /* Preserve essential extension UI animations */
        body.ghost-focus-mode-active.focus-personalization-reduce-animations-active .liquid-chat,
        body.ghost-focus-mode-active.focus-personalization-reduce-animations-active .liquid-chat *,
        body.ghost-focus-mode-active.focus-personalization-reduce-animations-active .focus-personalization-menu,
        body.ghost-focus-mode-active.focus-personalization-reduce-animations-active .focus-personalization-menu *,
        body.ghost-focus-mode-active.focus-personalization-reduce-animations-active .focus-personalization-bar,
        body.ghost-focus-mode-active.focus-personalization-reduce-animations-active .focus-personalization-backdrop {
          animation-duration: revert !important;
          animation-iteration-count: revert !important;
          transition-duration: revert !important;
        }
        
        /* ============================================
           INDEPENDENT MODE - Focus-Mode Decoupled Rules
           ============================================
           These CSS rules are ADDITIVE duplicates that work WITHOUT
           requiring the ghost-focus-mode-active class.
           This enables Page-Personalization to work independently of Focus-Mode.
           Original rules above are preserved and still work when Focus-Mode is active.
           ============================================ */
        
        /* --- 1. Font Size (Independent) --- */
        body.focus-personalization-font-size-active {
          font-size: calc(1rem * var(--focus-personalization-font-scale, 1)) !important;
        }
        
        body.focus-personalization-font-size-active main,
        body.focus-personalization-font-size-active article,
        body.focus-personalization-font-size-active section,
        body.focus-personalization-font-size-active p,
        body.focus-personalization-font-size-active h1,
        body.focus-personalization-font-size-active h2,
        body.focus-personalization-font-size-active h3,
        body.focus-personalization-font-size-active h4,
        body.focus-personalization-font-size-active h5,
        body.focus-personalization-font-size-active h6,
        body.focus-personalization-font-size-active li,
        body.focus-personalization-font-size-active span,
        body.focus-personalization-font-size-active div {
          font-size: calc(1em * var(--focus-personalization-font-scale, 1));
        }
        
        /* --- 2. Contrast Enhancement (Independent) --- */
        /* Apply contrast via overlay to avoid breaking z-index stacking */
        body.focus-personalization-contrast-active::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: transparent;
          pointer-events: none;
          z-index: 2147483643;
          mix-blend-mode: overlay;
          background-color: rgba(128, 128, 128, 0.15);
        }
        
        /* Apply actual contrast to page content elements only */
        body.focus-personalization-contrast-active > *:not(.liquid-chat):not(.focus-personalization-menu):not(.focus-personalization-backdrop):not(script):not(style) {
          filter: contrast(1.2) saturate(1.1);
        }
        
        /* --- 3. Page Brightness (Independent) --- */
        body.focus-personalization-brightness-active::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, calc((1 - var(--focus-personalization-brightness, 1)) * 0.6));
          pointer-events: none;
          z-index: 2147483640;
          transition: background 0.2s ease;
        }
        
        body.focus-personalization-brightness-bright::before {
          background: rgba(255, 255, 255, calc((var(--focus-personalization-brightness, 1) - 1) * 0.4));
        }
        
        /* --- 4. Line Height (Independent) --- */
        body.focus-personalization-line-height-active main,
        body.focus-personalization-line-height-active article,
        body.focus-personalization-line-height-active section,
        body.focus-personalization-line-height-active p,
        body.focus-personalization-line-height-active li,
        body.focus-personalization-line-height-active td,
        body.focus-personalization-line-height-active th {
          line-height: var(--focus-personalization-line-height, 1.5) !important;
        }
        
        body.focus-personalization-line-height-active {
          line-height: var(--focus-personalization-line-height, 1.5);
        }
        
        /* --- 5. Reduce Animations (Independent) --- */
        body.focus-personalization-reduce-animations-active,
        body.focus-personalization-reduce-animations-active * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
        
        /* Preserve extension UI animations (Independent) */
        body.focus-personalization-reduce-animations-active .liquid-chat,
        body.focus-personalization-reduce-animations-active .liquid-chat *,
        body.focus-personalization-reduce-animations-active .focus-personalization-menu,
        body.focus-personalization-reduce-animations-active .focus-personalization-menu *,
        body.focus-personalization-reduce-animations-active .focus-personalization-bar,
        body.focus-personalization-reduce-animations-active .focus-personalization-backdrop {
          animation-duration: revert !important;
          animation-iteration-count: revert !important;
          transition-duration: revert !important;
        }
        
        /* ============================================
           Menu Control Styles
           ============================================ */
        
        /* Control group container */
        .focus-personalization-controls {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }
        
        /* Individual control item */
        .focus-personalization-control {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        
        .focus-personalization-control:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        .focus-personalization-control.is-active {
          border-color: rgba(88, 166, 255, 0.3);
          background: rgba(88, 166, 255, 0.05);
        }
        
        /* Control header with label and value/toggle */
        .focus-personalization-control-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        
        .focus-personalization-control-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .focus-personalization-control-icon {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
        }
        
        .focus-personalization-control-icon svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
          color: rgba(88, 166, 255, 0.9);
        }
        
        .focus-personalization-control-value {
          font-size: 13px;
          font-weight: 500;
          color: rgba(88, 166, 255, 0.9);
          min-width: 48px;
          text-align: right;
        }
        
        /* Toggle switch */
        .focus-personalization-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }
        
        .focus-personalization-toggle::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        
        .focus-personalization-toggle.is-active {
          background: rgba(88, 166, 255, 0.8);
        }
        
        .focus-personalization-toggle.is-active::after {
          transform: translateX(20px);
          background: #fff;
        }
        
        .focus-personalization-toggle:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .focus-personalization-toggle.is-active:hover {
          background: rgba(88, 166, 255, 0.9);
        }
        
        /* Slider input */
        .focus-personalization-slider-container {
          width: 100%;
          padding-top: 4px;
        }
        
        .focus-personalization-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }
        
        .focus-personalization-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: rgba(88, 166, 255, 0.9);
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .focus-personalization-slider::-webkit-slider-thumb:hover {
          background: rgba(88, 166, 255, 1);
          transform: scale(1.1);
        }
        
        .focus-personalization-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: rgba(88, 166, 255, 0.9);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .focus-personalization-slider::-moz-range-thumb:hover {
          background: rgba(88, 166, 255, 1);
          transform: scale(1.1);
        }
        
        /* Control description */
        .focus-personalization-control-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          line-height: 1.4;
          margin-top: 2px;
        }
        
        /* Focus Mode required notice */
        .focus-personalization-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.2);
          border-radius: 10px;
          margin-bottom: 16px;
        }
        
        .focus-personalization-notice.is-hidden {
          opacity: 0;
          visibility: hidden;
          height: 0;
          padding: 0;
          margin: 0;
          overflow: hidden;
        }
        
        .focus-personalization-notice-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        
        .focus-personalization-notice-icon svg {
          width: 16px;
          height: 16px;
          fill: rgba(255, 193, 7, 0.9);
        }
        
        .focus-personalization-notice-text {
          font-size: 12px;
          color: rgba(255, 193, 7, 0.9);
          line-height: 1.4;
        }
        
        /* ============================================
           Ghost Account Section Styles (Additive)
           All classes prefixed with 'ghost-account-' to avoid conflicts
           ============================================ */
        
        .ghost-account-section {
          padding: 16px;
          background: rgba(30, 35, 42, 0.6);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 0;
        }
        
        .ghost-account-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        
        .ghost-account-icon {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .ghost-account-icon svg {
          width: 18px;
          height: 18px;
          stroke: rgba(88, 166, 255, 0.8);
        }
        
        .ghost-account-title {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
        }
        
        .ghost-account-title strong {
          color: rgba(88, 166, 255, 0.95);
          font-weight: 600;
        }
        
        .ghost-account-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .ghost-account-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(22, 27, 34, 0.8);
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s ease, background 0.2s ease;
          box-sizing: border-box;
        }
        
        .ghost-account-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        
        .ghost-account-input:focus {
          border-color: rgba(88, 166, 255, 0.5);
          background: rgba(22, 27, 34, 0.95);
        }
        
        .ghost-account-btn {
          width: 100%;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(88, 166, 255, 0.8), rgba(88, 166, 255, 0.6));
          color: rgba(255, 255, 255, 0.95);
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease, opacity 0.2s ease;
        }
        
        .ghost-account-btn:hover {
          background: linear-gradient(135deg, rgba(88, 166, 255, 0.95), rgba(88, 166, 255, 0.75));
        }
        
        .ghost-account-btn:active {
          transform: scale(0.98);
        }
        
        .ghost-account-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .ghost-account-logout-btn {
          padding: 8px 14px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        
        .ghost-account-logout-btn:hover {
          background: rgba(255, 100, 100, 0.15);
          border-color: rgba(255, 100, 100, 0.3);
          color: rgba(255, 150, 150, 0.95);
        }
        
        .ghost-account-error {
          font-size: 12px;
          color: rgba(255, 100, 100, 0.9);
          padding: 0;
          min-height: 0;
          transition: all 0.2s ease;
        }
        
        .ghost-account-error:not(:empty) {
          padding: 8px 10px;
          background: rgba(255, 100, 100, 0.1);
          border-radius: 6px;
          margin-top: 4px;
        }
        
        .ghost-account-logged-in {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .ghost-account-logged-in .ghost-account-header {
          margin-bottom: 0;
        }
      `;
      
      document.head.appendChild(style);
      this.focusPersonalizationStylesInjected = true;
    }

    /**
     * Create the Page Personalization bar UI
     * Bar appears only when Focus Mode is active
     */
    _focusPersonalizationCreateBar() {
      const bar = document.createElement('button');
      bar.className = 'focus-personalization-bar';
      bar.setAttribute('aria-label', 'Open Page Personalization');
      bar.setAttribute('aria-expanded', 'false');
      bar.innerHTML = `
        <span class="focus-personalization-bar-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="focus-personalization-bar-label">Page Personalization</span>
      `;
      
      // Add click handler
      bar.addEventListener('click', this._focusPersonalizationToggleMenu);
      
      this.focusPersonalizationElements.bar = bar;
      
      // Insert into DOM (inside liquid-chat, after focus-mode-bar)
      // We'll append it when focus mode activates
    }

    /**
     * Create the Page Personalization menu UI
     * Menu is an overlay panel with close button
     */
    _focusPersonalizationCreateMenu() {
      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'focus-personalization-backdrop';
      backdrop.addEventListener('click', this._focusPersonalizationCloseMenu);
      
      // Create menu panel
      const menu = document.createElement('div');
      menu.className = 'focus-personalization-menu';
      menu.setAttribute('role', 'dialog');
      menu.setAttribute('aria-modal', 'true');
      menu.setAttribute('aria-label', 'Page Personalization Settings');
      menu.innerHTML = `
        <div class="focus-personalization-menu-header">
          <div class="focus-personalization-menu-title">
            <span class="focus-personalization-menu-title-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
            Page Personalization
          </div>
          <button class="focus-personalization-menu-close" aria-label="Close menu">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="focus-personalization-menu-content">
          <!-- Account Section (Additive Feature) -->
          <div class="ghost-account-section" id="ghost-account-section">
            <!-- Logged Out State -->
            <div class="ghost-account-logged-out" id="ghost-account-logged-out">
              <div class="ghost-account-header">
                <span class="ghost-account-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="ghost-account-title">Account</span>
              </div>
              <div class="ghost-account-form">
                <input type="text" class="ghost-account-input" id="ghost-account-username" placeholder="Username" autocomplete="username" spellcheck="false">
                <input type="password" class="ghost-account-input" id="ghost-account-password" placeholder="Password" autocomplete="current-password">
                <button class="ghost-account-btn" id="ghost-account-submit">Create / Sign in</button>
                <div class="ghost-account-error" id="ghost-account-error"></div>
              </div>
            </div>
            <!-- Logged In State -->
            <div class="ghost-account-logged-in" id="ghost-account-logged-in" style="display: none;">
              <div class="ghost-account-header">
                <span class="ghost-account-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="ghost-account-title">Logged in as <strong id="ghost-account-username-display"></strong></span>
              </div>
              <button class="ghost-account-logout-btn" id="ghost-account-logout">Logout</button>
            </div>
          </div>
          
          <!-- Focus Mode Required Notice -->
          <div class="focus-personalization-notice" id="focus-personalization-notice">
            <span class="focus-personalization-notice-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </span>
            <span class="focus-personalization-notice-text">Enable Focus Mode to activate these settings.</span>
          </div>
          
          <!-- Controls Container -->
          <div class="focus-personalization-controls">
            
            <!-- 1. Font Size Control (Slider) -->
            <div class="focus-personalization-control" data-control="fontSize">
              <div class="focus-personalization-control-header">
                <span class="focus-personalization-control-label">
                  <span class="focus-personalization-control-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/>
                    </svg>
                  </span>
                  Font Size
                </span>
                <span class="focus-personalization-control-value" id="fontSize-value">100%</span>
              </div>
              <div class="focus-personalization-slider-container">
                <input type="range" class="focus-personalization-slider" id="fontSize-slider" 
                       min="80" max="150" value="100" step="5" 
                       aria-label="Adjust font size">
              </div>
              <span class="focus-personalization-control-desc">Adjust the global text size of the page.</span>
            </div>
            
            <!-- 2. Contrast Enhancement Control (Toggle) -->
            <div class="focus-personalization-control" data-control="contrast">
              <div class="focus-personalization-control-header">
                <span class="focus-personalization-control-label">
                  <span class="focus-personalization-control-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18V4c4.41 0 8 3.59 8 8s-3.59 8-8 8z"/>
                    </svg>
                  </span>
                  Enhanced Contrast
                </span>
                <button class="focus-personalization-toggle" id="contrast-toggle" 
                        aria-label="Toggle enhanced contrast" aria-pressed="false">
                </button>
              </div>
              <span class="focus-personalization-control-desc">Increase text and background contrast for better readability.</span>
            </div>
            
            <!-- 3. Page Brightness Control (Slider) -->
            <div class="focus-personalization-control" data-control="brightness">
              <div class="focus-personalization-control-header">
                <span class="focus-personalization-control-label">
                  <span class="focus-personalization-control-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
                    </svg>
                  </span>
                  Page Brightness
                </span>
                <span class="focus-personalization-control-value" id="brightness-value">100%</span>
              </div>
              <div class="focus-personalization-slider-container">
                <input type="range" class="focus-personalization-slider" id="brightness-slider" 
                       min="50" max="150" value="100" step="5" 
                       aria-label="Adjust page brightness">
              </div>
              <span class="focus-personalization-control-desc">Dim or brighten the page for comfortable viewing.</span>
            </div>
            
            <!-- 4. Line Height Control (Slider) -->
            <div class="focus-personalization-control" data-control="lineHeight">
              <div class="focus-personalization-control-header">
                <span class="focus-personalization-control-label">
                  <span class="focus-personalization-control-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 7h2.5L5 3.5 1.5 7H4v10H1.5L5 20.5 8.5 17H6V7zm4-2v2h12V5H10zm0 14h12v-2H10v2zm0-6h12v-2H10v2z"/>
                    </svg>
                  </span>
                  Line Spacing
                </span>
                <span class="focus-personalization-control-value" id="lineHeight-value">1.5×</span>
              </div>
              <div class="focus-personalization-slider-container">
                <input type="range" class="focus-personalization-slider" id="lineHeight-slider" 
                       min="1.0" max="2.5" value="1.5" step="0.1" 
                       aria-label="Adjust line spacing">
              </div>
              <span class="focus-personalization-control-desc">Adjust spacing between lines for easier reading.</span>
            </div>
            
            <!-- 5. Reduce Animations Control (Toggle) -->
            <div class="focus-personalization-control" data-control="reduceAnimations">
              <div class="focus-personalization-control-header">
                <span class="focus-personalization-control-label">
                  <span class="focus-personalization-control-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
                    </svg>
                  </span>
                  Reduce Animations
                </span>
                <button class="focus-personalization-toggle" id="reduceAnimations-toggle" 
                        aria-label="Toggle reduce animations" aria-pressed="false">
                </button>
              </div>
              <span class="focus-personalization-control-desc">Minimize motion and transitions for reduced distractions.</span>
            </div>
            
          </div>
        </div>
      `;
      
      // Add close button handler
      const closeBtn = menu.querySelector('.focus-personalization-menu-close');
      closeBtn.addEventListener('click', this._focusPersonalizationCloseMenu);
      
      // Prevent clicks inside menu from closing it
      menu.addEventListener('click', (e) => e.stopPropagation());
      
      // ============================================
      // Drag Handler Setup (Floating Panel Add-on)
      // ============================================
      // Enable dragging via the header (drag handle)
      const header = menu.querySelector('.focus-personalization-menu-header');
      if (header) {
        header.addEventListener('pointerdown', this._focusPersonalizationDragStart);
        // Prevent drag on close button
        closeBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      }
      
      this.focusPersonalizationElements.backdrop = backdrop;
      this.focusPersonalizationElements.menu = menu;
      
      // ============================================
      // Setup Control Event Handlers
      // ============================================
      
      // Store control elements for later access
      this.focusPersonalizationElements.controls = {
        fontSizeSlider: menu.querySelector('#fontSize-slider'),
        fontSizeValue: menu.querySelector('#fontSize-value'),
        contrastToggle: menu.querySelector('#contrast-toggle'),
        brightnessSlider: menu.querySelector('#brightness-slider'),
        brightnessValue: menu.querySelector('#brightness-value'),
        lineHeightSlider: menu.querySelector('#lineHeight-slider'),
        lineHeightValue: menu.querySelector('#lineHeight-value'),
        reduceAnimationsToggle: menu.querySelector('#reduceAnimations-toggle'),
        notice: menu.querySelector('#focus-personalization-notice')
      };
      
      const controls = this.focusPersonalizationElements.controls;
      
      // 1. Font Size Slider Handler
      if (controls.fontSizeSlider) {
        controls.fontSizeSlider.addEventListener('input', (e) => {
          this.personalizationFontSize = parseInt(e.target.value, 10);
          if (controls.fontSizeValue) {
            controls.fontSizeValue.textContent = `${this.personalizationFontSize}%`;
          }
          this._focusPersonalizationApplySettings();
          this._focusPersonalizationUpdateControlStates();
        });
      }
      
      // 2. Contrast Toggle Handler
      if (controls.contrastToggle) {
        controls.contrastToggle.addEventListener('click', () => {
          this.personalizationContrast = !this.personalizationContrast;
          controls.contrastToggle.classList.toggle('is-active', this.personalizationContrast);
          controls.contrastToggle.setAttribute('aria-pressed', this.personalizationContrast ? 'true' : 'false');
          this._focusPersonalizationApplySettings();
          this._focusPersonalizationUpdateControlStates();
        });
      }
      
      // 3. Brightness Slider Handler
      if (controls.brightnessSlider) {
        controls.brightnessSlider.addEventListener('input', (e) => {
          this.personalizationBrightness = parseInt(e.target.value, 10);
          if (controls.brightnessValue) {
            controls.brightnessValue.textContent = `${this.personalizationBrightness}%`;
          }
          this._focusPersonalizationApplySettings();
          this._focusPersonalizationUpdateControlStates();
        });
      }
      
      // 4. Line Height Slider Handler
      if (controls.lineHeightSlider) {
        controls.lineHeightSlider.addEventListener('input', (e) => {
          this.personalizationLineHeight = parseFloat(e.target.value);
          if (controls.lineHeightValue) {
            controls.lineHeightValue.textContent = `${this.personalizationLineHeight.toFixed(1)}×`;
          }
          this._focusPersonalizationApplySettings();
          this._focusPersonalizationUpdateControlStates();
        });
      }
      
      // 5. Reduce Animations Toggle Handler
      if (controls.reduceAnimationsToggle) {
        controls.reduceAnimationsToggle.addEventListener('click', () => {
          this.personalizationReduceAnimations = !this.personalizationReduceAnimations;
          controls.reduceAnimationsToggle.classList.toggle('is-active', this.personalizationReduceAnimations);
          controls.reduceAnimationsToggle.setAttribute('aria-pressed', this.personalizationReduceAnimations ? 'true' : 'false');
          this._focusPersonalizationApplySettings();
          this._focusPersonalizationUpdateControlStates();
        });
      }
      
      // ============================================
      // Account Section Event Handlers (Additive)
      // ============================================
      
      // Store account elements
      this.focusPersonalizationElements.account = {
        section: menu.querySelector('#ghost-account-section'),
        loggedOutContainer: menu.querySelector('#ghost-account-logged-out'),
        loggedInContainer: menu.querySelector('#ghost-account-logged-in'),
        usernameInput: menu.querySelector('#ghost-account-username'),
        passwordInput: menu.querySelector('#ghost-account-password'),
        submitBtn: menu.querySelector('#ghost-account-submit'),
        errorDisplay: menu.querySelector('#ghost-account-error'),
        usernameDisplay: menu.querySelector('#ghost-account-username-display'),
        logoutBtn: menu.querySelector('#ghost-account-logout')
      };
      
      const account = this.focusPersonalizationElements.account;
      
      // Login/Register Submit Handler
      if (account.submitBtn) {
        account.submitBtn.addEventListener('click', async () => {
          const username = account.usernameInput?.value?.trim() || '';
          const password = account.passwordInput?.value || '';
          
          // Clear previous error
          if (account.errorDisplay) {
            account.errorDisplay.textContent = '';
          }
          
          // Disable button during operation
          account.submitBtn.disabled = true;
          account.submitBtn.textContent = 'Please wait...';
          
          try {
            const result = await ghostAuthService.loginOrRegister(username, password);
            
            if (result.success) {
              // Update UI
              this._ghostAccountUpdateUI(username);
              
              // Clear inputs
              if (account.usernameInput) account.usernameInput.value = '';
              if (account.passwordInput) account.passwordInput.value = '';
              
              // Load user settings if they exist, otherwise save current settings
              if (result.isNewUser) {
                // New user - save current settings as their default
                await this._ghostAccountSaveCurrentSettings();
              } else {
                // Existing user - load their saved settings
                await this._ghostAccountLoadUserSettings();
              }
            } else {
              // Show error
              if (account.errorDisplay) {
                account.errorDisplay.textContent = result.error || 'Authentication failed';
              }
            }
          } catch (e) {
            console.error('[GhostAccount] Submit error:', e);
            if (account.errorDisplay) {
              account.errorDisplay.textContent = 'An error occurred';
            }
          } finally {
            account.submitBtn.disabled = false;
            account.submitBtn.textContent = 'Create / Sign in';
          }
        });
      }
      
      // Enter key handler for inputs
      const handleEnterKey = (e) => {
        if (e.key === 'Enter' && account.submitBtn) {
          account.submitBtn.click();
        }
      };
      if (account.usernameInput) {
        account.usernameInput.addEventListener('keydown', handleEnterKey);
      }
      if (account.passwordInput) {
        account.passwordInput.addEventListener('keydown', handleEnterKey);
      }
      
      // Logout Handler
      if (account.logoutBtn) {
        account.logoutBtn.addEventListener('click', async () => {
          await ghostAuthService.logout();
          
          // ============================================
          // [SUPABASE INTEGRATION - ADDITIVE]
          // Also logout from Supabase service
          // ============================================
          if (typeof supabaseUserService !== 'undefined') {
            supabaseUserService.logout();
          }
          // ============================================
          // [END SUPABASE INTEGRATION]
          // ============================================
          
          this._ghostAccountUpdateUI(null);
          // Note: We do NOT reset personalization settings on logout
          // Current settings remain as anonymous session settings
        });
      }
      
      // Append to body
      document.body.appendChild(backdrop);
      document.body.appendChild(menu);
    }
    
    // ============================================
    // Ghost Account Helper Methods (Additive)
    // ============================================
    
    /**
     * Update account section UI based on auth state
     * @param {string|null} username - Logged in username or null
     */
    _ghostAccountUpdateUI(username) {
      const account = this.focusPersonalizationElements.account;
      if (!account) return;
      
      if (username) {
        // User is logged in
        if (account.loggedOutContainer) {
          account.loggedOutContainer.style.display = 'none';
        }
        if (account.loggedInContainer) {
          account.loggedInContainer.style.display = 'flex';
        }
        if (account.usernameDisplay) {
          account.usernameDisplay.textContent = username;
        }
        if (account.errorDisplay) {
          account.errorDisplay.textContent = '';
        }
      } else {
        // User is logged out
        if (account.loggedOutContainer) {
          account.loggedOutContainer.style.display = 'block';
        }
        if (account.loggedInContainer) {
          account.loggedInContainer.style.display = 'none';
        }
      }
    }
    
    /**
     * Save current personalization settings for the logged-in user
     * This mirrors the current settings to user-specific storage
     */
    async _ghostAccountSaveCurrentSettings() {
      const currentUser = ghostAuthService.getCurrentUser();
      if (!currentUser) return;
      
      // [SUPABASE SETTINGS SYNC – FIX ALL FIELDS]
      // Collect ALL settings into a single canonical object
      const settings = this._getCurrentPersonalisationSettings();
      
      // Save to local storage (existing behavior)
      await ghostUserSettingsService.saveUserSettings(currentUser, settings);
      console.log('[GhostAccount] Saved settings for user:', currentUser);
      
      // ============================================
      // [SUPABASE INTEGRATION - ADDITIVE]
      // Also persist settings to Supabase (best effort, non-blocking)
      // ============================================
      if (typeof supabaseUserService !== 'undefined' && supabaseUserService.isAvailable()) {
        supabaseUserService.saveUserSettings(currentUser, settings)
          .then(success => {
            if (success) {
              console.log('[GhostAccount] Settings synced to Supabase');
            }
          })
          .catch(e => {
            console.warn('[GhostAccount] Supabase sync failed (non-critical):', e.message);
          });
      }
      // ============================================
      // [END SUPABASE INTEGRATION]
      // ============================================
    }
    
    /**
     * Load personalization settings for the logged-in user
     * If user has saved settings, apply them; otherwise keep current settings
     */
    async _ghostAccountLoadUserSettings() {
      const currentUser = ghostAuthService.getCurrentUser();
      if (!currentUser) return;
      
      // ============================================
      // [SUPABASE INTEGRATION - ADDITIVE]
      // Try loading from Supabase first, then fall back to local storage
      // ============================================
      let savedSettings = null;
      
      if (typeof supabaseUserService !== 'undefined' && supabaseUserService.isAvailable()) {
        console.log('[GhostAccount] Trying to load settings from Supabase...');
        savedSettings = await supabaseUserService.loadUserSettings(currentUser);
        if (savedSettings) {
          console.log('[GhostAccount] Settings loaded from Supabase');
          // Also update local storage to keep in sync
          await ghostUserSettingsService.saveUserSettings(currentUser, savedSettings);
        }
      }
      
      // Fall back to local storage if Supabase didn't return settings
      if (!savedSettings) {
        savedSettings = await ghostUserSettingsService.getUserSettings(currentUser);
      }
      // ============================================
      // [END SUPABASE INTEGRATION]
      // ============================================
      
      if (!savedSettings) {
        console.log('[GhostAccount] No saved settings for user:', currentUser);
        return;
      }
      
      console.log('[GhostAccount] Loading settings for user:', currentUser);
      
      // Apply saved settings
      const controls = this.focusPersonalizationElements.controls;
      
      // 1. Font Size
      if (savedSettings.fontSize !== undefined) {
        this.personalizationFontSize = savedSettings.fontSize;
        if (controls?.fontSizeSlider) {
          controls.fontSizeSlider.value = this.personalizationFontSize;
        }
        if (controls?.fontSizeValue) {
          controls.fontSizeValue.textContent = `${this.personalizationFontSize}%`;
        }
      }
      
      // 2. Contrast
      if (savedSettings.contrast !== undefined) {
        this.personalizationContrast = savedSettings.contrast;
        if (controls?.contrastToggle) {
          controls.contrastToggle.classList.toggle('is-active', this.personalizationContrast);
          controls.contrastToggle.setAttribute('aria-pressed', this.personalizationContrast ? 'true' : 'false');
        }
      }
      
      // 3. Brightness
      if (savedSettings.brightness !== undefined) {
        this.personalizationBrightness = savedSettings.brightness;
        if (controls?.brightnessSlider) {
          controls.brightnessSlider.value = this.personalizationBrightness;
        }
        if (controls?.brightnessValue) {
          controls.brightnessValue.textContent = `${this.personalizationBrightness}%`;
        }
      }
      
      // 4. Line Height
      if (savedSettings.lineHeight !== undefined) {
        this.personalizationLineHeight = savedSettings.lineHeight;
        if (controls?.lineHeightSlider) {
          controls.lineHeightSlider.value = this.personalizationLineHeight;
        }
        if (controls?.lineHeightValue) {
          controls.lineHeightValue.textContent = `${this.personalizationLineHeight.toFixed(1)}×`;
        }
      }
      
      // 5. Reduce Animations
      if (savedSettings.reduceAnimations !== undefined) {
        this.personalizationReduceAnimations = savedSettings.reduceAnimations;
        if (controls?.reduceAnimationsToggle) {
          controls.reduceAnimationsToggle.classList.toggle('is-active', this.personalizationReduceAnimations);
          controls.reduceAnimationsToggle.setAttribute('aria-pressed', this.personalizationReduceAnimations ? 'true' : 'false');
        }
      }
      
      // [SUPABASE SETTINGS SYNC – FIX ALL FIELDS]
      // 6. Highlight Mode (Supabase-specific, no UI control)
      if (savedSettings.highlightMode !== undefined) {
        this.personalizationHighlightMode = savedSettings.highlightMode;
      }
      
      // Apply the loaded settings to the page
      this._focusPersonalizationApplySettings();
      this._focusPersonalizationUpdateControlStates();
    }
    
    /**
     * Update control visual states based on whether settings are non-default
     */
    _focusPersonalizationUpdateControlStates() {
      const menu = this.focusPersonalizationElements.menu;
      if (!menu) return;
      
      // Font Size control
      const fontSizeControl = menu.querySelector('[data-control="fontSize"]');
      if (fontSizeControl) {
        fontSizeControl.classList.toggle('is-active', this.personalizationFontSize !== 100);
      }
      
      // Contrast control
      const contrastControl = menu.querySelector('[data-control="contrast"]');
      if (contrastControl) {
        contrastControl.classList.toggle('is-active', this.personalizationContrast);
      }
      
      // Brightness control
      const brightnessControl = menu.querySelector('[data-control="brightness"]');
      if (brightnessControl) {
        brightnessControl.classList.toggle('is-active', this.personalizationBrightness !== 100);
      }
      
      // Line Height control
      const lineHeightControl = menu.querySelector('[data-control="lineHeight"]');
      if (lineHeightControl) {
        lineHeightControl.classList.toggle('is-active', this.personalizationLineHeight !== 1.5);
      }
      
      // Reduce Animations control
      const reduceAnimationsControl = menu.querySelector('[data-control="reduceAnimations"]');
      if (reduceAnimationsControl) {
        reduceAnimationsControl.classList.toggle('is-active', this.personalizationReduceAnimations);
      }
      
      // ============================================
      // [SUPABASE INTEGRATION - ADDITIVE]
      // Debounced save to Supabase when settings change
      // ============================================
      this._debouncedSupabaseSync();
      // ============================================
      // [END SUPABASE INTEGRATION]
      // ============================================
    }
    
    // ============================================
    // [SUPABASE SETTINGS SYNC – FIX ALL FIELDS]
    // Single source of truth for current settings
    // ============================================
    
    /**
     * Get the complete current personalisation settings object
     * This is the SINGLE SOURCE OF TRUTH for all settings
     * Used by both local storage and Supabase sync
     * 
     * @returns {Object} Complete settings object with all fields
     */
    _getCurrentPersonalisationSettings() {
      return {
        // Extension settings (all persisted locally)
        fontSize: this.personalizationFontSize,
        contrast: this.personalizationContrast,
        brightness: this.personalizationBrightness,
        lineHeight: this.personalizationLineHeight,
        reduceAnimations: this.personalizationReduceAnimations,
        // Supabase-specific field (highlight_mode column)
        highlightMode: this.personalizationHighlightMode
      };
    }
    
    /**
     * [SUPABASE INTEGRATION - ADDITIVE]
     * Debounced sync to Supabase - only syncs if user is logged in
     * Uses a 1 second debounce to avoid excessive API calls
     */
    _debouncedSupabaseSync() {
      // Clear previous timer
      if (this._supabaseSyncTimer) {
        clearTimeout(this._supabaseSyncTimer);
      }
      
      // Set new timer (1 second debounce)
      this._supabaseSyncTimer = setTimeout(() => {
        const currentUser = ghostAuthService.getCurrentUser();
        if (!currentUser) return;
        
        // Only sync if Supabase is available
        if (typeof supabaseUserService !== 'undefined' && supabaseUserService.isAvailable()) {
          // [SUPABASE SETTINGS SYNC – FIX ALL FIELDS]
          // Use single source of truth for settings
          const settings = this._getCurrentPersonalisationSettings();
          
          // Log what we're syncing for debugging
          console.log('[GhostAccount] Syncing settings to Supabase:', {
            font_scale: settings.fontSize,
            contrast: settings.contrast,
            focus_mode: settings.reduceAnimations,
            highlight_mode: settings.highlightMode
          });
          
          supabaseUserService.saveUserSettings(currentUser, settings)
            .then(success => {
              if (success) {
                console.log('[GhostAccount] Settings auto-synced to Supabase');
              }
            })
            .catch(() => {
              // Silent fail - local storage already has the settings
            });
        }
      }, 1000);
    }
    
    /**
     * Apply all personalization settings to the page
     * Settings are ONLY applied when Focus Mode is active
     */
    _focusPersonalizationApplySettings() {
      // Check if Focus Mode is active via the chatbot reference
      const isFocusModeActive = this.focusPersonalizationChatbotRef?.isFocusMode || 
                                document.body.classList.contains('ghost-focus-mode-active');
      
      // Update notice visibility
      // Notice is hidden when Focus Mode is active OR when independent mode is enabled
      const controls = this.focusPersonalizationElements.controls;
      if (controls?.notice) {
        const shouldHideNotice = isFocusModeActive || this.personalizationIndependentMode;
        controls.notice.classList.toggle('is-hidden', shouldHideNotice);
      }
      
      // If Focus Mode is not active AND independent mode is disabled, remove all personalization classes
      // (Original behavior preserved, but bypassed when personalizationIndependentMode is true)
      if (!isFocusModeActive && !this.personalizationIndependentMode) {
        this._focusPersonalizationRemovePageClasses();
        return;
      }
      
      // ============================================
      // Apply Font Size
      // ============================================
      if (this.personalizationFontSize !== 100) {
        document.documentElement.classList.add('focus-personalization-font-size-active');
        document.body.classList.add('focus-personalization-font-size-active');
        document.documentElement.style.setProperty(
          '--focus-personalization-font-scale', 
          (this.personalizationFontSize / 100).toString()
        );
      } else {
        document.documentElement.classList.remove('focus-personalization-font-size-active');
        document.body.classList.remove('focus-personalization-font-size-active');
        document.documentElement.style.removeProperty('--focus-personalization-font-scale');
      }
      
      // ============================================
      // Apply Contrast Enhancement
      // ============================================
      if (this.personalizationContrast) {
        document.body.classList.add('focus-personalization-contrast-active');
      } else {
        document.body.classList.remove('focus-personalization-contrast-active');
      }
      
      // ============================================
      // Apply Brightness
      // ============================================
      if (this.personalizationBrightness !== 100) {
        document.documentElement.classList.add('focus-personalization-brightness-active');
        document.body.classList.add('focus-personalization-brightness-active');
        document.documentElement.style.setProperty(
          '--focus-personalization-brightness', 
          (this.personalizationBrightness / 100).toString()
        );
        
        // Toggle bright/dim mode class for correct overlay color
        if (this.personalizationBrightness > 100) {
          document.body.classList.add('focus-personalization-brightness-bright');
        } else {
          document.body.classList.remove('focus-personalization-brightness-bright');
        }
      } else {
        document.documentElement.classList.remove('focus-personalization-brightness-active');
        document.body.classList.remove('focus-personalization-brightness-active');
        document.body.classList.remove('focus-personalization-brightness-bright');
        document.documentElement.style.removeProperty('--focus-personalization-brightness');
      }
      
      // ============================================
      // Apply Line Height
      // ============================================
      if (this.personalizationLineHeight !== 1.5) {
        document.documentElement.classList.add('focus-personalization-line-height-active');
        document.body.classList.add('focus-personalization-line-height-active');
        document.documentElement.style.setProperty(
          '--focus-personalization-line-height', 
          this.personalizationLineHeight.toString()
        );
      } else {
        document.documentElement.classList.remove('focus-personalization-line-height-active');
        document.body.classList.remove('focus-personalization-line-height-active');
        document.documentElement.style.removeProperty('--focus-personalization-line-height');
      }
      
      // ============================================
      // Apply Reduce Animations
      // ============================================
      if (this.personalizationReduceAnimations) {
        document.body.classList.add('focus-personalization-reduce-animations-active');
      } else {
        document.body.classList.remove('focus-personalization-reduce-animations-active');
      }
      
      console.log('[FocusPersonalization Addon] Settings applied:', {
        fontSize: this.personalizationFontSize,
        contrast: this.personalizationContrast,
        brightness: this.personalizationBrightness,
        lineHeight: this.personalizationLineHeight,
        reduceAnimations: this.personalizationReduceAnimations
      });
      
      // [GhostAccount Integration] Save settings for logged-in users
      // This runs AFTER all existing logic and is non-blocking
      if (ghostAuthService && ghostAuthService.isLoggedIn()) {
        // Debounce saves to avoid excessive storage writes
        if (this._ghostAccountSaveTimeout) {
          clearTimeout(this._ghostAccountSaveTimeout);
        }
        this._ghostAccountSaveTimeout = setTimeout(() => {
          this._ghostAccountSaveCurrentSettings();
        }, 500); // Debounce 500ms
      }
    }
    
    /**
     * Remove all personalization CSS classes from the page
     * Called when Focus Mode is deactivated
     */
    _focusPersonalizationRemovePageClasses() {
      // Remove all feature classes from body and html
      const classesToRemove = [
        'focus-personalization-font-size-active',
        'focus-personalization-contrast-active',
        'focus-personalization-brightness-active',
        'focus-personalization-brightness-bright',
        'focus-personalization-line-height-active',
        'focus-personalization-reduce-animations-active'
      ];
      
      classesToRemove.forEach(className => {
        document.documentElement.classList.remove(className);
        document.body.classList.remove(className);
      });
      
      // Remove CSS custom properties
      document.documentElement.style.removeProperty('--focus-personalization-font-scale');
      document.documentElement.style.removeProperty('--focus-personalization-brightness');
      document.documentElement.style.removeProperty('--focus-personalization-line-height');
    }
    
    /**
     * Reset all personalization settings to defaults
     * Called when Focus Mode is deactivated
     */
    _focusPersonalizationResetSettings() {
      // Reset all state values to defaults
      this.personalizationFontSize = 100;
      this.personalizationContrast = false;
      this.personalizationBrightness = 100;
      this.personalizationLineHeight = 1.5;
      this.personalizationReduceAnimations = false;
      // [SUPABASE SETTINGS SYNC – FIX ALL FIELDS]
      this.personalizationHighlightMode = false;
      
      // Reset UI controls to default values
      const controls = this.focusPersonalizationElements.controls;
      if (controls) {
        if (controls.fontSizeSlider) {
          controls.fontSizeSlider.value = '100';
        }
        if (controls.fontSizeValue) {
          controls.fontSizeValue.textContent = '100%';
        }
        if (controls.contrastToggle) {
          controls.contrastToggle.classList.remove('is-active');
          controls.contrastToggle.setAttribute('aria-pressed', 'false');
        }
        if (controls.brightnessSlider) {
          controls.brightnessSlider.value = '100';
        }
        if (controls.brightnessValue) {
          controls.brightnessValue.textContent = '100%';
        }
        if (controls.lineHeightSlider) {
          controls.lineHeightSlider.value = '1.5';
        }
        if (controls.lineHeightValue) {
          controls.lineHeightValue.textContent = '1.5×';
        }
        if (controls.reduceAnimationsToggle) {
          controls.reduceAnimationsToggle.classList.remove('is-active');
          controls.reduceAnimationsToggle.setAttribute('aria-pressed', 'false');
        }
      }
      
      // Remove all CSS classes from page
      this._focusPersonalizationRemovePageClasses();
      
      // Update control visual states
      this._focusPersonalizationUpdateControlStates();
      
      console.log('[FocusPersonalization Addon] Settings reset to defaults');
    }
    
    // ============================================
    // Drag Handlers (Floating Panel Add-on)
    // ============================================
    // These methods implement the draggable floating panel behavior.
    // Menu can be repositioned by dragging the header.
    // Position is constrained to viewport and persisted in state.
    
    /**
     * Start dragging the menu (pointerdown on header)
     * @param {PointerEvent} e 
     */
    _focusPersonalizationDragStart(e) {
      // Only handle primary button (left click)
      if (e.button !== 0) return;
      
      const menu = this.focusPersonalizationElements.menu;
      if (!menu) return;
      
      // Prevent text selection
      e.preventDefault();
      
      // Get current menu position
      const rect = menu.getBoundingClientRect();
      
      // Calculate offset from pointer to menu corner
      this.personalizationMenuDragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      // Set dragging state
      this.personalizationMenuDragging = true;
      menu.classList.add('is-dragging');
      
      // Capture pointer for smooth dragging
      e.target.setPointerCapture(e.pointerId);
      
      // Add move and end listeners
      document.addEventListener('pointermove', this._focusPersonalizationDragMove);
      document.addEventListener('pointerup', this._focusPersonalizationDragEnd);
      document.addEventListener('pointercancel', this._focusPersonalizationDragEnd);
      
      console.log('[FocusPersonalization Addon] Drag started');
    }
    
    /**
     * Move the menu during drag (pointermove)
     * @param {PointerEvent} e 
     */
    _focusPersonalizationDragMove(e) {
      if (!this.personalizationMenuDragging) return;
      
      const menu = this.focusPersonalizationElements.menu;
      if (!menu) return;
      
      // Calculate new position
      let newX = e.clientX - this.personalizationMenuDragOffset.x;
      let newY = e.clientY - this.personalizationMenuDragOffset.y;
      
      // Get menu dimensions
      const menuRect = menu.getBoundingClientRect();
      const menuWidth = menuRect.width;
      const menuHeight = menuRect.height;
      
      // Constrain to viewport with 16px padding
      const padding = 16;
      const maxX = window.innerWidth - menuWidth - padding;
      const maxY = window.innerHeight - menuHeight - padding;
      
      newX = Math.max(padding, Math.min(newX, maxX));
      newY = Math.max(padding, Math.min(newY, maxY));
      
      // Apply position
      menu.style.left = `${newX}px`;
      menu.style.top = `${newY}px`;
      
      // Add custom position class to override transform
      if (!menu.classList.contains('has-custom-position')) {
        menu.classList.add('has-custom-position');
      }
      
      // Store position in state
      this.personalizationMenuPosition = { x: newX, y: newY };
    }
    
    /**
     * End dragging the menu (pointerup)
     * @param {PointerEvent} e 
     */
    _focusPersonalizationDragEnd(e) {
      if (!this.personalizationMenuDragging) return;
      
      const menu = this.focusPersonalizationElements.menu;
      if (menu) {
        menu.classList.remove('is-dragging');
      }
      
      // Reset dragging state
      this.personalizationMenuDragging = false;
      
      // Remove listeners
      document.removeEventListener('pointermove', this._focusPersonalizationDragMove);
      document.removeEventListener('pointerup', this._focusPersonalizationDragEnd);
      document.removeEventListener('pointercancel', this._focusPersonalizationDragEnd);
      
      console.log('[FocusPersonalization Addon] Drag ended, position:', this.personalizationMenuPosition);
    }

    /**
     * Toggle the personalization menu open/closed
     */
    _focusPersonalizationToggleMenu() {
      if (this.isPagePersonalizationOpen) {
        this._focusPersonalizationCloseMenu();
      } else {
        this._focusPersonalizationOpenMenu();
      }
    }

    /**
     * Open the personalization menu
     */
    _focusPersonalizationOpenMenu() {
      this.isPagePersonalizationOpen = true;
      
      if (this.focusPersonalizationElements.backdrop) {
        this.focusPersonalizationElements.backdrop.classList.add('is-visible');
      }
      if (this.focusPersonalizationElements.menu) {
        const menu = this.focusPersonalizationElements.menu;
        menu.classList.add('is-open');
        
        // ============================================
        // Restore Position (Floating Panel Add-on)
        // ============================================
        // If a custom position was previously set, restore it
        if (this.personalizationMenuPosition) {
          const pos = this.personalizationMenuPosition;
          
          // Validate position is still within viewport
          const menuWidth = 420; // Default width from CSS
          const menuHeight = 300; // Min height from CSS
          const padding = 16;
          
          const maxX = window.innerWidth - menuWidth - padding;
          const maxY = window.innerHeight - menuHeight - padding;
          
          const safeX = Math.max(padding, Math.min(pos.x, maxX));
          const safeY = Math.max(padding, Math.min(pos.y, maxY));
          
          menu.style.left = `${safeX}px`;
          menu.style.top = `${safeY}px`;
          menu.classList.add('has-custom-position');
          
          // Update stored position if it was adjusted
          if (safeX !== pos.x || safeY !== pos.y) {
            this.personalizationMenuPosition = { x: safeX, y: safeY };
          }
        }
      }
      if (this.focusPersonalizationElements.bar) {
        this.focusPersonalizationElements.bar.setAttribute('aria-expanded', 'true');
      }
      
      // Update notice visibility based on Focus Mode state or independent mode
      const isFocusModeActive = this.focusPersonalizationChatbotRef?.isFocusMode || 
                                document.body.classList.contains('ghost-focus-mode-active');
      const controls = this.focusPersonalizationElements.controls;
      if (controls?.notice) {
        // Hide notice when Focus Mode is active OR when independent mode is enabled
        const shouldHideNotice = isFocusModeActive || this.personalizationIndependentMode;
        controls.notice.classList.toggle('is-hidden', shouldHideNotice);
      }
      
      // Update control visual states
      this._focusPersonalizationUpdateControlStates();
      
      console.log('[FocusPersonalization Addon] Menu opened');
    }

    /**
     * Close the personalization menu
     * Note: This only closes the menu, NOT Focus Mode
     */
    _focusPersonalizationCloseMenu() {
      this.isPagePersonalizationOpen = false;
      
      if (this.focusPersonalizationElements.backdrop) {
        this.focusPersonalizationElements.backdrop.classList.remove('is-visible');
      }
      if (this.focusPersonalizationElements.menu) {
        this.focusPersonalizationElements.menu.classList.remove('is-open');
      }
      if (this.focusPersonalizationElements.bar) {
        this.focusPersonalizationElements.bar.setAttribute('aria-expanded', 'false');
      }
      
      console.log('[FocusPersonalization Addon] Menu closed');
    }

    /**
     * Called when Focus Mode is activated
     * Note: Bar is always visible, independent of Focus Mode
     * When Focus Mode activates, apply any previously set personalization settings
     */
    _focusPersonalizationOnActivate() {
      // Bar visibility is no longer tied to Focus Mode
      // Bar is always visible once initialized
      
      // Apply current personalization settings now that Focus Mode is active
      this._focusPersonalizationApplySettings();
      
      console.log('[FocusPersonalization Addon] Focus Mode activated - settings applied');
    }

    /**
     * Called when Focus Mode is deactivated
     * Note: Bar remains visible, only menu closes if open
     * All personalization settings are fully reset when Focus Mode is deactivated
     * (Unless personalizationIndependentMode is enabled)
     */
    _focusPersonalizationOnDeactivate() {
      // Close menu if open (but bar stays visible)
      if (this.isPagePersonalizationOpen) {
        this._focusPersonalizationCloseMenu();
      }
      
      // IMPORTANT: Reset ALL personalization settings when Focus Mode is deactivated
      // This ensures no visual changes persist without Focus Mode being active
      // EXCEPTION: When personalizationIndependentMode is true, settings persist
      if (!this.personalizationIndependentMode) {
        this._focusPersonalizationResetSettings();
        console.log('[FocusPersonalization Addon] Focus Mode deactivated - all settings reset');
      } else {
        console.log('[FocusPersonalization Addon] Focus Mode deactivated - settings preserved (independent mode)');
      }
      
      // Bar remains visible - no longer tied to Focus Mode
    }

    /**
     * Destroy the addon and clean up
     */
    focusPersonalizationDestroy() {
      // First reset all settings to ensure page is in clean state
      this._focusPersonalizationResetSettings();
      
      // Close menu if open
      if (this.isPagePersonalizationOpen) {
        this._focusPersonalizationCloseMenu();
      }
      
      // Remove elements
      if (this.focusPersonalizationElements.bar) {
        this.focusPersonalizationElements.bar.remove();
      }
      if (this.focusPersonalizationElements.menu) {
        this.focusPersonalizationElements.menu.remove();
      }
      if (this.focusPersonalizationElements.backdrop) {
        this.focusPersonalizationElements.backdrop.remove();
      }
      
      // Clear control references
      this.focusPersonalizationElements.controls = null;
      
      // Remove injected styles
      const style = document.getElementById('ghost-focus-personalization-styles');
      if (style) {
        style.remove();
      }
      
      this.focusPersonalizationStylesInjected = false;
      console.log('[FocusPersonalization Addon] Destroyed');
    }
  }

  // Global FocusPersonalization addon instance
  const focusPersonalizationAddon = new FocusPersonalizationAddon();

  // ============================================
  // Main Chatbot Controller
  // ============================================
  class Chatbot {
    constructor() {
      this.isOpen = false;
      this.messages = [];
      this.ui = new ChatUI();
      this.languageManager = new LanguageManager();
      this.speech = null;
      this.tts = null;
      this.voiceDialogue = null;
      this.elements = null;
      
      // OpenAI integration
      this.openaiConfigured = false;
      this.pageContext = null;
      this.isProcessing = false;
      
      // Subpage management (controlled access)
      this.subpageManager = null;
      this.pendingQuestion = null; // Question waiting for subpage approval
      this.subpagePromiseResolve = null; // Resolve function for subpage approval
      
      // Navigation agent (agent-style navigation)
      this.navigationAgent = null;
      this.pendingNavigation = null; // Navigation waiting for confirmation
      
      // Trigger drag handler for movable button
      this.triggerDragHandler = null;
      
      // Focus Mode state
      // When enabled: reduces visual distractions, disables auto-navigation, shorter agent responses
      this.isFocusMode = false;
    }

    async init() {
      // Set up language change callback
      this.languageManager.onLanguageChange = (lang) => this._handleLanguageChange(lang);
      
      // Create UI with initial language
      this.elements = this.ui.create(this.languageManager.currentLang);
      
      // Initialize speech controller with language manager
      this.speech = new SpeechController({
        onTranscript: (text, isFinal) => this._handleTranscript(text, isFinal),
        onStateChange: (isRecording) => this._handleRecordingState(isRecording),
        onLanguageDetected: (lang) => this._handleLanguageDetected(lang),
        languageManager: this.languageManager
      });

      // Initialize TTS controller
      this.tts = new TTSController({
        languageManager: this.languageManager,
        onStateChange: (isEnabled, isPlaying) => this._handleTTSStateChange(isEnabled, isPlaying),
        onError: (error) => this._handleTTSError(error)
      });

      // Initialize Voice Dialogue Controller
      this.voiceDialogue = new VoiceDialogueController({
        languageManager: this.languageManager,
        ttsController: this.tts,
        onStateChange: (newState, oldState) => this._handleVoiceDialogueStateChange(newState, oldState),
        onTranscriptReady: (transcript) => this._handleVoiceDialogueTranscript(transcript),
        onError: (error) => this._handleVoiceDialogueError(error)
      });

      // Initialize Subpage Manager (controlled access)
      this.subpageManager = new SubpageManager({
        onSuggestionReady: (suggestions) => this._handleSubpageSuggestions(suggestions),
        onSubpagesLoaded: (subpages) => this._handleSubpagesLoaded(subpages),
        onError: (error) => console.error('[Ghost UI] Subpage error:', error)
      });

      // Start sitemap discovery early (non-blocking, token-efficient)
      // This improves subpage suggestions without increasing token usage
      this.subpageManager.initSitemapDiscovery().catch(() => {
        // Silently fail - sitemap is optional enhancement
      });

      // Initialize Navigation Agent (agent-style navigation)
      // ============================================
      // AUTO-NAVIGATION CONTROL:
      // Set autoNavigationEnabled: true to re-enable automatic navigation
      // Set autoNavigationEnabled: false (default) to require user confirmation
      // ============================================
      this.navigationAgent = new NavigationAgent({
        subpageManager: this.subpageManager,
        onNavigate: (url) => this._handleNavigation(url),
        onNavigationConfirm: (target) => this._showNavigationConfirmation(target),
        autoNavigationEnabled: false // <-- Set to true to re-enable auto-navigation
      });

      // Initialize OpenAI service
      await this._initOpenAI();

      // Bind event listeners
      this._bindEvents();
      
      // Initialize trigger drag handler for movable button
      this.triggerDragHandler = new TriggerDragHandler(
        this.elements.trigger,
        this.ui.root
      );
      
      // Update initial TTS UI state
      this.ui.updateTTSUI(this.tts.getIsEnabled(), this.tts.getIsPlaying());
      
      // Extract initial page context
      this._extractPageContext();
      
      console.log('[Ghost UI] Chatbot initialized with language:', this.languageManager.currentLang);
      console.log('[Ghost UI] OpenAI configured:', this.openaiConfigured);
      console.log('[Ghost UI] Subpage manager ready (max 3, user approval required)');
      console.log('[Ghost UI] Sitemap discovery enabled (token-efficient mode)');
      console.log('[Ghost UI] Navigation agent ready (agent-style navigation enabled)');
      console.log('[Ghost UI] Voice dialogue supported:', this.voiceDialogue?.isSupported() ?? false);
      
      // [FocusPlus Addon] Initialize the Focus Plus enhancement addon
      // This addon extends Focus Mode with additional optional features
      if (focusPlusAddon) {
        focusPlusAddon.focusPlusInit(this);
        console.log('[Ghost UI] FocusPlus addon ready');
      }
      
      // [FocusPersonalization Addon] Initialize the Page Personalization addon
      // This addon adds a Page Personalization bar that appears only in Focus Mode
      if (focusPersonalizationAddon) {
        focusPersonalizationAddon.focusPersonalizationInit(this);
        console.log('[Ghost UI] FocusPersonalization addon ready');
      }
    }

    /**
     * Initialize OpenAI service
     */
    async _initOpenAI() {
      if (typeof OpenAIService !== 'undefined') {
        // Try to load from storage first
        await OpenAIService.init();
        
        // If not configured, use default key
        if (!OpenAIService.isConfigured() && OPENAI_DEFAULT_KEY) {
          await OpenAIService.setApiKey(OPENAI_DEFAULT_KEY);
        }
        
        this.openaiConfigured = OpenAIService.isConfigured();
      } else {
        console.warn('[Ghost UI] OpenAIService not available');
        this.openaiConfigured = false;
      }
    }

    /**
     * Extract context from current webpage
     */
    _extractPageContext() {
      if (typeof WebPageExtractor !== 'undefined') {
        try {
          this.pageContext = WebPageExtractor.extractCurrentPage();
          console.log('[Ghost UI] Page context extracted:', {
            url: this.pageContext.url,
            title: this.pageContext.title,
            contentLength: this.pageContext.mainContent.length,
            linksCount: this.pageContext.links.length
          });
        } catch (error) {
          console.error('[Ghost UI] Failed to extract page context:', error);
          this.pageContext = null;
        }
      }
    }

    /**
     * Get the formatted context string for OpenAI
     * Includes current page and any approved/loaded subpages
     */
    async _getContextString() {
      // [Focus Mode Add-on] When Focus Mode is active, use only visible main content
      if (this.isFocusMode && focusPlusAddon && focusPlusAddon.focusPlusEnabled) {
        const visibleContent = focusPlusAddon._focusPlusGetVisibleContent();
        if (visibleContent) {
          console.log('[Ghost UI] Focus Mode: Using visible main content only');
          return `[Focus Mode - Visible Main Content Only]\n\nPage URL: ${window.location.href}\nPage Title: ${document.title}\n\nVisible Content:\n${visibleContent}`;
        }
      }
      
      // Refresh page context
      this._extractPageContext();
      
      if (!this.pageContext) {
        return 'Unable to extract page content.';
      }

      // Include loaded subpages from SubpageManager
      const loadedSubpages = this.subpageManager ? this.subpageManager.getLoadedSubpages() : [];
      
      return WebPageExtractor.createContextString(this.pageContext, loadedSubpages);
    }

    /**
     * Handle subpage suggestions callback
     * @param {Array} suggestions - Suggested subpages
     */
    _handleSubpageSuggestions(suggestions) {
      console.log('[Ghost UI] Subpage suggestions ready:', suggestions.length);
    }

    /**
     * Handle subpages loaded callback
     * @param {Array} subpages - Loaded subpage data
     */
    _handleSubpagesLoaded(subpages) {
      console.log('[Ghost UI] Subpages loaded:', subpages.length);
    }

    _bindEvents() {
      const { trigger, closeBtn, input, micBtn, sendBtn, chat, langToggle, ttsToggle, voiceDialogueToggle, focusModeBar } = this.elements;

      // Toggle chat - but only if not dragging
      trigger.addEventListener('click', (e) => {
        // Check if this click should be suppressed because it was a drag
        if (this.triggerDragHandler && this.triggerDragHandler.shouldSuppressClick()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        this.toggle();
      });
      closeBtn.addEventListener('click', () => this.close());

      // Language toggle
      langToggle.addEventListener('click', () => this._toggleLanguage());

      // TTS toggle
      ttsToggle.addEventListener('click', () => this._toggleTTS());

      // Voice dialogue toggle
      if (voiceDialogueToggle) {
        voiceDialogueToggle.addEventListener('click', () => this._toggleVoiceDialogue());
      }

      // Focus Mode toggle
      if (focusModeBar) {
        focusModeBar.addEventListener('click', () => this._toggleFocusMode());
      }

      // Send message
      sendBtn.addEventListener('click', () => this._sendMessage());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._sendMessage();
        }
      });

      // Stop TTS (and optionally voice dialogue) when user starts typing
      input.addEventListener('input', () => this._stopTTSOnInteraction(true));

      // Voice input
      micBtn.addEventListener('click', () => this.speech.toggle());

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });

      // Prevent click propagation
      chat.addEventListener('click', (e) => e.stopPropagation());
    }

    /**
     * Stop TTS playback when user interacts with the chatbot
     * Called when: typing, starting voice input, sending message, closing chat
     * @param {boolean} deactivateVoiceDialogue - Whether to deactivate voice dialogue mode
     */
    _stopTTSOnInteraction(deactivateVoiceDialogue = false) {
      if (this.tts && this.tts.getIsPlaying()) {
        this.tts.stop();
        console.log('[Ghost UI] TTS stopped due to user interaction');
      }
      
      // Optionally deactivate voice dialogue when user manually types
      if (deactivateVoiceDialogue && this.voiceDialogue && this.voiceDialogue.getIsActive()) {
        this.voiceDialogue.deactivate();
        this.ui.updateVoiceDialogueToggleUI(false);
        this.ui.updateVoiceDialogueStateUI(VoiceDialogueState.IDLE);
        console.log('[Ghost UI] Voice dialogue deactivated due to manual input');
      }
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    open() {
      this.isOpen = true;
      this.elements.trigger.classList.add('is-active');
      this.elements.trigger.innerHTML = `<span class="liquid-trigger-icon">${Icons.plus}</span>`;
      this.elements.trigger.setAttribute('aria-label', 'Close chat');
      this.elements.chat.classList.add('is-open');
      
      // Focus input after animation
      setTimeout(() => this.elements.input.focus(), 400);
    }

    close() {
      this.isOpen = false;
      this.elements.trigger.classList.remove('is-active');
      this.elements.trigger.innerHTML = `<span class="liquid-trigger-icon">${Icons.chat}</span>`;
      this.elements.trigger.setAttribute('aria-label', 'Open chat');
      this.elements.chat.classList.remove('is-open');
      
      // Stop any active recording
      this.speech.stop();
      
      // Stop any active TTS playback
      if (this.tts) {
        this.tts.stop();
      }
      
      // Deactivate voice dialogue mode
      if (this.voiceDialogue && this.voiceDialogue.getIsActive()) {
        this.voiceDialogue.deactivate();
        this.ui.updateVoiceDialogueToggleUI(false);
        this.ui.updateVoiceDialogueStateUI(VoiceDialogueState.IDLE);
      }
    }

    /**
     * Toggle between DE and EN
     */
    _toggleLanguage() {
      this.languageManager.toggleLanguage();
    }

    /**
     * Handle language change from language manager
     */
    _handleLanguageChange(lang) {
      // Update UI
      this.ui.updateLanguageUI(lang);
      
      // Update speech recognition language
      if (this.speech) {
        this.speech.updateLanguage();
      }
      
      // Update voice dialogue language
      if (this.voiceDialogue) {
        this.voiceDialogue.updateLanguage();
      }
      
      console.log('[Liquid Glass] Language changed to:', lang);
    }

    /**
     * Handle detected language from speech recognition
     * (For potential future auto-detection enhancement)
     */
    _handleLanguageDetected(detectedLang) {
      // Currently just logging - could be extended for auto-detection
      console.log('[Liquid Glass] Detected speech language:', detectedLang);
    }

    /**
     * Toggle TTS on/off
     */
    _toggleTTS() {
      if (this.tts) {
        this.tts.toggle();
      }
    }

    /**
     * Handle TTS state changes
     * Enhanced: Better integration with optimistic listening
     */
    _handleTTSStateChange(isEnabled, isPlaying) {
      this.ui.updateTTSUI(isEnabled, isPlaying);
      
      // Notify voice dialogue controller of TTS state changes
      if (this.voiceDialogue && this.voiceDialogue.getIsActive()) {
        if (isPlaying) {
          // TTS started - voice dialogue enters SPEAKING state
          // Recognition is prepared for fast interrupt
          this.voiceDialogue.onSpeakingStart();
        } else {
          // TTS stopped - fast return to listening
          // This triggers immediate recognition restart
          this.voiceDialogue.onSpeakingEnd();
        }
      }
    }

    /**
     * Handle TTS errors
     */
    _handleTTSError(error) {
      console.error('[Liquid Glass] TTS error:', error.message);
      // Could show a toast notification here in the future
    }

    // ============================================
    // Voice Dialogue Mode Handlers
    // ============================================

    /**
     * Toggle voice dialogue mode
     */
    _toggleVoiceDialogue() {
      if (!this.voiceDialogue) return;

      // Ensure TTS is enabled when starting voice dialogue
      if (!this.voiceDialogue.getIsActive() && this.tts && !this.tts.getIsEnabled()) {
        this.tts.setEnabled(true);
      }

      const isActive = this.voiceDialogue.toggle();
      this.ui.updateVoiceDialogueToggleUI(isActive);

      if (isActive) {
        // Stop any manual speech recognition that might be active
        if (this.speech && this.speech.isActive) {
          this.speech.stop();
        }
        console.log('[Ghost UI] Voice dialogue mode activated');
      } else {
        console.log('[Ghost UI] Voice dialogue mode deactivated');
      }
    }

    /**
     * Toggle Focus Mode
     * When enabled:
     * - Reduces visual distractions on the page
     * - Disables automatic navigation suggestions
     * - Agent responses are shorter and more explanatory
     */
    _toggleFocusMode() {
      this.isFocusMode = !this.isFocusMode;
      
      // Update UI
      this.ui.updateFocusModeUI(this.isFocusMode);
      
      // Log state change
      console.log('[Ghost UI] Focus Mode:', this.isFocusMode ? 'enabled' : 'disabled');
      
      // [FocusPlus Addon Hook] - Trigger addon activation/deactivation
      // This hook observes the existing Focus Mode state and activates addon features
      if (focusPlusAddon) {
        if (this.isFocusMode) {
          focusPlusAddon._focusPlusOnActivate();
        } else {
          focusPlusAddon._focusPlusOnDeactivate();
        }
      }
      
      // [FocusPersonalization Addon Hook] - Trigger page personalization addon
      // This hook activates the Page Personalization bar when Focus Mode is active
      if (focusPersonalizationAddon) {
        if (this.isFocusMode) {
          focusPersonalizationAddon._focusPersonalizationOnActivate();
        } else {
          focusPersonalizationAddon._focusPersonalizationOnDeactivate();
        }
      }
    }

    /**
     * Handle voice dialogue state changes
     */
    _handleVoiceDialogueStateChange(newState, oldState) {
      console.log('[Ghost UI] Voice dialogue state:', oldState, '->', newState);
      this.ui.updateVoiceDialogueStateUI(newState);
      
      // Update status text based on state
      const statusSpan = this.elements.chat?.querySelector('.liquid-status span:last-child');
      if (statusSpan && this.voiceDialogue?.getIsActive()) {
        switch (newState) {
          case VoiceDialogueState.LISTENING:
            statusSpan.textContent = 'Listening...';
            break;
          case VoiceDialogueState.THINKING:
            statusSpan.textContent = 'Thinking...';
            break;
          case VoiceDialogueState.SPEAKING:
            statusSpan.textContent = 'Speaking...';
            break;
          default:
            statusSpan.textContent = 'Ready';
        }
      }
    }

    /**
     * Handle completed voice dialogue transcript
     * This is called when silence is detected after speech
     */
    async _handleVoiceDialogueTranscript(transcript) {
      if (!transcript || this.isProcessing) return;

      console.log('[Ghost UI] Voice dialogue transcript:', transcript);

      // Clear welcome message on first message
      const welcome = this.elements.messages.querySelector('.liquid-welcome');
      if (welcome) welcome.remove();

      // Add user message
      this._addMessage(transcript, 'user');

      // Process with OpenAI
      await this._processWithOpenAI(transcript);
    }

    /**
     * Handle voice dialogue errors
     */
    _handleVoiceDialogueError(error) {
      console.error('[Ghost UI] Voice dialogue error:', error.message);
      
      // Show error to user
      this._addMessage(`Voice dialogue error: ${error.message}`, 'assistant');
      
      // Deactivate voice dialogue on error
      if (this.voiceDialogue) {
        this.voiceDialogue.deactivate();
        this.ui.updateVoiceDialogueToggleUI(false);
      }
    }

    _handleTranscript(text, isFinal) {
      this.elements.input.value = text;
    }

    _handleRecordingState(isRecording) {
      this.elements.micBtn.classList.toggle('is-recording', isRecording);
      const langConfig = this.languageManager.getLanguageConfig();
      this.elements.micBtn.setAttribute(
        'aria-label', 
        isRecording ? 'Stop recording' : `Voice input (${langConfig.name})`
      );
      
      // Stop TTS when user starts voice recording
      if (isRecording) {
        this._stopTTSOnInteraction();
        
        // Deactivate voice dialogue if it's active when manual mic is used
        if (this.voiceDialogue && this.voiceDialogue.getIsActive()) {
          this.voiceDialogue.deactivate();
          this.ui.updateVoiceDialogueToggleUI(false);
          this.ui.updateVoiceDialogueStateUI(VoiceDialogueState.IDLE);
        }
      }
    }

    async _sendMessage() {
      const text = this.elements.input.value.trim();
      if (!text || this.isProcessing) return;

      // Stop any ongoing TTS when user sends a new message
      this._stopTTSOnInteraction();

      // Clear welcome message on first send
      const welcome = this.elements.messages.querySelector('.liquid-welcome');
      if (welcome) welcome.remove();

      // Add user message
      this._addMessage(text, 'user');
      this.elements.input.value = '';

      // Process with OpenAI
      await this._processWithOpenAI(text);
    }

    _addMessage(text, type, isLoading = false) {
      const message = document.createElement('div');
      message.className = `liquid-message is-${type}`;
      
      if (isLoading) {
        message.classList.add('is-loading');
        message.innerHTML = `<span class="liquid-loading-indicator">${Icons.loading}</span> Analyzing page content...`;
      } else {
        // Support markdown-like formatting
        message.innerHTML = this._formatMessage(text);
      }
      
      this.elements.messages.appendChild(message);
      
      if (!isLoading) {
        this.messages.push({ text, type, timestamp: Date.now() });
      }
      
      // Scroll to bottom
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
      
      // Trigger TTS for assistant messages
      if (type === 'assistant' && this.tts && !isLoading) {
        // OVERLAPPING PREPARATION: Notify voice dialogue that processing is complete
        // This allows it to prepare listening while TTS plays
        if (this.voiceDialogue && this.voiceDialogue.getIsActive()) {
          this.voiceDialogue.onProcessingComplete();
        }
        
        // Start TTS with minimal delay for immediate feedback
        // TTS state change will notify voice dialogue of speaking start
        setTimeout(() => {
          this.tts.speak(text);
        }, 50); // Reduced from 100ms for faster response
      }
      
      return message;
    }

    /**
     * Format message with basic markdown support
     * @param {string} text - Raw message text
     * @returns {string} HTML formatted text
     */
    _formatMessage(text) {
      return text
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Bullet points
        .replace(/^- (.+)$/gm, '• $1');
    }

    /**
     * Remove loading message
     * @param {Element} loadingElement 
     */
    _removeLoadingMessage(loadingElement) {
      if (loadingElement && loadingElement.parentNode) {
        loadingElement.remove();
      }
    }

    /**
     * Process user message with OpenAI
     * Implements controlled subpage access with user approval
     * Now includes agent-style navigation decision logic (ANSWER/LOAD/NAVIGATE)
     * @param {string} userMessage - The user's input
     */
    async _processWithOpenAI(userMessage) {
      // ============================================
      // Handle pending navigation confirmation
      // If user was asked "Soll ich die Seite öffnen?", check for yes/no response
      // ============================================
      if (this._awaitingNavigationConfirmation && this._pendingNavigationTarget) {
        const response = userMessage.toLowerCase().trim();
        const isConfirmation = /^(ja|yes|ok|sure|klar|gerne|bitte|öffnen|open|go|mach|navigate|sicher|natürlich)/.test(response);
        const isDenial = /^(nein|no|nicht|cancel|abbrechen|stop|stopp|lass|lieber nicht|doch nicht)/.test(response);
        
        if (isConfirmation) {
          // User confirmed - perform navigation
          console.log('[Ghost UI] User confirmed navigation to:', this._pendingNavigationTarget.url);
          const target = this._pendingNavigationTarget;
          
          // Clear pending state
          this._awaitingNavigationConfirmation = false;
          this._pendingNavigationTarget = null;
          this._pendingNavigationQuery = null;
          
          // Navigate with announcement
          await this._performNavigationWithAnnouncement(target);
          return; // Navigation will reload the page
        } else if (isDenial) {
          // User declined - answer the original question instead
          console.log('[Ghost UI] User declined navigation, answering question instead');
          const originalQuery = this._pendingNavigationQuery || userMessage;
          
          // Clear pending state
          this._awaitingNavigationConfirmation = false;
          this._pendingNavigationTarget = null;
          this._pendingNavigationQuery = null;
          
          // Acknowledge and answer
          this._addMessage('Alles klar, ich beantworte deine Frage mit den verfügbaren Informationen.', 'assistant');
          
          // Continue with normal processing for the original query
          userMessage = originalQuery;
        } else {
          // Unclear response - still awaiting confirmation
          // Continue processing but keep pending state
          console.log('[Ghost UI] Unclear response to navigation suggestion, continuing with processing');
          // Clear pending state to avoid loops
          this._awaitingNavigationConfirmation = false;
          this._pendingNavigationTarget = null;
          this._pendingNavigationQuery = null;
        }
      }
      
      // Check if OpenAI is configured
      if (!this.openaiConfigured || typeof OpenAIService === 'undefined') {
        this._addMessage(
          "OpenAI is not configured. Please check the extension settings.",
          'assistant'
        );
        return;
      }

      // Show loading state
      this.isProcessing = true;
      this._updateInputState(true);
      const loadingMessage = this._addMessage('', 'assistant', true);

      try {
        // Refresh page context
        this._extractPageContext();
        
        // ============================================
        // Agent Decision Logic: ANSWER / LOAD / NAVIGATE / SUGGEST_NAVIGATION
        // Focus Mode: Skip all navigation/subpage suggestions when enabled
        // ============================================
        if (this.navigationAgent && !this.isFocusMode) {
          const decision = await this.navigationAgent.decideAction(userMessage, this.pageContext);
          console.log('[Ghost UI] Agent decision:', decision.action, decision.reason);
          
          // ============================================
          // Handle SUGGEST_NAVIGATION action (auto-navigation disabled)
          // Agent suggests a page but asks for explicit user confirmation
          // ============================================
          if (decision.action === 'SUGGEST_NAVIGATION' && decision.target) {
            this._removeLoadingMessage(loadingMessage);
            
            // Store pending navigation for user confirmation
            this._pendingNavigation = decision.target;
            
            // Display suggestion message to user
            const suggestionMessage = decision.reason || 
              `Die gesuchten Informationen findest du auf der ${decision.target.text}-Seite. Soll ich sie für dich öffnen?`;
            
            this._addMessage(suggestionMessage, 'assistant');
            
            // Store context for handling user's response
            this._awaitingNavigationConfirmation = true;
            this._pendingNavigationTarget = decision.target;
            this._pendingNavigationQuery = userMessage;
            
            console.log('[Ghost UI] Navigation suggested, awaiting user confirmation for:', decision.target.url);
            return; // Wait for user's next message (ja/nein/yes/no)
          }
          
          // Handle NAVIGATE action (auto-navigation enabled, high confidence)
          if (decision.action === 'NAVIGATE' && decision.target) {
            this._removeLoadingMessage(loadingMessage);
            
            // Check if confirmation is needed
            if (decision.requiresConfirmation) {
              // Show navigation confirmation and wait for user response
              const confirmed = await this._showNavigationConfirmation(decision.target);
              
              if (confirmed) {
                // User confirmed - announce and navigate
                await this._performNavigationWithAnnouncement(decision.target);
                return; // Navigation will reload the page
              } else {
                // User declined - fall through to answer mode
                console.log('[Ghost UI] Navigation declined by user');
                const newLoadingMessage = this._addMessage('', 'assistant', true);
                newLoadingMessage.innerHTML = `<span class="liquid-loading-indicator">${Icons.loading}</span> Generating response...`;
                
                // Answer the question instead
                const context = await this._getContextString();
                const truncatedContext = OpenAIService.truncateToTokenLimit(context, 8000);
                const response = await OpenAIService.chatWithContext(
                  userMessage,
                  truncatedContext,
                  this.messages.slice(-10),
                  { focusMode: this.isFocusMode }
                );
                
                this._removeLoadingMessage(newLoadingMessage);
                this._addMessage(response, 'assistant');
                return;
              }
            } else {
              // High confidence - navigate directly with announcement
              await this._performNavigationWithAnnouncement(decision.target);
              return; // Navigation will reload the page
            }
          }
          
          // Handle DISAMBIGUATE action - multiple matching pages found
          if (decision.action === 'DISAMBIGUATE' && decision.targets && decision.targets.length > 1) {
            this._removeLoadingMessage(loadingMessage);
            
            // Show disambiguation options to user
            const selectedTarget = await this._showDisambiguationDialog(decision.targets, decision.topic);
            
            if (selectedTarget) {
              // User selected a target - navigate there
              await this._performNavigationWithAnnouncement(selectedTarget);
              return; // Navigation will reload the page
            } else {
              // User cancelled - fall through to answer mode
              console.log('[Ghost UI] User cancelled disambiguation');
              const newLoadingMessage = this._addMessage('', 'assistant', true);
              newLoadingMessage.innerHTML = `<span class="liquid-loading-indicator">${Icons.loading}</span> Generating response...`;
              
              // Answer the question instead
              const context = await this._getContextString();
              const truncatedContext = OpenAIService.truncateToTokenLimit(context, 8000);
              const response = await OpenAIService.chatWithContext(
                userMessage,
                truncatedContext,
                this.messages.slice(-10),
                { focusMode: this.isFocusMode }
              );
              
              this._removeLoadingMessage(newLoadingMessage);
              this._addMessage(response, 'assistant');
              return;
            }
          }
          
          // Handle LOAD action - use existing subpage suggestion flow
          if (decision.action === 'LOAD') {
            // Continue to the existing subpage suggestion logic below
            console.log('[Ghost UI] Agent suggests loading subpages');
          }
          
          // Handle ANSWER action - skip to direct answer below
          // (This is the default case)
        }
        
        // ============================================
        // Existing Subpage Suggestion Logic
        // Focus Mode: Skip subpage suggestions when enabled
        // ============================================
        
        // Analyze if question might benefit from subpage context
        // Uses sitemap discovery for better URL awareness (token-efficient)
        // Skip this analysis entirely when Focus Mode is active
        const analysis = this.isFocusMode 
          ? { suggestSubpages: false, suggestions: [] }
          : await this.subpageManager.analyzeQuestionForSubpages(
              userMessage, 
              this.pageContext
            );

        // If subpages might help and we haven't maxed out, offer suggestions
        // (This block is skipped when Focus Mode is active)
        if (analysis.suggestSubpages && 
            this.subpageManager.canAddMore() && 
            analysis.suggestions.length > 0) {
          
          // Remove loading message temporarily
          this._removeLoadingMessage(loadingMessage);
          
          // Show subpage suggestions and wait for user decision
          const userApproved = await this._showSubpageSuggestionsAndWait(
            analysis.suggestions,
            analysis.reason
          );
          
          // Re-add loading message
          const newLoadingMessage = this._addMessage('', 'assistant', true);
          
          if (userApproved && this.subpageManager.getApprovedCount() > 0) {
            // User approved some subpages - load them
            newLoadingMessage.innerHTML = `<span class="liquid-loading-indicator">${Icons.loading}</span> Loading selected pages...`;
            await this.subpageManager.loadApprovedSubpages();
          }
          
          // Continue with generating response
          newLoadingMessage.innerHTML = `<span class="liquid-loading-indicator">${Icons.loading}</span> Generating response...`;
          
          // Get full context including any loaded subpages
          const fullContext = await this._getContextString();
          const truncatedContext = OpenAIService.truncateToTokenLimit(fullContext, 8000);
          
          // Call OpenAI
          const response = await OpenAIService.chatWithContext(
            userMessage,
            truncatedContext,
            this.messages.slice(-10),
            { focusMode: this.isFocusMode }
          );
          
          this._removeLoadingMessage(newLoadingMessage);
          
          // Show context indicator if subpages were included
          if (this.subpageManager.getApprovedCount() > 0) {
            const contextIndicator = this.ui.createSubpageContextIndicator(
              this.subpageManager.getSubpageSummary()
            );
            this.elements.messages.appendChild(contextIndicator);
          }
          
          this._addMessage(response, 'assistant');
          
        } else {
          // No subpage suggestions needed - answer directly
          loadingMessage.innerHTML = `<span class="liquid-loading-indicator">${Icons.loading}</span> Analyzing page content...`;
          
          // Get context (with any previously loaded subpages)
          const context = await this._getContextString();
          const truncatedContext = OpenAIService.truncateToTokenLimit(context, 8000);
          
          loadingMessage.innerHTML = `<span class="liquid-loading-indicator">${Icons.loading}</span> Generating response...`;
          
          // Call OpenAI
          const response = await OpenAIService.chatWithContext(
            userMessage,
            truncatedContext,
            this.messages.slice(-10),
            { focusMode: this.isFocusMode }
          );
          
          this._removeLoadingMessage(loadingMessage);
          this._addMessage(response, 'assistant');
        }

      } catch (error) {
        console.error('[Ghost UI] OpenAI error:', error);
        
        // Find and remove any loading messages
        const loadingMessages = this.elements.messages.querySelectorAll('.liquid-message.is-loading');
        loadingMessages.forEach(msg => msg.remove());
        
        // User-friendly error message
        let errorMessage = "Sorry, I encountered an error while processing your request.";
        
        if (error.message.includes('API key')) {
          errorMessage = "OpenAI API key is missing or invalid. Please configure your API key.";
        } else if (error.message.includes('rate limit')) {
          errorMessage = "Rate limit reached. Please wait a moment and try again.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
        
        this._addMessage(errorMessage, 'assistant');
      } finally {
        this.isProcessing = false;
        this._updateInputState(false);
        this.pendingQuestion = null;
        this.pendingNavigation = null;
        
        // Reset status text if voice dialogue is not active
        if (!this.voiceDialogue?.getIsActive()) {
          const statusSpan = this.elements.chat?.querySelector('.liquid-status span:last-child');
          if (statusSpan) {
            statusSpan.textContent = 'Ready';
          }
        }
      }
    }

    /**
     * Perform navigation with TTS announcement
     * Announces the navigation before redirecting
     * CRITICAL: Only navigates to validated URLs to prevent 404 errors
     * @param {Object} target - Navigation target with url and text
     */
    async _performNavigationWithAnnouncement(target) {
      const lang = this.languageManager?.currentLang || 'en';
      
      // CRITICAL: Validate URL before navigation to prevent 404 errors
      let validatedUrl = target.url;
      
      if (typeof URLValidator !== 'undefined') {
        // Check if already validated
        if (!target.isValidated) {
          console.log('[Ghost UI] Validating navigation target before announcement:', target.url);
          const validation = await URLValidator.validateUrl(target.url);
          
          if (!validation.valid) {
            // URL is not valid - fall back to text response
            console.warn('[Ghost UI] Navigation cancelled: URL validation failed:', target.url, validation.reason);
            
            const errorMessages = {
              'en': `I'm sorry, I couldn't find the ${target.text} page. It may have been moved or doesn't exist. Let me answer your question here instead.`,
              'de': `Es tut mir leid, ich konnte die ${target.text} Seite nicht finden. Sie wurde möglicherweise verschoben oder existiert nicht. Lass mich deine Frage stattdessen hier beantworten.`
            };
            
            this._addMessage(errorMessages[lang] || errorMessages['en'], 'assistant');
            return; // Don't navigate
          }
          
          // Use the validated/final URL
          validatedUrl = validation.finalUrl || target.url;
        }
      }
      
      // Create announcement message based on language
      const announcements = {
        'en': `I'll take you to the ${target.text} page.`,
        'de': `Ich bringe dich zur ${target.text} Seite.`
      };
      
      const announcement = announcements[lang] || announcements['en'];
      
      // Show announcement message (triggers TTS automatically)
      this._addMessage(announcement, 'assistant');
      
      // Wait for TTS to start speaking (short delay for immediate feedback)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Perform the navigation
      console.log('[Ghost UI] Navigating to validated URL:', validatedUrl);
      
      // Store navigation state for potential use after page load
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            'ghost-ui-last-navigation': {
              from: window.location.href,
              to: validatedUrl,
              timestamp: Date.now()
            }
          });
        }
      } catch (e) {
        // Silently fail storage
      }
      
      // Navigate to the validated URL
      window.location.href = validatedUrl;
    }

    /**
     * Show navigation confirmation dialog
     * Returns a promise that resolves to true if user confirms
     * @param {Object} target - Navigation target with url and text
     * @returns {Promise<boolean>}
     */
    _showNavigationConfirmation(target) {
      return new Promise((resolve) => {
        const lang = this.languageManager?.currentLang || 'en';
        
        // Create confirmation messages based on language
        const messages = {
          'en': {
            question: `I found the ${target.text} page. Would you like me to take you there?`,
            yes: 'Yes, go there',
            no: 'No, answer here'
          },
          'de': {
            question: `Ich habe die ${target.text} Seite gefunden. Möchtest du dorthin gehen?`,
            yes: 'Ja, dorthin gehen',
            no: 'Nein, hier antworten'
          }
        };
        
        const msg = messages[lang] || messages['en'];
        
        // Add confirmation message
        this._addMessage(msg.question, 'assistant');
        
        // Create confirmation buttons
        const confirmCard = document.createElement('div');
        confirmCard.className = 'liquid-navigation-confirm';
        confirmCard.innerHTML = `
          <div class="liquid-navigation-target">
            <span class="liquid-navigation-icon">${Icons.externalLink}</span>
            <span class="liquid-navigation-url">${this._shortenUrl(target.url)}</span>
          </div>
          <div class="liquid-navigation-actions">
            <button class="liquid-navigation-btn liquid-navigation-btn-yes">${msg.yes}</button>
            <button class="liquid-navigation-btn liquid-navigation-btn-no">${msg.no}</button>
          </div>
        `;
        
        // Bind click handlers
        const yesBtn = confirmCard.querySelector('.liquid-navigation-btn-yes');
        const noBtn = confirmCard.querySelector('.liquid-navigation-btn-no');
        
        yesBtn.addEventListener('click', () => {
          confirmCard.classList.add('is-confirmed');
          setTimeout(() => {
            confirmCard.remove();
            resolve(true);
          }, 200);
        });
        
        noBtn.addEventListener('click', () => {
          confirmCard.classList.add('is-declined');
          setTimeout(() => {
            confirmCard.remove();
            resolve(false);
          }, 200);
        });
        
        // Add to messages area
        this.elements.messages.appendChild(confirmCard);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        
        // Store pending navigation for potential voice response
        this.pendingNavigation = { target, resolve };
      });
    }

    /**
     * Show disambiguation dialog when multiple pages match the user's query
     * @param {Array} targets - Array of matching navigation targets
     * @param {string} topic - The detected topic (contact, pricing, etc.)
     * @returns {Promise<Object|null>} Selected target or null if cancelled
     */
    _showDisambiguationDialog(targets, topic) {
      return new Promise((resolve) => {
        const lang = this.languageManager?.currentLang || 'en';
        
        // Create disambiguation messages based on language
        const messages = {
          'en': {
            question: `I found multiple pages that might help. Which one would you like?`,
            cancel: 'Cancel'
          },
          'de': {
            question: `Ich habe mehrere passende Seiten gefunden. Welche möchtest du?`,
            cancel: 'Abbrechen'
          }
        };
        
        const msg = messages[lang] || messages['en'];
        
        // Add question message
        this._addMessage(msg.question, 'assistant');
        
        // Create disambiguation card
        const disambigCard = document.createElement('div');
        disambigCard.className = 'liquid-disambiguation-card';
        
        // Build options HTML
        const optionsHtml = targets.map((target, index) => `
          <button class="liquid-disambig-option" data-index="${index}">
            <span class="liquid-disambig-icon">${Icons.externalLink}</span>
            <span class="liquid-disambig-text">
              <span class="liquid-disambig-name">${target.displayName || target.text || 'Page'}</span>
              <span class="liquid-disambig-url">${this._shortenUrl(target.url)}</span>
            </span>
          </button>
        `).join('');
        
        disambigCard.innerHTML = `
          <div class="liquid-disambig-options">
            ${optionsHtml}
          </div>
          <button class="liquid-disambig-cancel">${msg.cancel}</button>
        `;
        
        // Bind click handlers for options
        disambigCard.querySelectorAll('.liquid-disambig-option').forEach(btn => {
          btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            const selectedTarget = targets[index];
            
            disambigCard.classList.add('is-selected');
            btn.classList.add('is-chosen');
            
            setTimeout(() => {
              disambigCard.remove();
              resolve(selectedTarget);
            }, 200);
          });
        });
        
        // Bind cancel button
        disambigCard.querySelector('.liquid-disambig-cancel').addEventListener('click', () => {
          disambigCard.classList.add('is-cancelled');
          setTimeout(() => {
            disambigCard.remove();
            resolve(null);
          }, 200);
        });
        
        // Add to messages area
        this.elements.messages.appendChild(disambigCard);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        
        // Store for potential voice response
        this.pendingDisambiguation = { targets, resolve };
      });
    }

    /**
     * Shorten URL for display
     * @param {string} url 
     * @returns {string}
     */
    _shortenUrl(url) {
      try {
        const parsed = new URL(url);
        const path = parsed.pathname;
        if (path.length > 40) {
          return path.substring(0, 37) + '...';
        }
        return path || '/';
      } catch {
        return url.substring(0, 40);
      }
    }

    /**
     * Handle navigation callback (from NavigationAgent)
     * @param {string} url - URL being navigated to
     */
    _handleNavigation(url) {
      console.log('[Ghost UI] Navigation handled:', url);
    }

    /**
     * Show subpage suggestions and wait for user approval
     * Returns a promise that resolves when user finishes selecting
     * @param {Array} suggestions - Suggested subpages
     * @param {string} reason - Why subpages are suggested
     * @returns {Promise<boolean>} - Whether user approved any subpages
     */
    _showSubpageSuggestionsAndWait(suggestions, reason) {
      return new Promise((resolve) => {
        // Add explanation message
        if (reason) {
          this._addMessage(reason, 'assistant');
        }
        
        // Create suggestion card with callbacks
        const suggestionCard = this.ui.createSubpageSuggestionCard(suggestions, {
          onApprove: (url, itemElement) => {
            const success = this.subpageManager.approveSubpage(url);
            if (success) {
              this.ui.markSubpageApproved(itemElement);
              console.log('[Ghost UI] Subpage approved:', url);
              
              // Check if we've reached the max
              if (!this.subpageManager.canAddMore()) {
                // Auto-proceed after max reached
                setTimeout(() => {
                  suggestionCard.remove();
                  resolve(true);
                }, 500);
              }
            }
          },
          onSkip: (url, itemElement) => {
            this.subpageManager.skipSubpage(url);
            this.ui.removeSubpageItem(itemElement);
            console.log('[Ghost UI] Subpage skipped:', url);
            
            // Check if all items are handled
            const remainingItems = suggestionCard.querySelectorAll('.liquid-subpage-item:not(.is-removed):not(.is-approved)');
            if (remainingItems.length === 0) {
              setTimeout(() => {
                suggestionCard.remove();
                resolve(this.subpageManager.getApprovedCount() > 0);
              }, 300);
            }
          },
          onSkipAll: (card) => {
            console.log('[Ghost UI] All subpages skipped');
            card.classList.add('is-dismissed');
            setTimeout(() => {
              card.remove();
              resolve(this.subpageManager.getApprovedCount() > 0);
            }, 300);
          }
        });
        
        // Add "Continue with selected" button if any are approved
        const continueBtn = document.createElement('button');
        continueBtn.className = 'liquid-subpage-continue';
        continueBtn.textContent = 'Continue with selected';
        continueBtn.style.display = 'none';
        
        continueBtn.addEventListener('click', () => {
          suggestionCard.remove();
          resolve(true);
        });
        
        suggestionCard.querySelector('.liquid-subpage-footer').appendChild(continueBtn);
        
        // Show continue button when at least one is approved
        const observer = new MutationObserver(() => {
          const hasApproved = suggestionCard.querySelector('.is-approved');
          continueBtn.style.display = hasApproved ? 'block' : 'none';
        });
        
        observer.observe(suggestionCard, { 
          subtree: true, 
          attributes: true, 
          attributeFilter: ['class'] 
        });
        
        // Add to messages area
        this.elements.messages.appendChild(suggestionCard);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
      });
    }

    /**
     * Update input area state during processing
     * @param {boolean} isProcessing 
     */
    _updateInputState(isProcessing) {
      if (this.elements.input) {
        this.elements.input.disabled = isProcessing;
      }
      if (this.elements.sendBtn) {
        this.elements.sendBtn.disabled = isProcessing;
        this.elements.sendBtn.classList.toggle('is-loading', isProcessing);
      }
      if (this.elements.micBtn) {
        this.elements.micBtn.disabled = isProcessing;
      }
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
      return this.languageManager.currentLang;
    }

    /**
     * Set language programmatically
     */
    setLanguage(lang) {
      this.languageManager.setLanguage(lang);
    }

    destroy() {
      // Deactivate voice dialogue
      if (this.voiceDialogue) {
        this.voiceDialogue.deactivate();
      }
      
      // Stop TTS before destroying
      if (this.tts) {
        this.tts.stop();
      }
      
      // Clear subpage data
      if (this.subpageManager) {
        this.subpageManager.clear();
      }
      
      // Disable Focus Mode effects before destroying
      if (this.isFocusMode) {
        this.isFocusMode = false;
        this.ui._disableFocusModeEffects();
      }
      
      // [FocusPlus Addon] Clean up the addon
      if (focusPlusAddon) {
        focusPlusAddon.focusPlusDestroy();
      }
      
      // [FocusPersonalization Addon] Clean up the addon
      if (focusPersonalizationAddon) {
        focusPersonalizationAddon.focusPersonalizationDestroy();
      }
      
      this.ui.destroy();
      this.speech = null;
      this.tts = null;
      this.voiceDialogue = null;
      this.subpageManager = null;
      this.navigationAgent = null;
      this.pendingNavigation = null;
      this.languageManager = null;
      this.elements = null;
      window.__liquidGlassInitialized = false;
    }
  }

  // ============================================
  // Initialize
  // ============================================
  async function bootstrap() {
    const chatbot = new Chatbot();
    await chatbot.init();
    
    // Expose for debugging/testing
    window.__ghostUI = chatbot;
    window.__liquidGlass = chatbot; // Legacy alias
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
