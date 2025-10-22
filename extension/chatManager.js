// manages chat conversations per tab with session-based storage
console.log('ChatManager loaded');

class ChatManager {
  constructor() {
    this.maxMessagesPerTab = 50;
    this.contextTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.storageAPI = chrome.storage.session || chrome.storage.local;
    this.init();
  }

  // initialize and setup cleanup listeners
  async init() {
    // if using local storage fallback, cleanup on browser close
    if (!chrome.storage.session) {
      chrome.runtime.onSuspend.addListener(() => {
        this.clearAllHistory();
      });
    }
  }

  // get conversation history for a specific tab
  async getHistory(tabId) {
    try {
      const key = `chat_history_${tabId}`;
      const result = await this.storageAPI.get([key]);
      return result[key] || [];
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return [];
    }
  }

  // add a new message to tab's conversation
  async addMessage(tabId, role, content) {
    try {
      const history = await this.getHistory(tabId);
      const message = {
        role: role, // 'user' or 'assistant'
        content: content,
        timestamp: Date.now(),
        tabId: tabId
      };

      history.push(message);

      // prune old messages if exceeded max
      if (history.length > this.maxMessagesPerTab) {
        history.splice(0, history.length - this.maxMessagesPerTab);
      }

      const key = `chat_history_${tabId}`;
      await this.storageAPI.set({ [key]: history });

      return message;
    } catch (error) {
      console.error('Failed to add message:', error);
      throw error;
    }
  }

  // clear conversation for specific tab
  async clearTabHistory(tabId) {
    try {
      const key = `chat_history_${tabId}`;
      await this.storageAPI.remove([key]);
      console.log(`Cleared history for tab ${tabId}`);
    } catch (error) {
      console.error('Failed to clear tab history:', error);
    }
  }

  // clear all conversation history
  async clearAllHistory() {
    try {
      const allKeys = await this.storageAPI.get(null);
      const chatKeys = Object.keys(allKeys).filter(k => k.startsWith('chat_history_'));
      await this.storageAPI.remove(chatKeys);
      console.log('Cleared all chat history');
    } catch (error) {
      console.error('Failed to clear all history:', error);
    }
  }

  // store page context for a tab with TTL
  async setPageContext(tabId, contextData) {
    try {
      const key = `page_context_${tabId}`;
      const contextWithTTL = {
        ...contextData,
        cachedAt: Date.now()
      };
      await this.storageAPI.set({ [key]: contextWithTTL });
    } catch (error) {
      console.error('Failed to set page context:', error);
    }
  }

  // get page context if not expired
  async getPageContext(tabId) {
    try {
      const key = `page_context_${tabId}`;
      const result = await this.storageAPI.get([key]);
      const context = result[key];

      if (!context) return null;

      // check if context expired
      const age = Date.now() - context.cachedAt;
      if (age > this.contextTTL) {
        // context too old, remove it
        await this.storageAPI.remove([key]);
        return null;
      }

      return context;
    } catch (error) {
      console.error('Failed to get page context:', error);
      return null;
    }
  }

  // check if query is first message in thread
  async isFirstMessage(tabId) {
    const history = await this.getHistory(tabId);
    return history.length === 0;
  }

  // check if query seems related to current page
  isPageRelatedQuery(query) {
    const pageKeywords = [
      'this page', 'this article', 'this site', 'here',
      'summarize', 'summary', 'what does this say',
      'explain this', 'what is this about', 'current page'
    ];
    
    const lowerQuery = query.toLowerCase();
    return pageKeywords.some(keyword => lowerQuery.includes(keyword));
  }
}

// export for use in other scripts
if (typeof self !== 'undefined') {
  self.ChatManager = ChatManager;
} else if (typeof window !== 'undefined') {
  window.ChatManager = ChatManager;
}

