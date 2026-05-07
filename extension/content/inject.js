/**
 * Ghost UI Voice Chatbot - Content Script Entry Point
 * 
 * This script is injected into every webpage and initializes
 * the floating chatbot UI.
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__ghostUIInitialized) {
    return;
  }
  window.__ghostUIInitialized = true;

  // ============================================
  // SVG Icons
  // ============================================
  const icons = {
    chat: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
      <path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/>
    </svg>`,
    close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>`,
    mic: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>`,
    send: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>`,
    bot: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13A1.5 1.5 0 006 14.5 1.5 1.5 0 007.5 16 1.5 1.5 0 009 14.5 1.5 1.5 0 007.5 13zm9 0a1.5 1.5 0 00-1.5 1.5 1.5 1.5 0 001.5 1.5 1.5 1.5 0 001.5-1.5 1.5 1.5 0 00-1.5-1.5zM9 18h6v2H9v-2z"/>
    </svg>`,
    plus: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>`
  };

  // ============================================
  // Speech Recognition Handler
  // ============================================
  class SpeechHandler {
    constructor(onResult, onStateChange) {
      this.onResult = onResult;
      this.onStateChange = onStateChange;
      this.recognition = null;
      this.isRecording = false;
      this.init();
    }

    init() {
      // Check for browser support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('[Ghost UI] Speech recognition not supported in this browser');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        const isFinal = event.results[event.results.length - 1].isFinal;
        this.onResult(transcript, isFinal);
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.onStateChange(false);
      };

      this.recognition.onerror = (event) => {
        console.warn('[Ghost UI] Speech recognition error:', event.error);
        this.isRecording = false;
        this.onStateChange(false);
      };
    }

    toggle() {
      if (!this.recognition) {
        alert('Speech recognition is not supported in your browser. Please use Chrome for best results.');
        return;
      }

      if (this.isRecording) {
        this.stop();
      } else {
        this.start();
      }
    }

    start() {
      if (!this.recognition || this.isRecording) return;
      
      try {
        this.recognition.start();
        this.isRecording = true;
        this.onStateChange(true);
      } catch (error) {
        console.warn('[Ghost UI] Failed to start speech recognition:', error);
      }
    }

    stop() {
      if (!this.recognition || !this.isRecording) return;
      
      this.recognition.stop();
      this.isRecording = false;
      this.onStateChange(false);
    }

    isSupported() {
      return this.recognition !== null;
    }
  }

  // ============================================
  // Chatbot UI Class
  // ============================================
  class GhostChatbot {
    constructor() {
      this.isOpen = false;
      this.messages = [];
      this.container = null;
      this.chatWindow = null;
      this.messagesContainer = null;
      this.textInput = null;
      this.fab = null;
      this.speechHandler = null;
      
      this.init();
    }

    init() {
      this.createContainer();
      this.createFAB();
      this.createChatWindow();
      this.initSpeechHandler();
      this.attachEventListeners();
      
      console.log('[Ghost UI] Chatbot initialized');
    }

    createContainer() {
      this.container = document.createElement('div');
      this.container.id = 'ghost-ui-container';
      document.body.appendChild(this.container);
    }

    createFAB() {
      this.fab = document.createElement('button');
      this.fab.className = 'ghost-fab';
      this.fab.setAttribute('aria-label', 'Open chat');
      this.fab.innerHTML = icons.chat;
      this.container.appendChild(this.fab);
    }

    createChatWindow() {
      this.chatWindow = document.createElement('div');
      this.chatWindow.className = 'ghost-chat';
      this.chatWindow.innerHTML = `
        <div class="ghost-chat-header">
          <div class="ghost-chat-title">
            ${icons.bot}
            <span>Ghost Assistant</span>
          </div>
          <div class="ghost-chat-status">
            <span class="ghost-status-dot"></span>
            <span>Online</span>
          </div>
          <button class="ghost-close-btn" aria-label="Close chat">
            ${icons.close}
          </button>
        </div>
        
        <div class="ghost-chat-messages">
          <div class="ghost-welcome">
            ${icons.bot}
            <h3>Welcome to Ghost UI</h3>
            <p>Type a message or use voice input to get started.</p>
          </div>
        </div>
        
        <div class="ghost-chat-input">
          <div class="ghost-input-wrapper">
            <input 
              type="text" 
              class="ghost-text-input" 
              placeholder="Type your message..."
              aria-label="Message input"
            />
            <button class="ghost-input-btn ghost-mic-btn" aria-label="Voice input">
              ${icons.mic}
            </button>
            <button class="ghost-input-btn ghost-send-btn" aria-label="Send message">
              ${icons.send}
            </button>
          </div>
        </div>
      `;
      
      this.container.appendChild(this.chatWindow);
      
      // Cache DOM references
      this.messagesContainer = this.chatWindow.querySelector('.ghost-chat-messages');
      this.textInput = this.chatWindow.querySelector('.ghost-text-input');
    }

    initSpeechHandler() {
      this.speechHandler = new SpeechHandler(
        // On speech result
        (transcript, isFinal) => {
          this.textInput.value = transcript;
          if (isFinal) {
            // Optionally auto-send on final result
            // this.sendMessage();
          }
        },
        // On state change
        (isRecording) => {
          const micBtn = this.chatWindow.querySelector('.ghost-mic-btn');
          micBtn.classList.toggle('is-recording', isRecording);
          micBtn.setAttribute('aria-label', isRecording ? 'Stop recording' : 'Voice input');
        }
      );
    }

    attachEventListeners() {
      // FAB click - toggle chat
      this.fab.addEventListener('click', () => this.toggle());

      // Close button
      const closeBtn = this.chatWindow.querySelector('.ghost-close-btn');
      closeBtn.addEventListener('click', () => this.close());

      // Send button
      const sendBtn = this.chatWindow.querySelector('.ghost-send-btn');
      sendBtn.addEventListener('click', () => this.sendMessage());

      // Mic button
      const micBtn = this.chatWindow.querySelector('.ghost-mic-btn');
      micBtn.addEventListener('click', () => this.toggleVoiceInput());

      // Enter key to send
      this.textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Close on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      this.fab.classList.add('is-open');
      this.fab.innerHTML = icons.plus;
      this.fab.setAttribute('aria-label', 'Close chat');
      this.chatWindow.classList.add('is-visible');
      
      // Focus input after animation
      setTimeout(() => {
        this.textInput.focus();
      }, 300);
    }

    close() {
      this.isOpen = false;
      this.fab.classList.remove('is-open');
      this.fab.innerHTML = icons.chat;
      this.fab.setAttribute('aria-label', 'Open chat');
      this.chatWindow.classList.remove('is-visible');
      
      // Stop recording if active
      if (this.speechHandler) {
        this.speechHandler.stop();
      }
    }

    toggleVoiceInput() {
      if (this.speechHandler) {
        this.speechHandler.toggle();
      }
    }

    sendMessage() {
      const text = this.textInput.value.trim();
      if (!text) return;

      // Clear welcome message on first send
      const welcome = this.messagesContainer.querySelector('.ghost-welcome');
      if (welcome) {
        welcome.remove();
      }

      // Add user message
      this.addMessage(text, 'user');
      this.textInput.value = '';

      // Simulate bot response (for UI testing)
      this.simulateBotResponse(text);
    }

    addMessage(text, type) {
      const message = document.createElement('div');
      message.className = `ghost-message is-${type}`;
      message.textContent = text;
      
      this.messagesContainer.appendChild(message);
      this.messages.push({ text, type, timestamp: Date.now() });
      
      // Scroll to bottom
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * Simulate a bot response (placeholder for future API integration)
     * This method will be replaced with actual OpenAI/ElevenLabs calls
     */
    simulateBotResponse(userMessage) {
      // Simulate typing delay
      setTimeout(() => {
        const responses = [
          "I received your message. This is a demo response.",
          "Thanks for testing! AI integration coming soon.",
          "Voice and chat features are ready for API connection.",
          "This placeholder will be replaced with real AI responses.",
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        this.addMessage(randomResponse, 'bot');
      }, 800);
    }
  }

  // ============================================
  // Initialize on DOM ready
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new GhostChatbot();
    });
  } else {
    new GhostChatbot();
  }

})();
