// Popup functionality for exTendifAI extension
console.log('Popup script loaded');

class PopupManager {
  constructor() {
    this.pages = [];
    this.contextualInsights = null;
    this.init();
  }

  // initialize popup
  async init() {
    await this.loadData();
    this.renderPages();
    this.renderContextualInsights();
    this.attachEventListeners();
    this.updateStatus();
  }

  // load data from storage
  async loadData() {
    try {
      // load captured pages
      const pagesResult = await chrome.storage.local.get(['capturedPages']);
      this.pages = pagesResult.capturedPages || [];

      // load contextual insights
      const insightsResult = await chrome.storage.local.get(['contextualInsights']);
      this.contextualInsights = insightsResult.contextualInsights || null;

      console.log('Loaded data:', { pages: this.pages.length, insights: this.contextualInsights });
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  // render captured pages
  renderPages() {
    const pagesList = document.getElementById('pages-list');
    const pageCount = document.getElementById('page-count');
    
    pageCount.textContent = `${this.pages.length} pages`;

    if (this.pages.length === 0) {
      pagesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <p>No pages captured yet</p>
          <small>Open some tabs to get started</small>
        </div>
      `;
      return;
    }

    pagesList.innerHTML = this.pages.map(page => `
      <div class="page-item" data-url="${page.url}">
        <div class="page-icon">${this.getPageIcon(page.contentType)}</div>
        <div class="page-content">
          <div class="page-title">${this.truncateText(page.title, 30)}</div>
          <div class="page-url">${this.truncateText(page.url, 40)}</div>
        </div>
        <div class="page-status" style="background: ${this.getStatusColor(page.intent)}"></div>
      </div>
    `).join('');
  }

  // render contextual insights
  renderContextualInsights() {
    const contextActivity = document.getElementById('context-activity');
    const contextInsight = document.getElementById('context-insight');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');
    const statusDot = statusIndicator.querySelector('.status-dot');

    if (this.contextualInsights) {
      contextActivity.textContent = this.getActivityText(this.contextualInsights.activity);
      contextInsight.textContent = this.contextualInsights.insights || 'Analyzing your browsing patterns...';
      
      statusText.textContent = this.getActivityText(this.contextualInsights.activity);
      statusDot.style.background = this.getStatusColor(this.contextualInsights.activity);
    } else {
      contextActivity.textContent = 'Analyzing your tabs...';
      contextInsight.textContent = 'Finding connections between your open pages';
      statusText.textContent = 'Analyzing';
      statusDot.style.background = '#f59e0b';
    }
  }

  // attach event listeners
  attachEventListeners() {
    // refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.refreshAnalysis();
    });

    // clear button
    document.getElementById('clear-btn').addEventListener('click', () => {
      this.clearAll();
    });

    // insights button
    document.getElementById('insights-btn').addEventListener('click', () => {
      this.openSidebar();
    });

    // page items
    document.addEventListener('click', (e) => {
      const pageItem = e.target.closest('.page-item');
      if (pageItem) {
        const url = pageItem.dataset.url;
        this.openPage(url);
      }
    });
  }

  // refresh analysis
  async refreshAnalysis() {
    const refreshBtn = document.getElementById('refresh-btn');
    const originalText = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<span class="btn-icon">⏳</span> Refreshing...';
    refreshBtn.disabled = true;

    try {
      // send message to background script to refresh analysis
      await chrome.runtime.sendMessage({ action: 'refreshAnalysis' });
      
      // reload data
      await this.loadData();
      this.renderPages();
      this.renderContextualInsights();
      
      // show success feedback
      refreshBtn.innerHTML = '<span class="btn-icon">✅</span> Refreshed';
      setTimeout(() => {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Refresh failed:', error);
      refreshBtn.innerHTML = '<span class="btn-icon">❌</span> Failed';
      setTimeout(() => {
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
      }, 2000);
    }
  }

  // clear all data
  async clearAll() {
    if (confirm('Are you sure you want to clear all captured pages and insights?')) {
      try {
        await chrome.storage.local.clear();
        this.pages = [];
        this.contextualInsights = null;
        this.renderPages();
        this.renderContextualInsights();
        
        // show success feedback
        const clearBtn = document.getElementById('clear-btn');
        const originalText = clearBtn.innerHTML;
        clearBtn.innerHTML = '<span class="btn-icon">✅</span> Cleared';
        setTimeout(() => {
          clearBtn.innerHTML = originalText;
        }, 2000);
        
      } catch (error) {
        console.error('Clear failed:', error);
        alert('Failed to clear data');
      }
    }
  }

  // open sidebar
  async openSidebar() {
    try {
      await chrome.runtime.sendMessage({ action: 'openSidebar' });
    } catch (error) {
      console.error('Failed to open sidebar:', error);
    }
  }

  // open page in new tab
  async openPage(url) {
    try {
      await chrome.tabs.create({ url });
      window.close();
    } catch (error) {
      console.error('Failed to open page:', error);
    }
  }

  // update status
  updateStatus() {
    const aiStatus = document.getElementById('ai-status');
    
    // check if AI is available
    if (typeof ai !== 'undefined' && ai.languageModel) {
      aiStatus.textContent = 'AI Ready';
      aiStatus.style.color = '#10b981';
    } else {
      aiStatus.textContent = 'AI Limited';
      aiStatus.style.color = '#f59e0b';
    }
  }

  // helper methods
  getPageIcon(contentType) {
    switch (contentType) {
      case 'chat': return '💬';
      case 'video': return '🎥';
      case 'encyclopedia': return '📚';
      case 'ecommerce': return '🛒';
      default: return '📄';
    }
  }

  getStatusColor(intent) {
    switch (intent) {
      case 'studying': return '#10b981';
      case 'shopping': return '#f59e0b';
      case 'researching': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  getActivityText(activity) {
    switch (activity) {
      case 'studying': return 'Studying';
      case 'shopping': return 'Shopping';
      case 'researching': return 'Researching';
      case 'browsing': return 'Browsing';
      default: return 'Analyzing';
    }
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
