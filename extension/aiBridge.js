// AI Bridge - Gemini Nano (in-browser) integration
console.log('AI Bridge loaded with Gemini Nano');

class AIBridge {
  constructor() {
    this.isAvailable = false;
    this.checkAvailability();
  }

  // check if Gemini Nano is available
  async checkAvailability() {
    try {
      // Check if we're in a service worker context
      if (typeof self !== 'undefined' && self.importScripts) {
        // Service worker context - AI might not be available
        console.warn('Running in service worker context, AI may not be available');
        this.isAvailable = false;
        return;
      }
      
      if (typeof ai !== 'undefined' && ai.languageModel) {
        this.isAvailable = true;
        console.log('Gemini Nano (in-browser) available');
      } else {
        console.warn('Gemini Nano not available, using fallback');
        this.isAvailable = false;
      }
    } catch (error) {
      console.error('Gemini Nano availability check failed:', error);
      this.isAvailable = false;
    }
  }

  // analyze page content using Gemini Nano
  async analyzePageContent(pageData) {
    if (!this.isAvailable) {
      return this.fallbackAnalysis(pageData);
    }

    try {
      // Check if we're in service worker context
      if (typeof self !== 'undefined' && self.importScripts) {
        console.log('Running in service worker, using fallback analysis');
        return this.fallbackAnalysis(pageData);
      }

      const session = await ai.languageModel.create({
        systemPrompt: "You are an AI that analyzes web page content to extract key entities, topics, and user intent. Return structured data about what the user is doing on this page."
      });

      const prompt = `Analyze this web page content and extract:
      1. Main topics and entities
      2. User intent (studying, shopping, researching, etc.)
      3. Key concepts
      4. Content type (article, chat, lecture, etc.)
      
      Page: ${pageData.title}
      Content: ${pageData.content.substring(0, 2000)}
      
      Return as JSON with: {topics: [], entities: [], intent: "", contentType: "", keyConcepts: []}`;

      const result = await session.prompt(prompt);
      return this.parseAIResponse(result);
      
    } catch (error) {
      console.error('Gemini Nano analysis failed:', error);
      return this.fallbackAnalysis(pageData);
    }
  }

  // detect context by analyzing multiple tabs with Gemini Nano
  async detectContext(tabsData) {
    if (!this.isAvailable) {
      return this.fallbackContextDetection(tabsData);
    }

    try {
      // Check if we're in service worker context
      if (typeof self !== 'undefined' && self.importScripts) {
        console.log('Running in service worker, using fallback context detection');
        return this.fallbackContextDetection(tabsData);
      }

      const session = await ai.languageModel.create({
        systemPrompt: "You analyze multiple browser tabs to find connections and determine what the user is doing across all tabs. Identify patterns like studying, shopping, research, etc."
      });

      const prompt = `Analyze these browser tabs and find connections:
      ${tabsData.map((tab, i) => `${i+1}. ${tab.title} - ${tab.url}`).join('\n')}
      
      Determine:
      1. What is the user doing? (studying, shopping, researching, etc.)
      2. How are these tabs connected?
      3. What insights can you provide?
      
      Return as JSON: {activity: "", connections: [], insights: ""}`;

      const result = await session.prompt(prompt);
      return this.parseAIResponse(result);
      
    } catch (error) {
      console.error('Context detection failed:', error);
      return this.fallbackContextDetection(tabsData);
    }
  }

  // generate insights using Gemini Nano
  async generateInsight(analysis) {
    if (!this.isAvailable) {
      return this.fallbackInsight(analysis);
    }

    try {
      // Check if we're in service worker context
      if (typeof self !== 'undefined' && self.importScripts) {
        console.log('Running in service worker, using fallback insight');
        return this.fallbackInsight(analysis);
      }

      const session = await ai.languageModel.create({
        systemPrompt: "You create helpful, concise insights for users based on their browsing activity. Be friendly and informative."
      });

      const prompt = `Based on this analysis, create a helpful insight for the user:
      Activity: ${analysis.activity}
      Connections: ${analysis.connections?.join(', ') || 'None'}
      Insights: ${analysis.insights}
      
      Create a short, friendly message (max 50 words) that helps the user understand what they're doing.`;

      const result = await session.prompt(prompt);
      return result;
      
    } catch (error) {
      console.error('Insight generation failed:', error);
      return this.fallbackInsight(analysis);
    }
  }

  // fallback analysis when AI is not available
  fallbackAnalysis(pageData) {
    const content = pageData.content.toLowerCase();
    
    // simple keyword detection
    const topics = this.extractKeywords(content);
    const intent = this.detectIntent(content);
    const contentType = this.detectContentType(pageData.url);
    
    return {
      topics,
      entities: topics.slice(0, 5),
      intent,
      contentType,
      keyConcepts: topics.slice(0, 3)
    };
  }

  // fallback context detection
  fallbackContextDetection(tabsData) {
    const urls = tabsData.map(tab => tab.url);
    const titles = tabsData.map(tab => tab.title);
    
    // simple pattern detection
    if (urls.some(url => url.includes('chatgpt')) && urls.some(url => url.includes('d2l'))) {
      return {
        activity: 'studying',
        connections: ['ChatGPT', 'D2L'],
        insights: 'You appear to be studying with ChatGPT and D2L open'
      };
    }
    
    if (urls.some(url => url.includes('amazon')) && urls.some(url => url.includes('review'))) {
      return {
        activity: 'shopping',
        connections: ['Amazon', 'Reviews'],
        insights: 'You appear to be shopping and reading reviews'
      };
    }
    
    return {
      activity: 'browsing',
      connections: [],
      insights: 'Multiple tabs open for browsing'
    };
  }

