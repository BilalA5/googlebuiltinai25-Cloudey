// enhanced background script with AI integration
console.log('Cloudey background script loaded');

// store conversation history per tab
const conversationHistory = new Map();

// Google AI Studio configuration
const GEMINI_API_KEY = 'AIzaSyCG6s4Xh-UqR6TE2cq4dUqPAQ898ThNBSo';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent';

// AI-powered message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
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
      
      case 'geminiChat':
        handleGeminiChat(request, sender, sendResponse);
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
    // Note: navigator.languageModel is NOT available in service worker context
    // The Prompt API only works in window contexts (sidebar, popup, etc.)
    // All AI calls should be made directly from the sidebar.
    
    console.log('Background script: Prompt API not available in service worker context');
    console.log('This is expected - the sidebar handles all AI calls directly.');
    
    // Return a helpful message explaining the situation
    return {
      success: false,
      response: generateFallbackResponse(message, pageContext, history)
    };
    
  } catch (error) {
    console.error('AI generation error:', error);
    console.error('Error details:', error.message, error.stack);
    return {
      success: false,
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
2. Search for and enable:
   - "Prompt API for Gemini Nano" → Set to "Enabled"
   - "optimization-guide-on-device-model" → Set to "Enabled (BypassPerfRequirement)"
3. Click "Relaunch" and wait for Chrome to restart

After restarting, Cloudey will be able to use on-device AI capabilities.

Note: The Prompt API only works in Chrome 127+ with the required flags enabled.
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

// Gemini chat handler
async function handleGeminiChat(request, sender, sendResponse) {
  const { message, history = [], includeContext = false } = request;
  
  try {
    // Get page context if requested
    let pageContext = null;
    if (includeContext && sender.tab) {
      pageContext = await getPageContext(sender.tab);
    }

    // Prepare conversation context for Gemini
    const conversationContext = history.slice(-6).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Build context-aware prompt
    let contextPrompt = `You are Cloudey, a helpful AI assistant. Be concise, friendly, and helpful. Answer questions directly and completely.`;
    
    if (pageContext) {
      contextPrompt += `\n\nCurrent page context:\nTitle: ${pageContext.title}\nURL: ${pageContext.url}\nContent: ${pageContext.content.substring(0, 2000)}...`;
    }
    
    if (conversationContext.length > 0) {
      contextPrompt += `\n\nConversation history:\n${conversationContext.map(c => `${c.role}: ${c.parts[0].text}`).join('\n')}`;
    }
    
    contextPrompt += `\n\nUser: ${message}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: contextPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      sendResponse({
        success: true,
        response: aiResponse
      });
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
    
  } catch (error) {
    sendResponse({
      success: false,
      response: `Error: ${error.message}. Please check your internet connection.`
    });
  }
}

console.log('Cloudey background script ready');
