// this runs in the background and handles AI processing and storage
console.log('Context-Link background script loaded');

// main class that handles all the background work
class ContextLinkBackground {
  constructor() {
    this.init();
  }

  // setup message listeners and tab watchers
  init() {
    // listen for messages from the pill and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // watch for new tabs to maybe auto-capture
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabComplete(tabId, tab);
      }
    });
  }

  // handle all the different actions from content script and popup
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'capturePage':
          const result = await this.capturePage(request.data);
          sendResponse(result);
          break;
          
        case 'getCapturedPages':
          const pages = await this.getCapturedPages();
          sendResponse({ pages });
          break;
          
        case 'comparePages':
          const comparison = await this.comparePages(request.pageIds);
          sendResponse(comparison);
          break;
          
        case 'openSidebar':
          await this.openSidebar();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
  }

  // process and save a page that was captured
  async capturePage(pageData) {
    try {
      console.log('Capturing page:', pageData.title);
      
      // run AI processing on the page content
      const processedData = await this.processWithAI(pageData);
      
      // save it to chrome storage
      await this.storePage(processedData);
      
      // update the extension badge with count
      await this.updateBadge();
      
      return { success: true, data: processedData };
      
    } catch (error) {
      console.error('Capture failed:', error);
      return { success: false, error: error.message };
    }
  }

  // extract entities and claims from page content
  async processWithAI(pageData) {
    // right now just basic extraction, later use chrome AI apis
    
    const entities = this.extractEntities(pageData.content);
    const claims = this.extractClaims(pageData.content);
    
    return {
      ...pageData,
      entities,
      claims,
      processed: true,
      processedAt: new Date().toISOString()
    };
  }

  // find important words and topics in the content
  extractEntities(content) {
    // basic extraction, later use chrome AI
    const words = content.toLowerCase().split(/\s+/);
    const entityCounts = {};
    
    // find capitalized words that might be names or places
    const capitalizedWords = content.match(/\b[A-Z][a-z]+\b/g) || [];
    
    capitalizedWords.forEach(word => {
      if (word.length > 3) {
        entityCounts[word.toLowerCase()] = (entityCounts[word.toLowerCase()] || 0) + 1;
      }
    });
    
    // return the most common ones
    return Object.entries(entityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([entity, count]) => ({ entity, count }));
  }

  // find main statements or claims in the content
  extractClaims(content) {
    // basic claim extraction, later use chrome AI
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    return sentences.slice(0, 3).map((sentence, index) => ({
      id: index + 1,
      claim: sentence.trim(),
      confidence: Math.random() * 0.4 + 0.6, // fake confidence score
      stance: Math.random() > 0.5 ? 'positive' : 'neutral'
    }));
  }

  // save the processed page data to chrome storage
  async storePage(pageData) {
    try {
      const result = await chrome.storage.local.get(['capturedPages']);
      const pages = result.capturedPages || [];
      
      // add new page but replace if already exists
      const existingIndex = pages.findIndex(p => p.url === pageData.url);
      if (existingIndex >= 0) {
        pages[existingIndex] = pageData;
      } else {
        pages.push(pageData);
      }
      
      // only keep the last 50 pages
      if (pages.length > 50) {
        pages.splice(0, pages.length - 50);
      }
      
      await chrome.storage.local.set({ capturedPages: pages });
      
      console.log('Page stored successfully:', pageData.title);
      
    } catch (error) {
      console.error('Storage failed:', error);
      throw error;
    }
  }

  // get all the saved pages from storage
  async getCapturedPages() {
    try {
      const result = await chrome.storage.local.get(['capturedPages']);
      return result.capturedPages || [];
    } catch (error) {
      console.error('Failed to get captured pages:', error);
      return [];
    }
  }

  // compare two or more pages and find differences
  async comparePages(pageIds) {
    try {
      const pages = await this.getCapturedPages();
      const selectedPages = pages.filter(p => pageIds.includes(p.id || p.url));
      
      if (selectedPages.length < 2) {
        throw new Error('Need at least 2 pages to compare');
      }
      
      // create comparison using AI
      const comparison = await this.generateComparison(selectedPages);
      
      return { success: true, comparison };
      
    } catch (error) {
      console.error('Comparison failed:', error);
      return { success: false, error: error.message };
    }
  }

  // create a comparison between multiple pages
  async generateComparison(pages) {
    // basic comparison logic, later use chrome AI
    const entities1 = pages[0].entities.map(e => e.entity);
    const entities2 = pages[1].entities.map(e => e.entity);
    
    const commonEntities = entities1.filter(e => entities2.includes(e));
    const unique1 = entities1.filter(e => !entities2.includes(e));
    const unique2 = entities2.filter(e => !entities1.includes(e));
    
    return {
      pages: pages.map(p => ({
        title: p.title,
        url: p.url,
        entityCount: p.entities.length,
        claimCount: p.claims.length
      })),
      commonEntities,
      uniqueEntities: {
        page1: unique1,
        page2: unique2
      },
      summary: `Found ${commonEntities.length} shared entities. Page 1 has ${pages[0].claims.length} claims, Page 2 has ${pages[1].claims.length} claims.`,
      generatedAt: new Date().toISOString()
    };
  }

  // open the sidebar panel
  async openSidebar() {
    try {
      // open the side panel
      await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
    } catch (error) {
      console.error('Failed to open sidebar:', error);
    }
  }

  // update the extension icon badge with number of captured pages
  async updateBadge() {
    try {
      const pages = await this.getCapturedPages();
      const count = pages.length;
      
      await chrome.action.setBadgeText({
        text: count > 0 ? count.toString() : ''
      });
      
      await chrome.action.setBadgeBackgroundColor({
        color: '#667eea'
      });
      
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }

  async handleTabComplete(tabId, tab) {
    // For now, we'll just log the completion
    console.log('Tab completed:', tab.url);
  }
}

// start the background service
new ContextLinkBackground();
