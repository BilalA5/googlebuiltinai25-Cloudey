// AI Bridge - Google Cloud APIs integration with Gemini and Translation
console.log('AI Bridge loaded with Google Cloud APIs');

class AIBridge {
  constructor() {
    this.geminiApiKey = null;
    this.translationApiKey = null;
    this.isAvailable = false;
    this.loadApiKeys();
  }

  // load API keys from environment
  async loadApiKeys() {
    try {
      // In a real implementation, you'd load from .env or chrome.storage
      this.geminiApiKey = 'your_gemini_api_key_here';
      this.translationApiKey = 'your_translation_api_key_here';
      
      if (this.geminiApiKey && this.translationApiKey) {
        this.isAvailable = true;
        console.log('Google Cloud APIs configured');
      } else {
        console.warn('API keys not configured, using fallback');
        this.isAvailable = false;
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      this.isAvailable = false;
    }
  }

  // analyze page content using Gemini API
  async analyzePageContent(pageData) {
    if (!this.isAvailable) {
      return this.fallbackAnalysis(pageData);
    }

    try {
      // translate content if needed
      const translatedContent = await this.translateContent(pageData.content);
      
      const prompt = `Analyze this web page content and extract:
      1. Main topics and entities
      2. User intent (studying, shopping, researching, etc.)
      3. Key concepts
      4. Content type (article, chat, lecture, etc.)
      
      Page: ${pageData.title}
      Content: ${translatedContent.substring(0, 2000)}
      
      Return as JSON with: {topics: [], entities: [], intent: "", contentType: "", keyConcepts: []}`;

      const response = await this.callGeminiAPI(prompt);
      return this.parseAIResponse(response);
      
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      return this.fallbackAnalysis(pageData);
    }
  }

  // detect context by analyzing multiple tabs with Gemini
  async detectContext(tabsData) {
    if (!this.isAvailable) {
      return this.fallbackContextDetection(tabsData);
    }

    try {
      const prompt = `Analyze these browser tabs and find connections:
      ${tabsData.map((tab, i) => `${i+1}. ${tab.title} - ${tab.url}`).join('\n')}
      
      Determine:
      1. What is the user doing? (studying, shopping, researching, etc.)
      2. How are these tabs connected?
      3. What insights can you provide?
      
      Return as JSON: {activity: "", connections: [], insights: ""}`;

      const response = await this.callGeminiAPI(prompt);
      return this.parseAIResponse(response);
      
    } catch (error) {
      console.error('Context detection failed:', error);
      return this.fallbackContextDetection(tabsData);
    }
  }

  // generate insights using Gemini
  async generateInsight(analysis) {
    if (!this.isAvailable) {
      return this.fallbackInsight(analysis);
    }

    try {
      const prompt = `Based on this analysis, create a helpful insight for the user:
      Activity: ${analysis.activity}
      Connections: ${analysis.connections?.join(', ') || 'None'}
      Insights: ${analysis.insights}
      
      Create a short, friendly message (max 50 words) that helps the user understand what they're doing.`;

      const response = await this.callGeminiAPI(prompt);
      return response;
      
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

  // call Gemini API
  async callGeminiAPI(prompt) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-nano:generateContent?key=${this.geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  // translate content using Cloud Translation API
  async translateContent(content, targetLanguage = 'en') {
    if (!this.isAvailable || !this.translationApiKey) {
      return content; // return original if translation fails
    }

    try {
      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${this.translationApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: content.substring(0, 5000), // limit content size
          target: targetLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data.translations[0].translatedText;
      
    } catch (error) {
      console.error('Translation failed:', error);
      return content; // return original content if translation fails
    }
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
}

// export for use in other scripts
window.AIBridge = AIBridge;
