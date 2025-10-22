// this runs on every webpage and creates the floating pill
console.log('Context-Link content script loaded');

// listen for contextual insights from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateInsight') {
    if (window.floatingPill) {
      window.floatingPill.updateContextualInsight(request.data);
    }
  }
});

// main class that handles the floating pill
class FloatingPill {
  constructor() {
    this.pill = null;
    this.isExpanded = false;
    this.isProcessing = false;
    this.contextualInsight = null;
    this.init();
  }

  // setup the pill when page loads
  init() {
    this.createPill();
    this.attachEventListeners();
    this.checkForArticle();
    this.loadContextualInsights();
    
    // store reference globally for message listener
    window.floatingPill = this;
  }

  // creates the HTML for the floating pill
  createPill() {
    // build the pill HTML structure
    this.pill = document.createElement('div');
    this.pill.id = 'context-link-pill';
    
    this.pill.innerHTML = `
      <div class="liquid-glass-pill">
        <div class="pill-icon">⚡</div>
        <span class="pill-text">exTendifAI</span>
        <div class="pill-status" id="pill-status"></div>
        <div class="pill-content">
          <div class="pill-title">Analyzing page...</div>
          <div class="pill-summary">Extracting entities and claims</div>
        </div>
        <div class="pill-actions">
          <button class="pill-btn" id="chat-btn">Chat</button>
          <button class="pill-btn" id="capture-btn">Capture</button>
          <button class="pill-btn" id="compare-btn">Compare</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.pill);
    
    // fade in the pill with animation
    setTimeout(() => {
      this.pill.style.opacity = '1';
      this.pill.style.transform = 'translateY(0)';
    }, 100);
  }

  // handle clicks and hover events
  attachEventListeners() {
    const pillElement = this.pill.querySelector('.liquid-glass-pill');
    const chatBtn = this.pill.querySelector('#chat-btn');
    const captureBtn = this.pill.querySelector('#capture-btn');
    const compareBtn = this.pill.querySelector('#compare-btn');
    const pillIcon = this.pill.querySelector('.pill-icon');

    // pill icon opens chat overlay
    pillIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openMiniChat();
    });

    // make pill expand when clicked
    pillElement.addEventListener('click', (e) => {
      if (e.target.classList.contains('pill-btn') || e.target.classList.contains('pill-icon')) return;
      this.toggleExpanded();
    });

    // chat button opens mini chat overlay
    chatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openMiniChat();
    });

    // capture button saves the page
    captureBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.capturePage();
    });

    // compare button opens comparison view
    compareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showComparison();
    });

    // show preview on hover
    pillElement.addEventListener('mouseenter', () => {
      if (!this.isExpanded) {
        this.showPreview();
      }
    });

    pillElement.addEventListener('mouseleave', () => {
      if (!this.isExpanded) {
        this.hidePreview();
      }
    });
  }

  // expand or collapse the pill
  toggleExpanded() {
    const pillElement = this.pill.querySelector('.liquid-glass-pill');
    this.isExpanded = !this.isExpanded;
    
    if (this.isExpanded) {
      pillElement.classList.add('expanded');
      this.updateContent();
    } else {
      pillElement.classList.remove('expanded');
    }
  }

  // lift up pill on hover
  showPreview() {
    const pillElement = this.pill.querySelector('.liquid-glass-pill');
    pillElement.style.transform = 'translateY(-2px) scale(1.05)';
  }

  // put pill back down when not hovering
  hidePreview() {
    const pillElement = this.pill.querySelector('.liquid-glass-pill');
    pillElement.style.transform = 'translateY(0) scale(1)';
  }

  // update the text inside the pill with page info
  updateContent() {
    const title = document.title;
    const url = window.location.href;
    
    const titleElement = this.pill.querySelector('.pill-title');
    const summaryElement = this.pill.querySelector('.pill-summary');
    
    titleElement.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title;
    summaryElement.textContent = this.extractPageSummary();
  }

  // get a short summary of the page for preview
  extractPageSummary() {
    // grab first few paragraphs
    const paragraphs = document.querySelectorAll('p');
    let text = '';
    
    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
      text += paragraphs[i].textContent + ' ';
    }
    
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  // send page content to background script for AI processing
  async capturePage() {
    if (this.isProcessing) return;
    
    this.setProcessing(true);
    
    try {
      // get all the text from the page
      const pageData = this.extractPageData();
      
      // send it to background script
      const response = await chrome.runtime.sendMessage({
        action: 'capturePage',
        data: pageData
      });
      
      if (response.success) {
        this.setStatus('success');
        this.updateStatusText('Page captured!');
        setTimeout(() => {
          this.setStatus('idle');
          this.updateStatusText('');
        }, 2000);
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('Capture failed:', error);
      this.setStatus('error');
      this.updateStatusText('Capture failed');
      setTimeout(() => {
        this.setStatus('idle');
        this.updateStatusText('');
      }, 3000);
    }
    
    this.setProcessing(false);
  }

  // get the main content from the webpage
  extractPageData() {
    // try to find the main article content
    const title = document.title;
    const url = window.location.href;
    
    // look for article tags or main content areas
    let content = '';
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.content',
      '.article-content',
      '.post-content',
      'main',
      '.main-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = element.textContent;
        break;
      }
    }
    
    // if no article found just use the whole page
    if (!content) {
      content = document.body.textContent;
    }
    
    // remove extra whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    return {
      title,
      url,
      content: content.substring(0, 10000), // Limit content size
      timestamp: new Date().toISOString()
    };
  }

  // open the comparison view
  async showComparison() {
    try {
      // get all saved pages
      const response = await chrome.runtime.sendMessage({
        action: 'getCapturedPages'
      });
      
      if (response.pages && response.pages.length >= 2) {
        // open the sidebar
        chrome.runtime.sendMessage({
          action: 'openSidebar'
        });
      } else {
        this.updateStatusText('Need 2+ pages to compare');
        setTimeout(() => {
          this.updateStatusText('');
        }, 2000);
      }
    } catch (error) {
      console.error('Comparison failed:', error);
    }
  }

  // show loading state
  setProcessing(processing) {
    this.isProcessing = processing;
    const statusElement = this.pill.querySelector('#pill-status');
    
    if (processing) {
      statusElement.classList.add('processing');
      statusElement.classList.remove('error');
    } else {
      statusElement.classList.remove('processing');
    }
  }

  // change the colored dot status
  setStatus(status) {
    const statusElement = this.pill.querySelector('#pill-status');
    statusElement.className = `pill-status ${status}`;
  }

  // update the text that shows below the title
  updateStatusText(text) {
    const summaryElement = this.pill.querySelector('.pill-summary');
    summaryElement.textContent = text;
  }

  // check if this page has article content worth capturing
  checkForArticle() {
    // look for article elements
    const hasArticle = document.querySelector('article') || 
                      document.querySelector('[role="main"]') ||
                      document.querySelector('.content');
    
    if (hasArticle) {
      this.setStatus('idle');
      this.updateStatusText('Ready to capture');
    } else {
      this.setStatus('error');
      this.updateStatusText('No article content found');
    }
  }

  // load contextual insights from storage
  async loadContextualInsights() {
    try {
      const result = await chrome.storage.local.get(['contextualInsights']);
      if (result.contextualInsights) {
        this.updateContextualInsight(result.contextualInsights);
      }
    } catch (error) {
      console.error('Failed to load contextual insights:', error);
    }
  }

  // update pill with contextual insights
  updateContextualInsight(insightData) {
    this.contextualInsight = insightData;
    
    if (insightData.activity && insightData.insights) {
      // update pill text to show context
      const pillText = this.pill.querySelector('.pill-text');
      const statusElement = this.pill.querySelector('#pill-status');
      
      // show contextual activity
      pillText.textContent = this.getContextualText(insightData.activity);
      statusElement.className = `pill-status ${this.getContextualStatus(insightData.activity)}`;
      
      // update expanded content if open
      if (this.isExpanded) {
        this.updateContent();
      }
      
      // show brief insight
      this.updateStatusText(insightData.insights);
      
      // add animation for new insights
      this.showInsightAnimation();
    }
  }

  // get contextual text based on activity
  getContextualText(activity) {
    switch (activity) {
      case 'studying': return 'Studying';
      case 'shopping': return 'Shopping';
      case 'researching': return 'Researching';
      case 'browsing': return 'Context-Link';
      default: return 'Context-Link';
    }
  }

  // get contextual status color
  getContextualStatus(activity) {
    switch (activity) {
      case 'studying': return 'success';
      case 'shopping': return 'processing';
      case 'researching': return 'idle';
      default: return 'idle';
    }
  }

  // show animation when new insights are detected
  showInsightAnimation() {
    const pillElement = this.pill.querySelector('.liquid-glass-pill');
    pillElement.style.animation = 'pulse 0.5s ease-in-out';
    
    setTimeout(() => {
      pillElement.style.animation = '';
    }, 500);
  }

  // update content with contextual information
  updateContent() {
    const title = document.title;
    const url = window.location.href;
    
    const titleElement = this.pill.querySelector('.pill-title');
    const summaryElement = this.pill.querySelector('.pill-summary');
    
    titleElement.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title;
    
    // show contextual insight if available
    if (this.contextualInsight && this.contextualInsight.insights) {
      summaryElement.textContent = this.contextualInsight.insights;
    } else {
      summaryElement.textContent = this.extractPageSummary();
    }
  }

  // open mini chat overlay
  openMiniChat() {
    // check if overlay already exists
    let overlay = document.getElementById('extendif-chat-overlay');
    
    if (overlay) {
      overlay.style.display = 'flex';
      return;
    }

    // create chat overlay
    overlay = document.createElement('div');
    overlay.id = 'extendif-chat-overlay';
    overlay.className = 'chat-overlay';
    
    overlay.innerHTML = `
      <div class="chat-overlay-backdrop"></div>
      <div class="mini-chat-container">
        <div class="mini-chat-header">
          <div class="chat-header-title">
            <span class="chat-icon">⚡</span>
            <span>exTendifAI</span>
          </div>
          <div class="chat-header-actions">
            <button class="icon-btn" id="open-sidebar-btn" title="Open in sidebar">↗️</button>
            <button class="icon-btn" id="close-chat-btn">×</button>
          </div>
        </div>
        
        <div class="mini-chat-messages" id="mini-chat-messages">
          <div class="chat-empty">
            <div class="icon">⚡</div>
            <div class="title">Ask me anything!</div>
            <div class="subtitle">Quick chat powered by Gemini Nano</div>
          </div>
        </div>
        
        <div class="mini-chat-input-container">
          <textarea 
            id="mini-chat-input" 
            class="mini-chat-input" 
            placeholder="Ask me anything..."
            rows="1"
          ></textarea>
          <button id="mini-send-btn" class="mini-send-btn">⚡</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // attach event listeners
    this.attachMiniChatListeners(overlay);

    // fade in animation
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 10);
  }

  attachMiniChatListeners(overlay) {
    const closeBtn = overlay.querySelector('#close-chat-btn');
    const backdrop = overlay.querySelector('.chat-overlay-backdrop');
    const openSidebarBtn = overlay.querySelector('#open-sidebar-btn');
    const sendBtn = overlay.querySelector('#mini-send-btn');
    const input = overlay.querySelector('#mini-chat-input');

    // close overlay
    closeBtn.addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    });

    backdrop.addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    });

    // open in sidebar
    openSidebarBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openSidebar' });
      overlay.style.display = 'none';
    });

    // send message
    sendBtn.addEventListener('click', () => {
      this.sendMiniChatMessage(input);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMiniChatMessage(input);
      }
    });

    // auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.style.display !== 'none') {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 300);
      }
    });
  }

  async sendMiniChatMessage(input) {
    const message = input.value.trim();
    if (!message) return;

    // add user message to mini chat
    this.addMiniChatMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // show thinking indicator
    this.showMiniThinkingIndicator();

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;

      const response = await chrome.runtime.sendMessage({
        action: 'chat',
        message: message,
        tabId: tabId,
        includeContext: true
      });

      this.hideMiniThinkingIndicator();

      if (response.success) {
        this.addMiniChatMessage('assistant', response.response);
      } else {
        this.addMiniChatMessage('assistant', response.response || 'Sorry, I encountered an error.');
      }
    } catch (error) {
      console.error('Mini chat error:', error);
      this.hideMiniThinkingIndicator();
      this.addMiniChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
  }

  addMiniChatMessage(role, content) {
    const chatMessages = document.getElementById('mini-chat-messages');
    
    // remove empty state if exists
    const emptyState = chatMessages.querySelector('.chat-empty');
    if (emptyState) {
      emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  showMiniThinkingIndicator() {
    const chatMessages = document.getElementById('mini-chat-messages');
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'mini-thinking-indicator';
    thinkingDiv.className = 'thinking-indicator thinking';
    thinkingDiv.innerHTML = `
      <span class="icon">🧠</span>
      <span class="text">
        Thinking<span class="animated-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
      </span>
    `;

    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  hideMiniThinkingIndicator() {
    const indicator = document.getElementById('mini-thinking-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
}

// start the pill when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FloatingPill();
  });
} else {
  new FloatingPill();
}
