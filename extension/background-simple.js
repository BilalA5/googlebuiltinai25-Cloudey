// enhanced background script with AI integration
console.log('Enhanced background script loaded');

// AI-powered message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  try {
    switch (request.action) {
      case 'chat':
        handleChatRequest(request, sender, sendResponse);
        break;
        
      case 'getChatHistory':
        sendResponse({ history: [] });
        break;
        
      case 'clearChatHistory':
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
  
  console.log('Processing chat request:', { message, includeContext });
  
  try {
    // get page context if needed
    let pageContext = null;
    if (includeContext) {
      pageContext = await getPageContext(sender.tab);
    }
    
    // generate AI response
    const aiResponse = await generateAIResponse(message, pageContext);
    
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
async function generateAIResponse(message, pageContext) {
  try {
    // check if AI is available
    if (typeof ai === 'undefined' || !ai.languageModel) {
      console.log('AI not available, using fallback response');
      return {
        success: true,
        response: generateFallbackResponse(message, pageContext)
      };
    }
    
    // build context for AI
    let contextPrompt = '';
    if (pageContext) {
      contextPrompt = `You are an AI assistant helping with a webpage. 
      
Page Title: ${pageContext.title}
Page URL: ${pageContext.url}
Page Content: ${pageContext.content.substring(0, 2000)}...

User Question: ${message}

Please provide a helpful, contextual response based on the page content.`;
    } else {
      contextPrompt = `You are an AI assistant. User Question: ${message}`;
    }
    
    // use Gemini Nano
    const model = await ai.languageModel.create({
      modelId: 'gemini-2.0-flash-exp'
    });
    
    const result = await model.generateText({
      prompt: contextPrompt,
      temperature: 0.7,
      maxOutputTokens: 1000
    });
    
    return {
      success: true,
      response: result.response.text(),
      usedContext: !!pageContext
    };
    
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      success: true,
      response: generateFallbackResponse(message, pageContext)
    };
  }
}

// generate fallback response when AI is not available
function generateFallbackResponse(message, pageContext) {
  if (pageContext) {
    return `I can help you with questions about "${pageContext.title}". Based on the page content, I can provide insights and answer questions about what you're viewing. What would you like to know?`;
  } else {
    return `I can help you with questions about "${message}". I'm your AI assistant and I'm here to help! What would you like to know?`;
  }
}

console.log('Enhanced background script ready');
