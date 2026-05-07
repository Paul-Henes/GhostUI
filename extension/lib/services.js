/**
 * Liquid Glass - Service Layer
 * 
 * This module provides the architecture for future API integrations.
 * All external service calls should go through this layer to maintain
 * clean separation between UI and business logic.
 * 
 * Services included:
 * - OpenAIService: Chat completions, streaming, function calling
 * - ElevenLabsService: Text-to-speech synthesis
 * - StorageService: Chrome storage for settings/credentials
 */

// ============================================
// Configuration Manager
// ============================================
const Config = {
  openai: {
    apiKey: null,
    model: 'gpt-4',
    maxTokens: 1024,
    temperature: 0.7,
    systemPrompt: 'You are a helpful, friendly AI assistant.'
  },
  elevenlabs: {
    apiKey: null,
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Default voice
    modelId: 'eleven_monolingual_v1',
    stability: 0.5,
    similarityBoost: 0.75
  }
};

// ============================================
// OpenAI Service
// ============================================
const OpenAIService = {
  /**
   * Initialize with API key
   * @param {string} apiKey 
   */
  init(apiKey) {
    Config.openai.apiKey = apiKey;
  },

  /**
   * Configure model parameters
   * @param {Object} options 
   */
  configure(options) {
    Object.assign(Config.openai, options);
  },

  /**
   * Send chat completion request
   * @param {Array} messages - Messages in OpenAI format
   * @returns {Promise<string>} - Assistant response
   * 
   * @example
   * const response = await OpenAIService.chat([
   *   { role: 'user', content: 'Hello!' }
   * ]);
   */
  async chat(messages) {
    if (!Config.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const payload = {
      model: Config.openai.model,
      messages: [
        { role: 'system', content: Config.openai.systemPrompt },
        ...messages
      ],
      max_tokens: Config.openai.maxTokens,
      temperature: Config.openai.temperature
    };

    // TODO: Implement actual API call
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${Config.openai.apiKey}`
    //   },
    //   body: JSON.stringify(payload)
    // });
    // const data = await response.json();
    // return data.choices[0].message.content;

    console.log('[Services] OpenAI chat called (placeholder)', payload);
    return 'OpenAI integration pending';
  },

  /**
   * Stream chat completion for real-time output
   * @param {Array} messages 
   * @param {Function} onChunk - Callback for each text chunk
   * @returns {Promise<void>}
   */
  async streamChat(messages, onChunk) {
    // TODO: Implement with ReadableStream
    console.log('[Services] OpenAI stream called (placeholder)');
    onChunk('Streaming integration pending');
  },

  /**
   * Format conversation history for API
   * @param {Array} history - Internal message format
   * @returns {Array} - OpenAI message format
   */
  formatMessages(history) {
    return history.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
  }
};

// ============================================
// ElevenLabs Service
// ============================================
const ElevenLabsService = {
  /**
   * Initialize with API key
   * @param {string} apiKey 
   */
  init(apiKey) {
    Config.elevenlabs.apiKey = apiKey;
  },

  /**
   * Configure voice parameters
   * @param {Object} options 
   */
  configure(options) {
    Object.assign(Config.elevenlabs, options);
  },

  /**
   * Convert text to speech
   * @param {string} text - Text to synthesize
   * @returns {Promise<ArrayBuffer>} - Audio data
   */
  async synthesize(text) {
    if (!Config.elevenlabs.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const { voiceId, modelId, stability, similarityBoost } = Config.elevenlabs;

    // TODO: Implement actual API call
    // const response = await fetch(
    //   `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'xi-api-key': Config.elevenlabs.apiKey
    //     },
    //     body: JSON.stringify({
    //       text,
    //       model_id: modelId,
    //       voice_settings: { stability, similarity_boost: similarityBoost }
    //     })
    //   }
    // );
    // return await response.arrayBuffer();

    console.log('[Services] ElevenLabs synthesis called (placeholder)', { text });
    return new ArrayBuffer(0);
  },

  /**
   * Play audio buffer
   * @param {ArrayBuffer} buffer 
   */
  async play(buffer) {
    if (!buffer || buffer.byteLength === 0) {
      console.warn('[Services] Empty audio buffer');
      return;
    }

    // TODO: Implement audio playback
    // const audioContext = new AudioContext();
    // const audioData = await audioContext.decodeAudioData(buffer);
    // const source = audioContext.createBufferSource();
    // source.buffer = audioData;
    // source.connect(audioContext.destination);
    // source.start(0);

    console.log('[Services] Audio playback called (placeholder)');
  },

  /**
   * Synthesize and play text
   * @param {string} text 
   */
  async speak(text) {
    const audio = await this.synthesize(text);
    await this.play(audio);
  }
};

// ============================================
// Storage Service (Chrome Storage API)
// ============================================
const StorageService = {
  KEYS: {
    CREDENTIALS: 'liquidGlassCredentials',
    SETTINGS: 'liquidGlassSettings',
    HISTORY: 'liquidGlassHistory'
  },

  /**
   * Save data to Chrome sync storage
   * @param {string} key 
   * @param {any} value 
   */
  async set(key, value) {
    // TODO: Use chrome.storage.sync when in extension context
    // await chrome.storage.sync.set({ [key]: value });
    
    // Fallback to localStorage for testing
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Services] Storage set failed:', e);
    }
  },

  /**
   * Retrieve data from storage
   * @param {string} key 
   * @returns {Promise<any>}
   */
  async get(key) {
    // TODO: Use chrome.storage.sync when in extension context
    // const result = await chrome.storage.sync.get(key);
    // return result[key];
    
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.warn('[Services] Storage get failed:', e);
      return null;
    }
  },

  /**
   * Remove data from storage
   * @param {string} key 
   */
  async remove(key) {
    // TODO: Use chrome.storage.sync
    // await chrome.storage.sync.remove(key);
    
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[Services] Storage remove failed:', e);
    }
  },

  /**
   * Save API credentials securely
   * @param {Object} credentials 
   */
  async saveCredentials(credentials) {
    await this.set(this.KEYS.CREDENTIALS, credentials);
    
    // Initialize services with saved credentials
    if (credentials.openaiKey) {
      OpenAIService.init(credentials.openaiKey);
    }
    if (credentials.elevenlabsKey) {
      ElevenLabsService.init(credentials.elevenlabsKey);
    }
  },

  /**
   * Load and apply saved credentials
   */
  async loadCredentials() {
    const creds = await this.get(this.KEYS.CREDENTIALS);
    if (creds) {
      if (creds.openaiKey) OpenAIService.init(creds.openaiKey);
      if (creds.elevenlabsKey) ElevenLabsService.init(creds.elevenlabsKey);
    }
    return creds;
  }
};

// ============================================
// Unified API Interface
// ============================================
const LiquidGlassAPI = {
  openai: OpenAIService,
  elevenlabs: ElevenLabsService,
  storage: StorageService,

  /**
   * Initialize all services
   */
  async init() {
    await StorageService.loadCredentials();
    console.log('[Services] API layer initialized');
  },

  /**
   * Process user message through AI pipeline
   * @param {string} message - User input
   * @param {Array} history - Conversation history
   * @param {Object} options - Processing options
   * @returns {Promise<string>} - AI response
   */
  async processMessage(message, history = [], options = {}) {
    const { speak = false } = options;

    // Format history for OpenAI
    const messages = OpenAIService.formatMessages(history);
    messages.push({ role: 'user', content: message });

    // Get AI response
    const response = await OpenAIService.chat(messages);

    // Optionally speak the response
    if (speak) {
      await ElevenLabsService.speak(response);
    }

    return response;
  }
};

// Export for use in extension
if (typeof window !== 'undefined') {
  window.LiquidGlassAPI = LiquidGlassAPI;
}
