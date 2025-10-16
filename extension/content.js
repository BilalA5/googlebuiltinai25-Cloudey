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
        <div class="pill-icon">CL</div>
        <span class="pill-text">exTendifAI</span>
        <div class="pill-status" id="pill-status"></div>
        <div class="pill-content">
          <div class="pill-title">Analyzing page...</div>
          <div class="pill-summary">Extracting entities and claims</div>
        </div>
        <div class="pill-actions">
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
    const captureBtn = this.pill.querySelector('#capture-btn');
    const compareBtn = this.pill.querySelector('#compare-btn');

    // make pill expand when clicked
    pillElement.addEventListener('click', (e) => {
      if (e.target.classList.contains('pill-btn')) return; // Don't toggle if clicking buttons
      this.toggleExpanded();
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
}

// start the pill when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FloatingPill();
  });
} else {
  new FloatingPill();
}
