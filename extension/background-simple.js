// enhanced background script with AI integration
console.log('Cloudey background script loaded');

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
    // Check if Prompt API is available
    if (navigator.languageModel && navigator.languageModel.create) {
      console.log('Prompt API is available, attempting to use Gemini Nano...');
      
      // Create a language model session
      const lm = navigator.languageModel.create();
      
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
        contextPrompt = `You are Cloudey, a helpful AI assistant. Answer the user's question directly and completely.

Page Context:
Title: ${pageContext.title}
URL: ${pageContext.url}
Content: ${pageContext.content.substring(0, 2000)}${conversationContext}

User Question: ${message}

Provide a direct, helpful answer using your full knowledge and capabilities.`;
      } else {
        contextPrompt = `You are Cloudey, a helpful AI assistant. Answer the user's question directly and completely.${conversationContext}

User Question: ${message}

Provide a direct, helpful answer using your full knowledge and capabilities.`;
      }
      
      // use Prompt API
      console.log('Calling language model with prompt length:', contextPrompt.length);
      const result = await lm.prompt(contextPrompt);
      
      console.log('Gemini Nano response received (length):', result ? result.length : 0);
      console.log('First 100 chars:', result ? result.substring(0, 100) + '...' : 'No result');
      
      return {
        success: true,
        response: result,
        usedContext: !!pageContext
      };
    } else {
      console.warn('Prompt API not available. Ensure Chrome AI flags are enabled in chrome://flags/');
      return {
        success: true,
        response: generateFallbackResponse(message, pageContext, history)
      };
    }
    
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
4. Restart Chrome

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
    
    // Use Gemini Nano Prompt API for summarization
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
    // Use Gemini Nano Prompt API for text improvement
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
    // Use Gemini Nano Prompt API for rewriting
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
    // Use Gemini Nano Prompt API for translation
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
