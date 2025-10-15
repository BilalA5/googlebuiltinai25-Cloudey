// Sidebar functionality for detailed insights
console.log('Sidebar script loaded');

class SidebarManager {
  constructor() {
    this.pages = [];
    this.contextualInsights = null;
    this.selectedTabs = new Set();
    this.currentTab = 'entities';
    this.init();
  }

  // initialize sidebar
  async init() {
    await this.loadData();
    this.renderContextualInsights();
    this.renderConnections();
    this.renderAnalysis();
    this.attachEventListeners();
    this.updateFooter();
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

      console.log('Sidebar loaded data:', { pages: this.pages.length, insights: this.contextualInsights });
    } catch (error) {
      console.error('Failed to load sidebar data:', error);
    }
  }

  // render contextual insights
  renderContextualInsights() {
    const activityBadge = document.getElementById('activity-badge');
    const insightText = document.getElementById('insight-text');
    const connectionsList = document.getElementById('connections-list');

    if (this.contextualInsights) {
      // update activity badge
      const activityIcon = activityBadge.querySelector('.activity-icon');
      const activityText = activityBadge.querySelector('.activity-text');
      
      activityIcon.textContent = this.getActivityIcon(this.contextualInsights.activity);
      activityText.textContent = this.getActivityText(this.contextualInsights.activity);
      
      // update insight text
      insightText.textContent = this.contextualInsights.insights || 'Analyzing your browsing patterns...';
      
      // render connections
      if (this.contextualInsights.connections && this.contextualInsights.connections.length > 0) {
        connectionsList.innerHTML = this.contextualInsights.connections.map(connection => 
          `<div class="connection-tag">${connection}</div>`
        ).join('');
      } else {
        connectionsList.innerHTML = '<div class="connection-tag">No connections found</div>';
      }
    } else {
      activityIcon.textContent = '🔍';
      activityText.textContent = 'Analyzing';
      insightText.textContent = 'Finding connections between your open tabs...';
      connectionsList.innerHTML = '<div class="connection-tag">Loading...</div>';
    }
  }

  // render tab connections
  renderConnections() {
    const connectionsGrid = document.getElementById('connections-grid');

    if (this.pages.length === 0) {
      connectionsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔗</div>
          <p>No connections found yet</p>
          <small>Open related tabs to see connections</small>
        </div>
      `;
      return;
    }

    // group pages by intent/activity
    const groupedPages = this.groupPagesByIntent();
    
    connectionsGrid.innerHTML = Object.entries(groupedPages).map(([intent, pages]) => `
      <div class="connection-item" data-intent="${intent}">
        <div class="connection-header">
          <div class="connection-icon">${this.getIntentIcon(intent)}</div>
          <div class="connection-title">${this.getIntentTitle(intent)}</div>
          <div class="connection-strength">${pages.length} tabs</div>
        </div>
        <div class="connection-details">
          ${pages.map(page => `
            <div class="page-connection">
              <strong>${this.truncateText(page.title, 30)}</strong>
              <br>
              <small>${this.truncateText(page.url, 50)}</small>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // render analysis tabs
  renderAnalysis() {
    this.renderEntities();
    this.renderTopics();
    this.renderInsights();
  }

  // render entities
  renderEntities() {
    const entitiesList = document.getElementById('entities-list');
    
    // collect all entities from all pages
    const allEntities = {};
    this.pages.forEach(page => {
      if (page.entities) {
        page.entities.forEach(entity => {
          const name = entity.entity || entity;
          allEntities[name] = (allEntities[name] || 0) + (entity.count || 1);
        });
      }
    });

    const sortedEntities = Object.entries(allEntities)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);

    if (sortedEntities.length === 0) {
      entitiesList.innerHTML = '<div class="empty-state"><p>No entities found</p></div>';
      return;
    }

    entitiesList.innerHTML = sortedEntities.map(([entity, count]) => `
      <div class="entity-item">
        <div class="entity-name">${entity}</div>
        <div class="entity-count">${count}</div>
      </div>
    `).join('');
  }

  // render topics
  renderTopics() {
    const topicsList = document.getElementById('topics-list');
    
    // collect all topics from all pages
    const allTopics = {};
    this.pages.forEach(page => {
      if (page.topics) {
        page.topics.forEach(topic => {
          allTopics[topic] = (allTopics[topic] || 0) + 1;
        });
      }
    });

    const sortedTopics = Object.entries(allTopics)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15);

    if (sortedTopics.length === 0) {
      topicsList.innerHTML = '<div class="empty-state"><p>No topics found</p></div>';
      return;
    }

    topicsList.innerHTML = sortedTopics.map(([topic, count]) => `
      <div class="topic-item">
        <div class="topic-name">${topic}</div>
        <div class="topic-confidence">${count}</div>
      </div>
    `).join('');
  }

  // render insights
  renderInsights() {
    const insightsContent = document.getElementById('insights-content');
    
    if (this.contextualInsights) {
      insightsContent.innerHTML = `
        <div class="insight-section">
          <h4>Activity Analysis</h4>
          <p><strong>Detected Activity:</strong> ${this.contextualInsights.activity}</p>
          <p><strong>Insights:</strong> ${this.contextualInsights.insights}</p>
          <p><strong>Connections:</strong> ${this.contextualInsights.connections?.join(', ') || 'None detected'}</p>
        </div>
        
        <div class="insight-section">
          <h4>Tab Analysis</h4>
          <p><strong>Total Pages:</strong> ${this.pages.length}</p>
          <p><strong>Content Types:</strong> ${this.getContentTypeBreakdown()}</p>
          <p><strong>Intent Distribution:</strong> ${this.getIntentBreakdown()}</p>
        </div>
      `;
    } else {
      insightsContent.innerHTML = '<div class="empty-state"><p>No insights available yet</p></div>';
    }
  }

  // attach event listeners
  attachEventListeners() {
    // close button
    document.getElementById('close-btn').addEventListener('click', () => {
      window.close();
    });

    // tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // action buttons
    document.getElementById('compare-btn').addEventListener('click', () => {
      this.compareSelected();
    });

    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('translate-btn').addEventListener('click', () => {
      this.translateContent();
    });

    // connection items
    document.addEventListener('click', (e) => {
      const connectionItem = e.target.closest('.connection-item');
      if (connectionItem) {
        this.selectConnection(connectionItem);
      }
    });
  }

  // switch analysis tab
  switchTab(tabName) {
    // update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-panel`).classList.add('active');

    this.currentTab = tabName;
  }

  // compare selected tabs
  async compareSelected() {
    if (this.selectedTabs.size < 2) {
      alert('Please select at least 2 tabs to compare');
      return;
    }

    try {
      const selectedPages = this.pages.filter(page => this.selectedTabs.has(page.url));
      const comparison = await chrome.runtime.sendMessage({
        action: 'comparePages',
        pageIds: selectedPages.map(p => p.url)
      });

      if (comparison.success) {
        this.showComparisonResults(comparison.comparison);
      } else {
        alert('Comparison failed: ' + comparison.error);
      }
    } catch (error) {
      console.error('Comparison failed:', error);
      alert('Failed to compare selected tabs');
    }
  }

  // export data
  exportData() {
    const data = {
      pages: this.pages,
      insights: this.contextualInsights,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `extendifai-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  // translate content
  async translateContent() {
    try {
      await chrome.runtime.sendMessage({ action: 'translateContent' });
      alert('Translation initiated for all captured content');
    } catch (error) {
      console.error('Translation failed:', error);
      alert('Translation feature not available');
    }
  }

  // select connection
  selectConnection(connectionItem) {
    const intent = connectionItem.dataset.intent;
    
    if (this.selectedTabs.has(intent)) {
      this.selectedTabs.delete(intent);
      connectionItem.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    } else {
      this.selectedTabs.add(intent);
      connectionItem.style.borderColor = '#667eea';
    }
  }

  // show comparison results
  showComparisonResults(comparison) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    modal.innerHTML = `
      <div style="background: #1a1a1a; padding: 24px; border-radius: 12px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
        <h3 style="margin-bottom: 16px; color: #ffffff;">Comparison Results</h3>
        <div style="color: rgba(255, 255, 255, 0.8); line-height: 1.6;">
          <p><strong>Summary:</strong> ${comparison.summary}</p>
          <p><strong>Common Entities:</strong> ${comparison.commonEntities?.join(', ') || 'None'}</p>
          <p><strong>Unique to Page 1:</strong> ${comparison.uniqueEntities?.page1?.join(', ') || 'None'}</p>
          <p><strong>Unique to Page 2:</strong> ${comparison.uniqueEntities?.page2?.join(', ') || 'None'}</p>
        </div>
        <button onclick="this.closest('.modal').remove()" style="margin-top: 16px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  // helper methods
  groupPagesByIntent() {
    const groups = {};
    this.pages.forEach(page => {
      const intent = page.intent || 'browsing';
      if (!groups[intent]) {
        groups[intent] = [];
      }
      groups[intent].push(page);
    });
    return groups;
  }

  getActivityIcon(activity) {
    switch (activity) {
      case 'studying': return '📚';
      case 'shopping': return '🛒';
      case 'researching': return '🔍';
      case 'browsing': return '🌐';
      default: return '🔍';
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

  getIntentIcon(intent) {
    switch (intent) {
      case 'studying': return '📚';
      case 'shopping': return '🛒';
      case 'researching': return '🔍';
      case 'browsing': return '🌐';
      default: return '📄';
    }
  }

  getIntentTitle(intent) {
    switch (intent) {
      case 'studying': return 'Study Session';
      case 'shopping': return 'Shopping';
      case 'researching': return 'Research';
      case 'browsing': return 'General Browsing';
      default: return 'Other';
    }
  }

  getContentTypeBreakdown() {
    const types = {};
    this.pages.forEach(page => {
      const type = page.contentType || 'webpage';
      types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([type, count]) => `${type}: ${count}`).join(', ');
  }

  getIntentBreakdown() {
    const intents = {};
    this.pages.forEach(page => {
      const intent = page.intent || 'browsing';
      intents[intent] = (intents[intent] || 0) + 1;
    });
    return Object.entries(intents).map(([intent, count]) => `${intent}: ${count}`).join(', ');
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  updateFooter() {
    const lastUpdated = document.getElementById('last-updated');
    const aiStatus = document.getElementById('ai-status');
    
    if (this.contextualInsights && this.contextualInsights.lastUpdated) {
      const date = new Date(this.contextualInsights.lastUpdated);
      lastUpdated.textContent = date.toLocaleTimeString();
    } else {
      lastUpdated.textContent = 'Just now';
    }

    if (typeof ai !== 'undefined' && ai.languageModel) {
      aiStatus.textContent = 'AI Analysis Active';
      aiStatus.style.color = '#10b981';
    } else {
      aiStatus.textContent = 'AI Limited';
      aiStatus.style.color = '#f59e0b';
    }
  }
}

// initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SidebarManager();
});
