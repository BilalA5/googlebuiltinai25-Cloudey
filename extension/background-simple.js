// enhanced background script with AI integration
console.log('Cloudey background script loaded');

// store conversation history per tab
const conversationHistory = new Map();

//TODO: Add proper dimensions of the svj for Cloudey icon

// AI-powered message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  try {
    switch (request.action) {
      case 'chat':
        handleChatRequest(request, sender, sendResponse);
        break;
        
      case 'getChatHistory':
        const tabId = sender.tab?.id || 'default';
        sendResponse({ history: conversationHistory.get(tabId) || [] });
        break;
        
      case 'clearChatHistory':
        const clearTabId = sender.tab?.id || 'default';
        conversationHistory.delete(clearTabId);
        sendResponse({ success: true });
        break;
      
      case 'openSidePanel':
        // Open side panel for the current tab
        chrome.sidePanel.open({ tabId: sender.tab.id });
        sendResponse({ success: true });
        break;
      
      case 'summarizePage':
        handleSummarizePage(request, sender, sendResponse);
        break;
      
      case 'improveText':
        handleImproveText(request, sender, sendResponse);
        break;
      
      case 'rewriteText':
        handleRewriteText(request, sender, sendResponse);
        break;
      
      case 'translateText':
        handleTranslateText(request, sender, sendResponse);
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Background script error:', error);
    sendResponse({ 
      success: false, 
      response: 'Sorry, I encountered an error. Please try again.' 
    });
  }
  
  return true; // Keep message channel open
});

// handle chat requests with AI
async function handleChatRequest(request, sender, sendResponse) {
  const { message, includeContext } = request;
  const tabId = sender.tab?.id || 'default';
  
  console.log('Processing chat request:', { message, includeContext, tabId });
  
  try {
    // get conversation history for this tab
    const history = conversationHistory.get(tabId) || [];
    
    // get page context if needed
    let pageContext = null;
    if (includeContext) {
      pageContext = await getPageContext(sender.tab);
    }
    
    // add user message to history
    history.push({ role: 'user', content: message, timestamp: Date.now() });
    
    // generate AI response with conversation context
    const aiResponse = await generateAIResponse(message, pageContext, history);
    
    // add AI response to history
    if (aiResponse.success) {
      history.push({ role: 'assistant', content: aiResponse.response, timestamp: Date.now() });
      conversationHistory.set(tabId, history);
    }
    
    console.log('AI response generated:', aiResponse);
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Chat processing error:', error);
    sendResponse({
      success: false,
      response: 'Sorry, I encountered an error processing your request.'
    });
  }
}

// get page context from the current tab
async function getPageContext(tab) {
  try {
    if (!tab || !tab.id) {
      console.log('No valid tab provided for page context');
      return null;
    }
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          title: document.title,
          url: window.location.href,
          content: document.body.textContent.substring(0, 5000) // Limit content
        };
      }
    });
    
    return results[0]?.result || null;
  } catch (error) {
    console.error('Failed to get page context:', error);
    return null;
  }
}

