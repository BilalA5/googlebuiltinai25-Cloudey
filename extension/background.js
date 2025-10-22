// this runs in the background and handles AI processing and storage
console.log('Context-Link background script loaded');

// import AI bridge and chat manager
importScripts('aiBridge.js');
importScripts('chatManager.js');

// main class that handles all the background work
class ContextLinkBackground {
  constructor() {
    try {
      console.log('Initializing background script...');
      this.aiBridge = new AIBridge();
      console.log('AIBridge initialized:', this.aiBridge);
      this.chatManager = new ChatManager();
      console.log('ChatManager initialized:', this.chatManager);
      this.init();
      console.log('Background script initialization complete');
    } catch (error) {
      console.error('Background script initialization failed:', error);
    }
  }

  // setup message listeners and tab watchers
  init() {
    // listen for messages from the pill and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // watch for new tabs to auto-capture
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabComplete(tabId, tab);
      }
    });

    // capture all existing tabs on startup
    this.captureAllTabs();
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
          
        case 'refreshAnalysis':
          await this.analyzeAllTabs();
          sendResponse({ success: true });
          break;
          
        case 'translateContent':
          await this.translateContent();
          sendResponse({ success: true });
          break;

        case 'chat':
          try {
            const chatResponse = await this.handleChat(request);
            sendResponse(chatResponse);
          } catch (error) {
            console.error('Chat handling error:', error);
            sendResponse({
              success: false,
              response: 'Sorry, I encountered an error processing your request.'
            });
          }
          break;

        case 'getChatHistory':
          const history = await this.chatManager.getHistory(request.tabId);
          sendResponse({ history });
          break;

        case 'clearChatHistory':
          await this.chatManager.clearTabHistory(request.tabId);
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

  // extract entities and claims from page content using AI
  async processWithAI(pageData) {
    try {
      // use AI bridge for analysis
      const analysis = await this.aiBridge.analyzePageContent(pageData);
      
      return {
        ...pageData,
        entities: analysis.entities || [],
        claims: analysis.keyConcepts || [],
        topics: analysis.topics || [],
        intent: analysis.intent || 'browsing',
        contentType: analysis.contentType || 'webpage',
        processed: true,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI processing failed:', error);
      // fallback to basic extraction
      return this.fallbackProcessing(pageData);
    }
  }

  // fallback processing when AI fails
  fallbackProcessing(pageData) {
    const entities = this.extractEntities(pageData.content);
    const claims = this.extractClaims(pageData.content);
    
    return {
      ...pageData,
      entities,
      claims,
      topics: entities.map(e => e.entity),
      intent: 'browsing',
      contentType: 'webpage',
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

  // auto-capture all tabs on startup
  async captureAllTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      console.log(`Found ${tabs.length} tabs to analyze`);
      
      for (const tab of tabs) {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          await this.autoCaptureTab(tab);
        }
      }
      
      // analyze all tabs for context
      await this.analyzeAllTabs();
      
    } catch (error) {
      console.error('Failed to capture all tabs:', error);
    }
  }

  // auto-capture individual tab
  async autoCaptureTab(tab) {
    try {
      // inject content script to extract data
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.extractPageData
      });

      if (results && results[0] && results[0].result) {
        const pageData = results[0].result;
        pageData.tabId = tab.id;
        pageData.timestamp = new Date().toISOString();
        
        // process with AI
        const processedData = await this.processWithAI(pageData);
        await this.storePage(processedData);
        
        console.log('Auto-captured:', pageData.title);
      }
    } catch (error) {
      console.error('Auto-capture failed for tab:', tab.id, error);
    }
  }

  // analyze all tabs for contextual connections
  async analyzeAllTabs() {
    try {
      const pages = await this.getCapturedPages();
      if (pages.length < 2) return;

      // use AI to detect context
      const context = await this.aiBridge.detectContext(pages);
      const insight = await this.aiBridge.generateInsight(context);
      
      // store contextual insights
      await chrome.storage.local.set({ 
        contextualInsights: {
          activity: context.activity,
          connections: context.connections,
          insights: insight,
          lastUpdated: new Date().toISOString()
        }
      });

      // notify all content scripts about new insights
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'updateInsight',
            data: { activity: context.activity, insights: insight }
          });
        } catch (error) {
          // ignore errors for tabs without content script
        }
      }

      console.log('Context analysis complete:', context.activity);
      
    } catch (error) {
      console.error('Context analysis failed:', error);
    }
  }

  async handleTabComplete(tabId, tab) {
    console.log('Tab completed:', tab.url);
    
    // auto-capture the new tab
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      await this.autoCaptureTab(tab);
      // re-analyze all tabs for new context
      await this.analyzeAllTabs();
    }
  }

  // function to extract page data (injected into tabs)
  extractPageData() {
    const title = document.title;
    const url = window.location.href;
    
    let content = '';
    const contentSelectors = [
      'article', '[role="main"]', '.content', '.article-content', 
      '.post-content', 'main', '.main-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = element.textContent;
        break;
      }
    }
    
    if (!content) {
      content = document.body.textContent;
    }
    
    return {
      title,
      url,
      content: content.replace(/\s+/g, ' ').trim().substring(0, 10000)
    };
  }

  // translate content using Chrome's built-in translation
  async translateContent() {
    try {
      const pages = await this.getCapturedPages();
      
      for (const page of pages) {
        if (page.content && page.content.length > 100) {
          try {
            // use Chrome's built-in translation if available
            if (typeof chrome.translate !== 'undefined') {
              const translated = await chrome.translate.translate(page.content, 'en');
              page.translatedContent = translated;
              page.translatedAt = new Date().toISOString();
            }
          } catch (error) {
            console.warn('Translation failed for page:', page.title, error);
          }
        }
      }
      
      // update storage with translated content
      await chrome.storage.local.set({ capturedPages: pages });
      console.log('Content translation completed using Chrome built-in translation');
      
    } catch (error) {
      console.error('Translation process failed:', error);
      throw error;
    }
  }

  // handle chat messages
  async handleChat(request) {
    try {
      const { message, tabId, includeContext } = request;

      // notify UI of processing state
      chrome.tabs.sendMessage(tabId, {
        action: 'processingState',
        state: 'thinking'
      }).catch(() => {});

      // add user message to history
      await this.chatManager.addMessage(tabId, 'user', message);

      // get conversation history
      const history = await this.chatManager.getHistory(tabId);

      // get page context if needed
      let pageContext = null;
      if (includeContext) {
        // check if we have cached context
        pageContext = await this.chatManager.getPageContext(tabId);

        if (!pageContext) {
          // extract page context
          chrome.tabs.sendMessage(tabId, {
            action: 'processingState',
            state: 'contextualizing'
          }).catch(() => {});

          pageContext = await this.extractPageContext(tabId);
          if (pageContext) {
            await this.chatManager.setPageContext(tabId, pageContext);
          }
        }
      }

      // check if this is page-related query
      const isPageRelated = this.chatManager.isPageRelatedQuery(message);
      if (isPageRelated && !pageContext) {
        pageContext = await this.extractPageContext(tabId);
        if (pageContext) {
          await this.chatManager.setPageContext(tabId, pageContext);
        }
      }

      // notify reasoning state
      chrome.tabs.sendMessage(tabId, {
        action: 'processingState',
        state: 'reasoning'
      }).catch(() => {});

      // get AI response
      const aiResponse = await this.aiBridge.chatWithAssistant(
        message,
        history,
        pageContext,
        (state) => {
          chrome.tabs.sendMessage(tabId, {
            action: 'processingState',
            state: state
          }).catch(() => {});
        }
      );

      if (aiResponse.success) {
        // add assistant response to history
        await this.chatManager.addMessage(tabId, 'assistant', aiResponse.response);

        return {
          success: true,
          response: aiResponse.response,
          usedContext: aiResponse.usedContext
        };
      } else {
        return {
          success: false,
          response: aiResponse.response
        };
      }
    } catch (error) {
      console.error('Chat handling failed:', error);
      return {
        success: false,
        response: 'Sorry, I encountered an error processing your request.'
      };
    }
  }

  // extract page context for chat
  async extractPageContext(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      
      // get captured page data if available
      const pages = await this.getCapturedPages();
      const capturedPage = pages.find(p => p.url === tab.url);

      if (capturedPage) {
        return {
          title: capturedPage.title,
          url: capturedPage.url,
          contentType: capturedPage.intent || 'webpage',
          mainTopics: capturedPage.topics || [],
          entities: capturedPage.entities || [],
          summary: capturedPage.content?.substring(0, 500) || ''
        };
      }

      // if not captured, return basic context
      return {
        title: tab.title,
        url: tab.url,
        contentType: 'webpage',
        mainTopics: [],
        entities: [],
        summary: ''
      };
    } catch (error) {
      console.error('Failed to extract page context:', error);
      return null;
    }
  }
}

// start the background service
new ContextLinkBackground();
