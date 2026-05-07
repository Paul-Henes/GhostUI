/**
 * Ghost UI - OpenAI Service
 * 
 * Handles all OpenAI API interactions for the chatbot.
 * Features:
 * - Chat completions with website context
 * - Secure API key management
 * - Token-aware context handling
 * - Error handling and retries
 */

const OpenAIService = {
  // Configuration
  config: {
    apiKey: null,
    model: 'gpt-4o-mini', // Cost-effective model with good performance
    maxTokens: 1024,
    temperature: 0.7,
    apiUrl: 'https://api.openai.com/v1/chat/completions'
  },

  // Storage key for API key
  STORAGE_KEY: 'ghost-ui-openai-key',

  // System prompts
  prompts: {
    default: `You are Ghost, a voice AI assistant in a Chrome extension. You can see the current webpage content.

CRITICAL: Keep responses SHORT (1-3 sentences max). Your answers will be read aloud.
- Answer directly and concisely
- No bullet points or formatting - use natural spoken language
- If info isn't on the page, say so briefly`,

    websiteAnalysis: `You are Ghost, a voice AI assistant that explains website content. You see the current page and possibly linked pages.

CRITICAL: Keep responses SHORT (1-3 sentences max). Your answers will be read aloud.
- Answer in natural spoken language, no formatting
- Be direct and concise
- If info isn't available, say so briefly`,

    // Focus Mode: Extra short, calm, explanatory responses
    focusMode: `You are Ghost, a voice AI assistant in Focus Mode - helping the user concentrate.

FOCUS MODE RULES:
- Keep responses VERY SHORT (1-2 sentences only)
- Be calm and reassuring
- Explain concepts simply and clearly
- Do NOT suggest navigating to other pages
- Do NOT suggest loading additional content
- Stay focused on the user's immediate question
- If you don't have the answer, say so briefly without offering alternatives`
  },

  /**
   * Initialize the service
   * Loads API key from storage
   */
  async init() {
    await this._loadApiKey();
    console.log('[Ghost UI] OpenAI service initialized');
    return this.isConfigured();
  },

  /**
   * Check if API key is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.config.apiKey;
  },

  /**
   * Set the API key
   * @param {string} apiKey 
   */
  async setApiKey(apiKey) {
    this.config.apiKey = apiKey;
    await this._saveApiKey(apiKey);
  },

  /**
   * Load API key from Chrome storage
   */
  async _loadApiKey() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([this.STORAGE_KEY], (result) => {
          if (result[this.STORAGE_KEY]) {
            this.config.apiKey = result[this.STORAGE_KEY];
          }
          resolve();
        });
      } else {
        // Fallback to localStorage for testing
        try {
          const key = localStorage.getItem(this.STORAGE_KEY);
          if (key) {
            this.config.apiKey = key;
          }
        } catch (e) {
          console.warn('[Ghost UI] Could not access localStorage');
        }
        resolve();
      }
    });
  },

  /**
   * Save API key to Chrome storage
   * @param {string} apiKey 
   */
  async _saveApiKey(apiKey) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [this.STORAGE_KEY]: apiKey }, resolve);
      } else {
        try {
          localStorage.setItem(this.STORAGE_KEY, apiKey);
        } catch (e) {
          console.warn('[Ghost UI] Could not save to localStorage');
        }
        resolve();
      }
    });
  },

  /**
   * Configure the service
   * @param {Object} options 
   */
  configure(options) {
    Object.assign(this.config, options);
  },

  /**
   * Send a chat completion request
   * @param {Array} messages - Messages in OpenAI format
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Assistant response
   */
  async chat(messages, options = {}) {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured. Please set your API key in the extension settings.');
    }

    const {
      systemPrompt = this.prompts.default,
      maxTokens = this.config.maxTokens,
      temperature = this.config.temperature
    } = options;

    const payload = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: maxTokens,
      temperature: temperature
    };

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('[Ghost UI] OpenAI API error:', error);
      throw error;
    }
  },

  /**
   * Chat with website context
   * @param {string} userMessage - User's question
   * @param {string} pageContext - Extracted page content
   * @param {Array} history - Conversation history
   * @param {Object} options - Additional options
   * @param {boolean} options.focusMode - Whether Focus Mode is active (shorter responses)
   * @returns {Promise<string>} - AI response
   */
  async chatWithContext(userMessage, pageContext, history = [], options = {}) {
    const { focusMode = false } = options;
    
    // Build messages array
    const messages = [];

    // Add conversation history
    history.forEach(msg => {
      messages.push({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });

    // Add current message with context
    const contextMessage = `Here is the current webpage content:

${pageContext}

---

User question: ${userMessage}`;

    messages.push({
      role: 'user',
      content: contextMessage
    });

    // Use Focus Mode prompt for shorter, calmer responses
    const systemPrompt = focusMode ? this.prompts.focusMode : this.prompts.websiteAnalysis;
    const maxTokens = focusMode ? 500 : 1500; // Shorter responses in Focus Mode

    return this.chat(messages, {
      systemPrompt,
      maxTokens
    });
  },

  /**
   * Summarize webpage content
   * @param {string} pageContext - Extracted page content
   * @returns {Promise<string>} - Summary
   */
  async summarizePage(pageContext) {
    const messages = [{
      role: 'user',
      content: `Please provide a concise summary of this webpage content:

${pageContext}

Provide:
1. Main topic/purpose of the page
2. Key points (3-5 bullet points)
3. Any important details or calls to action`
    }];

    return this.chat(messages, {
      systemPrompt: 'You are a helpful assistant that creates clear, concise summaries of webpage content.',
      maxTokens: 500
    });
  },

  /**
   * Answer a specific question about the page
   * @param {string} question - User's question
   * @param {string} pageContext - Page content
   * @returns {Promise<string>} - Answer
   */
  async answerQuestion(question, pageContext) {
    const messages = [{
      role: 'user',
      content: `Based on this webpage content:

${pageContext}

---

Please answer this question: ${question}

If the answer isn't available in the provided content, clearly state that.`
    }];

    return this.chat(messages, {
      systemPrompt: this.prompts.websiteAnalysis,
      maxTokens: 800
    });
  },

  /**
   * Detect if a question requires subpage access
   * @param {string} question - User's question
   * @param {Object} pageData - Current page data with links
   * @returns {Promise<Object>} - Analysis result with suggested pages
   */
  async analyzeQuestionScope(question, pageData) {
    // Check if question seems to need more context
    const scopeKeywords = [
      'entire site', 'whole website', 'all pages', 'other pages',
      'linked pages', 'related pages', 'more information',
      'elsewhere', 'another page', 'different page'
    ];

    const needsMoreContext = scopeKeywords.some(kw => 
      question.toLowerCase().includes(kw)
    );

    // Get relevant internal links
    const internalLinks = pageData.links
      .filter(l => l.isSameOrigin)
      .slice(0, 5);

    return {
      needsMoreContext,
      suggestedPages: needsMoreContext ? internalLinks : [],
      currentPageOnly: !needsMoreContext
    };
  },

  /**
   * Stream chat completion (for real-time responses)
   * @param {Array} messages - Chat messages
   * @param {Function} onChunk - Callback for each text chunk
   * @param {Object} options - Additional options
   */
  async streamChat(messages, onChunk, options = {}) {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      systemPrompt = this.prompts.default,
      maxTokens = this.config.maxTokens,
      temperature = this.config.temperature
    } = options;

    const payload = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      stream: true
    };

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('[Ghost UI] Stream error:', error);
      throw error;
    }
  },

  /**
   * Estimate token count for a string
   * Rough estimation: ~4 characters per token
   * @param {string} text 
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  },

  /**
   * Truncate context to fit token limit
   * @param {string} context - Content to truncate
   * @param {number} maxTokens - Maximum tokens
   * @returns {string} Truncated content
   */
  truncateToTokenLimit(context, maxTokens = 8000) {
    const estimatedTokens = this.estimateTokens(context);
    
    if (estimatedTokens <= maxTokens) {
      return context;
    }

    const ratio = maxTokens / estimatedTokens;
    const targetLength = Math.floor(context.length * ratio * 0.9); // 10% buffer
    
    return context.substring(0, targetLength) + '\n\n[Content truncated due to length...]';
  }
};

// Export for use in extension
if (typeof window !== 'undefined') {
  window.OpenAIService = OpenAIService;
}