// generate AI response using Gemini Nano
async function generateAIResponse(message, pageContext, history = []) {
  try {
    // check if AI is available
    console.log('Checking AI availability...');
    console.log('typeof self.ai:', typeof self.ai);
    console.log('typeof self.languageModel:', typeof self.languageModel);
    console.log('typeof self.ai?.languageModel:', typeof self.ai?.languageModel);
    
    // Try different ways to access the language model
    const lm = self.languageModel || self.ai?.languageModel;
    
    if (!lm) {
      console.warn('AI Language Model not available. Ensure Chrome AI is enabled in chrome://flags/');
      return {
        success: true,
        response: generateFallbackResponse(message, pageContext, history)
      };
    }
    
    console.log('AI Language Model is available, attempting to use Gemini Nano...');
    
    // Check if model capabilities are available
    let capabilities = null;
    try {
      capabilities = await lm.capabilities();
      console.log('AI capabilities:', capabilities);
      
      if (capabilities && capabilities.available === 'no') {
        console.log('AI model not available on this device');
        return {
          success: true,
          response: generateFallbackResponse(message, pageContext, history)
        };
      }
    } catch (error) {
      console.warn('Could not check capabilities, proceeding anyway:', error);
    }
    
    // build conversation context
    let conversationContext = '';
    if (history.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      history.slice(-4).forEach(msg => { // Last 4 messages for context
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    // build context for AI
    let contextPrompt = '';
    if (pageContext) {
      contextPrompt = `You are a helpful AI assistant. Answer the user's question directly and completely.

Page Context:
Title: ${pageContext.title}
URL: ${pageContext.url}
Content: ${pageContext.content.substring(0, 2000)}${conversationContext}

User Question: ${message}

Provide a direct, helpful answer using your full knowledge and capabilities.`;
    } else {
      contextPrompt = `You are a helpful AI assistant. Answer the user's question directly and completely.${conversationContext}

User Question: ${message}

Provide a direct, helpful answer using your full knowledge and capabilities.`;
    }
    
    // use Gemini Nano with correct API
    console.log('Creating Gemini Nano session...');
    const session = await lm.create({
      temperature: 0.7,
      topK: 40
    });
    
    console.log('Prompting Gemini Nano with prompt length:', contextPrompt.length);
    const result = await session.prompt(contextPrompt);
    
    console.log('Gemini Nano response received (length):', result ? result.length : 0);
    console.log('First 100 chars:', result ? result.substring(0, 100) + '...' : 'No result');
    
    // Cleanup session
    if (session && typeof session.destroy === 'function') {
      session.destroy();
    }
    
    return {
      success: true,
      response: result,
      usedContext: !!pageContext
    };
    
  } catch (error) {
    console.error('AI generation error:', error);
    console.error('Error details:', error.message, error.stack);
    console.log('Falling back to minimal response...');
    return {
      success: true,
      response: generateFallbackResponse(message, pageContext, history)
    };
  }
}

// generate fallback response when AI is not available
function generateFallbackResponse(message, pageContext, history = []) {
  console.log('AI not available, using minimal fallback');
  
  // provide helpful fallback when Gemini Nano is unavailable
  const instructions = `
To enable Cloudey with Gemini Nano:

1. Go to chrome://flags/
2. Search for "optimization-guide-on-device-model"
3. Set it to "Enabled (BypassPerfRequirement)"
4. Search for "prompt-api-for-internals"
5. Set it to "Enabled"
6. Restart Chrome

After restarting, Cloudey will be able to use on-device AI capabilities.
`;
  
  if (pageContext) {
    return `I can see you're on "${pageContext.title}". ${instructions}`;
  } else {
    return `Hello! I'm Cloudey, your AI assistant. ${instructions}`;
  }
}

// ===== API ACTION HANDLERS =====

// Summarize page handler
async function handleSummarizePage(request, sender, sendResponse) {
  const { tabId } = request;
  console.log('Handling summarize page request:', tabId);
  
  try {
    // Get page context
    const tab = sender.tab || (await chrome.tabs.get(tabId));
    const pageContext = await getPageContext(tab);
    
    if (!pageContext) {
      sendResponse({
        success: false,
        response: 'Unable to access page content.'
      });
      return;
    }
    
    // Check if Summarizer API is available
    if (typeof self.ai !== 'undefined' && self.ai?.summarizer) {
      try {
        const summarizer = await self.ai.summarizer.create({
          type: 'key-points',
          format: 'markdown',
          length: 'medium'
        });
        
        const summary = await summarizer.summarize(pageContext.content);
        summarizer.destroy();
        
        sendResponse({
          success: true,
          response: `Here's a summary of "${pageContext.title}":\n\n${summary}`
        });
        return;
      } catch (error) {
        console.error('Summarizer API error:', error);
      }
    }
    
    // Fallback to Gemini Nano
    const prompt = `Please provide a concise summary of this webpage:\n\nTitle: ${pageContext.title}\nContent: ${pageContext.content.substring(0, 3000)}`;
    const aiResponse = await generateAIResponse(prompt, null, []);
    
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Summarize page error:', error);
    sendResponse({
      success: false,
      response: 'Failed to summarize page. Please try again.'
    });
  }
}

// Improve text handler
async function handleImproveText(request, sender, sendResponse) {
  const { text } = request;
  console.log('Handling improve text request');
  
  try {
    // Check if Writer API is available
    if (typeof self.ai !== 'undefined' && self.ai?.writer) {
      try {
        const writer = await self.ai.writer.create({
          tone: 'formal',
          format: 'plain-text',
          length: 'as-is'
        });
        
        const improved = await writer.write(text);
        writer.destroy();
        
        sendResponse({
          success: true,
          response: `Here's an improved version:\n\n${improved}`
        });
        return;
      } catch (error) {
        console.error('Writer API error:', error);
      }
    }
    
    // Fallback to Gemini Nano
    const prompt = `Please improve this text to make it clearer and more professional:\n\n"${text}"`;
    const aiResponse = await generateAIResponse(prompt, null, []);
    
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Improve text error:', error);
    sendResponse({
      success: false,
      response: 'Failed to improve text. Please try again.'
    });
  }
}

// Rewrite text handler
async function handleRewriteText(request, sender, sendResponse) {
  const { text } = request;
  console.log('Handling rewrite text request');
  
  try {
    // Check if Rewriter API is available
    if (typeof self.ai !== 'undefined' && self.ai?.rewriter) {
      try {
        const rewriter = await self.ai.rewriter.create({
          tone: 'as-is',
          format: 'as-is',
          length: 'as-is'
        });
        
        const rewritten = await rewriter.rewrite(text);
        rewriter.destroy();
        
        sendResponse({
          success: true,
          response: `Here's an alternative phrasing:\n\n${rewritten}`
        });
        return;
      } catch (error) {
        console.error('Rewriter API error:', error);
      }
    }
    
    // Fallback to Gemini Nano
    const prompt = `Please provide an alternative way to phrase this text:\n\n"${text}"`;
    const aiResponse = await generateAIResponse(prompt, null, []);
    
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Rewrite text error:', error);
    sendResponse({
      success: false,
      response: 'Failed to rewrite text. Please try again.'
    });
  }
}

// Translate text handler
async function handleTranslateText(request, sender, sendResponse) {
  const { text } = request;
  console.log('Handling translate text request');
  
  try {
    // Check if Translator API is available
    if (typeof self.ai !== 'undefined' && self.ai?.translator) {
      try {
        // Detect source language and translate to English (or vice versa)
        const detector = await self.ai.translator.createDetector();
        const detectedLang = await detector.detect(text);
        detector.destroy();
        
        const targetLang = detectedLang === 'en' ? 'es' : 'en';
        
        const translator = await self.ai.translator.create({
          sourceLanguage: detectedLang,
          targetLanguage: targetLang
        });
        
        const translated = await translator.translate(text);
        translator.destroy();
        
        sendResponse({
          success: true,
          response: `Translated from ${detectedLang} to ${targetLang}:\n\n${translated}`
        });
        return;
      } catch (error) {
        console.error('Translator API error:', error);
      }
    }
    
    // Fallback to Gemini Nano
    const prompt = `Please translate this text to English (or if it's already in English, translate to Spanish):\n\n"${text}"`;
    const aiResponse = await generateAIResponse(prompt, null, []);
    
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Translate text error:', error);
    sendResponse({
      success: false,
      response: 'Failed to translate text. Please try again.'
    });
  }
}

console.log('Cloudey background script ready');
