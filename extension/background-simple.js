// enhanced background script with AI integration
console.log('Enhanced background script loaded');

// store conversation history per tab
const conversationHistory = new Map();

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
    // check if AI is available in service worker context
    console.log('Checking AI availability...');
    console.log('typeof ai:', typeof ai);
    console.log('ai.languageModel:', typeof ai?.languageModel);
    
    if (typeof ai === 'undefined' || !ai?.languageModel) {
      console.log('AI not available in service worker, using minimal fallback');
      return {
        success: true,
        response: generateFallbackResponse(message, pageContext, history)
      };
    }
    
    console.log('AI is available, attempting to use Gemini Nano...');
    
    // build conversation context
    let conversationContext = '';
    if (history.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      history.slice(-4).forEach(msg => { // Last 4 messages for context
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    // build context for AI - FULL GEMINI NANO POWER!
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
    
    // use Gemini Nano
    console.log('Creating Gemini Nano model...');
    const model = await ai.languageModel.create({
      modelId: 'gemini-2.0-flash-exp'
    });
    
    console.log('Generating text with Gemini Nano...');
    const result = await model.generateText({
      prompt: contextPrompt,
      temperature: 0.7,
      maxOutputTokens: 1000
    });
    
    console.log('Gemini Nano response received:', result.response.text().substring(0, 100) + '...');
    
    return {
      success: true,
      response: result.response.text(),
      usedContext: !!pageContext
    };
    
  } catch (error) {
    console.error('AI generation error:', error);
    console.log('Falling back to minimal response...');
    return {
      success: true,
      response: generateFallbackResponse(message, pageContext, history)
    };
  }
}

// generate fallback response when AI is not available - MINIMAL FALLBACK ONLY
function generateFallbackResponse(message, pageContext, history = []) {
  console.log('AI not available, using minimal fallback');
  
  // Only provide a simple fallback when Gemini Nano is completely unavailable
  if (pageContext) {
    return `I can see you're on "${pageContext.title}". I'm your AI assistant, but I'm having trouble accessing my full capabilities right now. Please try again in a moment.`;
  } else {
    return `I'm your AI assistant, but I'm having trouble accessing my full capabilities right now. Please try again in a moment.`;
  }
}

console.log('Enhanced background script ready');
