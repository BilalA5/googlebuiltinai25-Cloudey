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
          <button class="pill-btn" id="chat-btn">Ask</button>
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

  // open comet-style dropdown chat
  openMiniChat() {
    // check if dropdown already exists
    let dropdown = document.getElementById('extendif-chat-dropdown');
    
    if (dropdown) {
      dropdown.style.display = 'block';
      return;
    }

    // create comet-style dropdown
    dropdown = document.createElement('div');
    dropdown.id = 'extendif-chat-dropdown';
    dropdown.className = 'comet-dropdown';
    
    dropdown.innerHTML = `
      <div class="comet-header">
        <div class="comet-title">
          <span class="comet-icon">⚡</span>
          <span>exTendifAI</span>
        </div>
        <button class="comet-close" id="comet-close-btn">×</button>
      </div>
      
      <div class="comet-messages" id="comet-messages">
        <div class="comet-empty">
          <div class="comet-empty-icon">⚡</div>
          <div class="comet-empty-text">Ask me anything about this page</div>
        </div>
      </div>
      
      <div class="comet-input-container">
        <textarea 
          id="comet-input" 
          class="comet-input" 
          placeholder="Ask me anything..."
          rows="1"
        ></textarea>
        <button id="comet-send-btn" class="comet-send-btn">⚡</button>
      </div>
    `;

    document.body.appendChild(dropdown);

    // position dropdown near pill
    this.positionCometDropdown(dropdown);

    // attach event listeners
    this.attachCometListeners(dropdown);

    // fade in animation
    setTimeout(() => {
      dropdown.style.opacity = '1';
      dropdown.style.transform = 'translateY(0)';
    }, 10);
  }

  positionCometDropdown(dropdown) {
    const pillRect = this.pill.getBoundingClientRect();
    const dropdownWidth = 400;
    const dropdownHeight = 500;
    
    // position below pill, centered
    const left = Math.max(20, Math.min(
      pillRect.left + (pillRect.width / 2) - (dropdownWidth / 2),
      window.innerWidth - dropdownWidth - 20
    ));
    
    const top = pillRect.bottom + 10;
    
    dropdown.style.position = 'fixed';
    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
    dropdown.style.width = `${dropdownWidth}px`;
    dropdown.style.height = `${dropdownHeight}px`;
  }

  attachCometListeners(dropdown) {
    const closeBtn = dropdown.querySelector('#comet-close-btn');
    const sendBtn = dropdown.querySelector('#comet-send-btn');
    const input = dropdown.querySelector('#comet-input');

    // close dropdown
    closeBtn.addEventListener('click', () => {
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        dropdown.style.display = 'none';
      }, 300);
    });

    // send message
    sendBtn.addEventListener('click', () => {
      this.sendCometMessage(input);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendCometMessage(input);
      }
    });

    // auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.style.display !== 'none') {
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 300);
      }
    });

    // click outside to close
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !this.pill.contains(e.target)) {
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 300);
      }
    });
  }

  async sendCometMessage(input) {
    const message = input.value.trim();
    if (!message) return;

    // add user message to comet chat
    this.addCometMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // show thinking indicator
    this.showCometThinkingIndicator();

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;

      console.log('Sending comet message:', { message, tabId });

      const response = await chrome.runtime.sendMessage({
        action: 'chat',
        message: message,
        tabId: tabId,
        includeContext: true
      });

      console.log('Comet response:', response);

      this.hideCometThinkingIndicator();

      if (response && response.success) {
        this.addCometMessage('assistant', response.response);
      } else {
        this.addCometMessage('assistant', response?.response || 'Sorry, I encountered an error.');
      }
    } catch (error) {
      console.error('Comet chat error:', error);
      this.hideCometThinkingIndicator();
      this.addCometMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
  }

  addCometMessage(role, content) {
    const chatMessages = document.getElementById('comet-messages');
    
    // remove empty state if exists
    const emptyState = chatMessages.querySelector('.comet-empty');
    if (emptyState) {
      emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `comet-message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'comet-message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  showCometThinkingIndicator() {
    const chatMessages = document.getElementById('comet-messages');
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'comet-thinking-indicator';
    thinkingDiv.className = 'comet-thinking-indicator';
    thinkingDiv.innerHTML = `
      <span class="comet-thinking-icon">⚡</span>
      <span class="comet-thinking-text">Thinking...</span>
    `;

    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  hideCometThinkingIndicator() {
    const indicator = document.getElementById('comet-thinking-indicator');
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