  // fallback insight generation
  fallbackInsight(analysis) {
    if (analysis.activity === 'studying') {
      return "You're studying! I've connected your learning materials.";
    } else if (analysis.activity === 'shopping') {
      return "You're shopping! I've linked your product research.";
    } else {
      return "I'm analyzing your tabs to find connections.";
    }
  }

  // helper methods
  extractKeywords(content) {
    const words = content.split(/\s+/).filter(word => word.length > 4);
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  detectIntent(content) {
    if (content.includes('study') || content.includes('learn') || content.includes('course')) {
      return 'studying';
    } else if (content.includes('buy') || content.includes('shop') || content.includes('price')) {
      return 'shopping';
    } else if (content.includes('research') || content.includes('article') || content.includes('news')) {
      return 'researching';
    }
    return 'browsing';
  }

  detectContentType(url) {
    if (url.includes('chatgpt') || url.includes('claude')) return 'chat';
    if (url.includes('youtube')) return 'video';
    if (url.includes('wikipedia')) return 'encyclopedia';
    if (url.includes('amazon') || url.includes('shop')) return 'ecommerce';
    return 'webpage';
  }


  parseAIResponse(response) {
    try {
      // try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { raw: response };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return { raw: response };
    }
  }

  // chat with AI assistant - main method for conversational queries
  async chatWithAssistant(message, conversationHistory = [], pageContext = null, processingCallback = null) {
    try {
      // notify UI of processing state
      if (processingCallback) processingCallback('thinking');

      // check if we're in service worker context
      if (typeof self !== 'undefined' && self.importScripts) {
        console.log('Running in service worker, AI chat not available');
        return {
          success: false,
          response: 'AI chat is not available in service worker context. Please use the sidebar or pill chat interface.'
        };
      }

      // check if Gemini Nano is available
      if (!this.isAvailable) {
        return {
          success: false,
          response: 'AI is currently unavailable. Please ensure Gemini Nano is enabled in your browser.'
        };
      }

      // determine if we need page context
      const needsContext = this.shouldInjectContext(message, conversationHistory, pageContext);
      
      if (needsContext && processingCallback) {
        processingCallback('contextualizing');
      }

      // build system prompt with context
      const systemPrompt = this.buildSystemPrompt(pageContext, needsContext);

      // build conversation context
      const conversationContext = this.buildConversationContext(conversationHistory, message);

      if (processingCallback) processingCallback('reasoning');

      // create AI session
      const session = await ai.languageModel.create({
        systemPrompt: systemPrompt
      });

      // get response from AI
      const response = await session.prompt(conversationContext);

      return {
        success: true,
        response: response,
        usedContext: needsContext
      };

    } catch (error) {
      console.error('Chat with assistant failed:', error);
      return {
        success: false,
        response: 'Sorry, I encountered an error processing your request. Please try again.',
        error: error.message
      };
    }
  }

  // determine if page context should be injected
  shouldInjectContext(message, history, pageContext) {
    if (!pageContext) return false;

    // always inject on first message
    if (history.length === 0) return true;

    // check for page-related keywords
    const pageKeywords = [
      'this page', 'this article', 'this site', 'here',
      'summarize', 'summary', 'what does this say',
      'explain this', 'what is this about', 'current page',
      'on this page', 'what am i reading'
    ];

    const lowerMessage = message.toLowerCase();
    return pageKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // build system prompt with optional page context
  buildSystemPrompt(pageContext, includeContext) {
    let prompt = `You are exTendifAI, an intelligent AI assistant built into the browser. You can answer questions using both general knowledge and specific information from web pages the user is viewing.

Be helpful, concise, and accurate. If you don't know something, admit it rather than guessing.`;

    if (includeContext && pageContext) {
      prompt += `\n\nCurrent Page Context:
- Page Title: ${pageContext.title}
- URL: ${pageContext.url}
- Content Type: ${pageContext.contentType || 'unknown'}
- Main Topics: ${pageContext.mainTopics?.join(', ') || 'none identified'}
- Key Entities: ${pageContext.entities?.join(', ') || 'none identified'}
- Summary: ${pageContext.summary || 'No summary available'}

Use this context to answer questions about the current page when relevant.`;
    }

    return prompt;
  }

  // build conversation context from history
  buildConversationContext(history, currentMessage) {
    let context = '';

    // include last 10 messages for context (to avoid token limits)
    const recentHistory = history.slice(-10);
    
    if (recentHistory.length > 0) {
      context += 'Previous conversation:\n';
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        context += `${role}: ${msg.content}\n`;
      });
      context += '\n';
    }

    context += `User: ${currentMessage}`;

    return context;
  }
}

// export for use in other scripts
if (typeof self !== 'undefined') {
  // Service worker context
  self.AIBridge = AIBridge;
} else if (typeof window !== 'undefined') {
  // Browser context
  window.AIBridge = AIBridge;
}
