// sidebar chat functionality - AI assistant interface
console.log('Sidebar Chat loaded');

class SidebarChat {
  constructor() {
    this.chatMessages = [];
    this.currentTabId = null;
    this.isProcessing = false;
    this.processingState = null; // 'thinking', 'reasoning', 'contextualizing'
    this.init();
  }

  async init() {
    // get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTabId = tabs[0]?.id;

    // load chat history
    await this.loadChatHistory();

    // attach event listeners
    this.attachEventListeners();

    // render chat
    this.renderChat();

    // update context badge
    this.updateContextBadge();
  }

  attachEventListeners() {
    // send message
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');

    sendBtn.addEventListener('click', () => this.sendMessage());
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // auto-resize textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // context toggle
    const contextToggle = document.getElementById('context-badge-toggle');
    contextToggle.addEventListener('click', () => this.toggleContextDetails());

    // clear chat
    const clearBtn = document.getElementById('clear-chat-btn');
    clearBtn.addEventListener('click', () => this.clearChat());

    // export chat
    const exportBtn = document.getElementById('export-chat-btn');
    exportBtn.addEventListener('click', () => this.exportChat());

    // listen for AI responses
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'chatResponse') {
        this.handleAIResponse(request.data);
      } else if (request.action === 'processingState') {
        this.updateProcessingState(request.state);
      }
    });
  }

  toggleContextDetails() {
    const contextDetails = document.getElementById('context-details');
    const toggleIcon = document.querySelector('.toggle-icon');
    const header = document.getElementById('context-badge-toggle');

    if (contextDetails.classList.contains('collapsed')) {
      contextDetails.classList.remove('collapsed');
      header.classList.add('expanded');
    } else {
      contextDetails.classList.add('collapsed');
      header.classList.remove('expanded');
    }
  }

  async loadChatHistory() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getChatHistory',
        tabId: this.currentTabId
      });

      if (response && response.history) {
        this.chatMessages = response.history;
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  renderChat() {
    const chatContainer = document.getElementById('chat-messages');

    if (this.chatMessages.length === 0) {
      chatContainer.innerHTML = `
        <div class="chat-empty">
          <div class="icon">⚡</div>
          <div class="title">Ask me anything!</div>
          <div class="subtitle">I can help with page content, general knowledge, and cross-tab insights</div>
        </div>
      `;
      return;
    }

    chatContainer.innerHTML = this.chatMessages.map(msg => this.createMessageHTML(msg)).join('');
    
    // scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  createMessageHTML(message) {
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const role = message.role === 'user' ? 'user' : 'assistant';

    return `
      <div class="message ${role}">
        <div class="message-content">${this.escapeHTML(message.content)}</div>
        <div class="message-timestamp">${time}</div>
        ${role === 'assistant' ? '<div class="message-actions"><button class="message-action-btn">Copy</button></div>' : ''}
      </div>
    `;
  }

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || this.isProcessing) return;

    // add user message to chat
    this.addMessage('user', message);

    // clear input
    input.value = '';
    input.style.height = 'auto';

    // show thinking indicator
    this.isProcessing = true;
    this.showThinkingIndicator('thinking');

    // check if context should be included
    const includeContext = document.getElementById('context-toggle').checked;

    try {
      // send to background for AI processing
      const response = await chrome.runtime.sendMessage({
        action: 'chat',
        message: message,
        tabId: this.currentTabId,
        includeContext: includeContext
      });

      if (response.success) {
        this.addMessage('assistant', response.response);
      } else {
        this.addMessage('assistant', response.response || 'Sorry, I encountered an error.');
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
      this.isProcessing = false;
      this.hideThinkingIndicator();
    }
  }

  addMessage(role, content) {
    const message = {
      role: role,
      content: content,
      timestamp: Date.now(),
      tabId: this.currentTabId
    };

    this.chatMessages.push(message);
    this.renderChat();
  }

  showThinkingIndicator(state) {
    this.processingState = state;
    const chatContainer = document.getElementById('chat-messages');
    
    const indicators = {
      thinking: { icon: '🧠', text: 'Thinking' },
      reasoning: { icon: '🔍', text: 'Reasoning' },
      contextualizing: { icon: '🔗', text: 'Contextualizing' }
    };

    const indicator = indicators[state] || indicators.thinking;
    
    const thinkingHTML = `
      <div class="thinking-indicator ${state}" id="thinking-indicator">
        <span class="icon">${indicator.icon}</span>
        <span class="text">
          ${indicator.text}<span class="animated-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
        </span>
      </div>
    `;

    const existing = document.getElementById('thinking-indicator');
    if (existing) {
      existing.outerHTML = thinkingHTML;
    } else {
      chatContainer.insertAdjacentHTML('beforeend', thinkingHTML);
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  updateProcessingState(state) {
    if (this.isProcessing) {
      this.showThinkingIndicator(state);
    }
  }

  hideThinkingIndicator() {
    const indicator = document.getElementById('thinking-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  handleAIResponse(data) {
    // handle streaming or chunked responses if needed
    if (data.chunk) {
      // append to last message
      const lastMessage = this.chatMessages[this.chatMessages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content += data.chunk;
        this.renderChat();
      }
    }
  }

  async clearChat() {
    if (confirm('Clear chat history for this tab?')) {
      try {
        await chrome.runtime.sendMessage({
          action: 'clearChatHistory',
          tabId: this.currentTabId
        });

        this.chatMessages = [];
        this.renderChat();
      } catch (error) {
        console.error('Failed to clear chat:', error);
      }
    }
  }

  exportChat() {
    const markdown = this.chatMessages.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const time = new Date(msg.timestamp).toLocaleString();
      return `**${role}** (${time}):\n${msg.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async updateContextBadge() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (tab) {
        const activityText = document.getElementById('activity-text');
        activityText.textContent = `Reading: ${tab.title || 'Current Page'}`;
      }
    } catch (error) {
      console.error('Failed to update context badge:', error);
    }
  }
}

// initialize when DOM loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sidebarChat = new SidebarChat();
  });
} else {
  window.sidebarChat = new SidebarChat();
}

