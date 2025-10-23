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
    // check if AI is available
    if (typeof ai === 'undefined' || !ai.languageModel) {
      console.log('AI not available, using fallback response');
      return {
        success: true,
        response: generateFallbackResponse(message, pageContext, history)
      };
    }
    
    // build conversation context
    let conversationContext = '';
    if (history.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      history.slice(-4).forEach(msg => { // Last 4 messages for context
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    // build context for AI - NO RESTRICTIONS!
    let contextPrompt = '';
    if (pageContext) {
      contextPrompt = `You are an AI assistant helping with a webpage. You have access to the current page content and conversation history.
      
Page Title: ${pageContext.title}
Page URL: ${pageContext.url}
Page Content: ${pageContext.content.substring(0, 2000)}...${conversationContext}

Current User Question: ${message}

Instructions:
- Provide a helpful, contextual response based on the page content and conversation history
- Be specific and detailed in your answers
- If the user asks about algorithms, search, or technical topics, provide educational explanations
- Reference specific content from the page when relevant
- Answer every question to the best of your ability
- Use your full knowledge and capabilities
- Be helpful and informative`;
    } else {
      contextPrompt = `You are an AI assistant with general knowledge.${conversationContext}

Current User Question: ${message}

Instructions:
- Provide a helpful, specific response based on your knowledge
- Be conversational and useful
- Answer every question to the best of your ability
- Use your full knowledge and capabilities
- Be helpful and informative`;
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
      response: generateFallbackResponse(message, pageContext, history)
    };
  }
}

// generate fallback response when AI is not available
function generateFallbackResponse(message, pageContext, history = []) {
  // NO RESTRICTIONS - Let AI work to its full potential!
  if (pageContext) {
    // provide more specific responses based on the page
    if (pageContext.title.toLowerCase().includes('youtube')) {
      if (message.toLowerCase().includes('algorithm') || message.toLowerCase().includes('recommend')) {
        return `YouTube's algorithm uses machine learning to personalize your feed based on your watch history, likes, subscriptions, and engagement patterns. It considers factors like video performance, user behavior, and content relevance to suggest videos you're likely to enjoy.`;
      } else if (message.toLowerCase().includes('search')) {
        return `YouTube's search algorithm ranks videos based on relevance, engagement metrics (views, likes, comments), recency, and user behavior. It also considers video quality, title keywords, and description content to provide the most relevant results.`;
      } else if (message.toLowerCase().includes('video') || message.toLowerCase().includes('watch')) {
        return `I can help you find videos on YouTube! What type of content are you looking for? I can suggest channels, explain video topics, or help you discover new content.`;
      }
      return `I can see you're on YouTube! I can help you find videos, explain content, or answer questions about what you're watching. What would you like to know?`;
    } else if (pageContext.title.toLowerCase().includes('wikipedia')) {
      return `I can see you're on Wikipedia! I can help explain concepts, summarize articles, or answer questions about the topic you're reading. What would you like to know?`;
    } else {
      return `I can see you're on "${pageContext.title}". I can help explain the content, answer questions, or provide insights about what you're viewing. What would you like to know?`;
    }
  } else {
    return `I'm your AI assistant! I can help with general questions, explanations, or any topic you'd like to discuss. What would you like to know?`;
  }
}

console.log('Enhanced background script ready');
