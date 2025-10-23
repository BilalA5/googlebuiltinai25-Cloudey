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
    // check if AI is available in service worker context
    console.log('Checking AI availability...');
    console.log('typeof ai:', typeof ai);
    console.log('ai.languageModel:', typeof ai?.languageModel);
    
    if (typeof ai === 'undefined' || !ai?.languageModel) {
      console.log('AI not available in service worker, using enhanced fallback');
      return {
        success: true,
        response: generateEnhancedFallbackResponse(message, pageContext, history)
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
    
    // build context for AI - NO RESTRICTIONS!
    let contextPrompt = '';
    if (pageContext) {
      contextPrompt = `You are an AI assistant helping with a webpage. You have access to the current page content and conversation history.
      
Page Title: ${pageContext.title}
Page URL: ${pageContext.url}
Page Content: ${pageContext.content.substring(0, 2000)}...${conversationContext}

Current User Question: ${message}

Instructions:
- ANSWER THE USER'S SPECIFIC QUESTION directly and completely
- Don't ask generic questions back - provide actual answers
- Be specific and detailed in your responses
- If the user asks about algorithms, search, or technical topics, provide educational explanations
- Reference specific content from the page when relevant
- Use your full knowledge and capabilities to give comprehensive answers
- Be helpful and informative - actually solve their problem
- Don't be generic - be specific and useful`;
    } else {
      contextPrompt = `You are an AI assistant with general knowledge.${conversationContext}

Current User Question: ${message}

Instructions:
- ANSWER THE USER'S SPECIFIC QUESTION directly and completely
- Don't ask generic questions back - provide actual answers
- Be specific and detailed in your responses
- Use your full knowledge and capabilities to give comprehensive answers
- Be helpful and informative - actually solve their problem
- Don't be generic - be specific and useful`;
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
    console.log('Falling back to enhanced response...');
    return {
      success: true,
      response: generateEnhancedFallbackResponse(message, pageContext, history)
    };
  }
}

// generate enhanced fallback response when AI is not available
function generateEnhancedFallbackResponse(message, pageContext, history = []) {
  console.log('Generating enhanced fallback response for:', message);
  
  // Analyze the user's question and provide specific answers
  const lowerMessage = message.toLowerCase();
  
  // General knowledge questions
  if (lowerMessage.includes('what is') || lowerMessage.includes('what are')) {
    if (lowerMessage.includes('algorithm')) {
      return `An algorithm is a step-by-step procedure or formula for solving a problem. In computer science, algorithms are used to process data, make decisions, and solve computational problems efficiently. They're the foundation of programming and artificial intelligence.`;
    } else if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence')) {
      return `Artificial Intelligence (AI) is the simulation of human intelligence in machines. It includes machine learning, natural language processing, computer vision, and robotics. AI systems can learn, reason, and make decisions based on data.`;
    } else if (lowerMessage.includes('machine learning')) {
      return `Machine Learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed. It uses algorithms to identify patterns in data and make predictions or decisions.`;
    }
  }
  
  // YouTube-specific responses
  if (pageContext && pageContext.title.toLowerCase().includes('youtube')) {
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('video')) {
      return `I can help you find great YouTube videos! Try searching for specific topics like "machine learning tutorials", "cooking recipes", or "productivity tips". You can also browse trending videos, check out channels you're subscribed to, or explore YouTube's "Recommended for you" section based on your watch history.`;
    } else if (lowerMessage.includes('algorithm') || lowerMessage.includes('recommend')) {
      return `YouTube's recommendation algorithm uses machine learning to personalize your feed. It analyzes your watch history, likes, subscriptions, and engagement patterns to suggest videos you're likely to enjoy. The algorithm considers factors like video performance, user behavior, and content relevance.`;
    } else if (lowerMessage.includes('search')) {
      return `YouTube's search algorithm ranks videos based on relevance, engagement metrics (views, likes, comments), recency, and user behavior. It also considers video quality, title keywords, and description content to provide the most relevant results.`;
    } else if (lowerMessage.includes('monetization') || lowerMessage.includes('money')) {
      return `YouTube monetization allows creators to earn money through ads, channel memberships, Super Chat, and YouTube Premium revenue. To qualify, you need 1,000 subscribers and 4,000 watch hours in the past 12 months.`;
    } else if (lowerMessage.includes('subscriber') || lowerMessage.includes('sub')) {
      return `YouTube subscribers are users who follow your channel and get notified of new uploads. Subscribers help build your audience and increase your video's reach through the recommendation algorithm.`;
    }
  }
  
  // Wikipedia-specific responses
  if (pageContext && pageContext.title.toLowerCase().includes('wikipedia')) {
    if (lowerMessage.includes('edit') || lowerMessage.includes('contribute')) {
      return `Wikipedia is a collaborative encyclopedia where anyone can edit articles. To contribute, you need to create an account, follow Wikipedia's guidelines, and make edits that improve the content with reliable sources.`;
    } else if (lowerMessage.includes('source') || lowerMessage.includes('reference')) {
      return `Wikipedia articles must be based on reliable, published sources. These include academic journals, books, newspapers, and other verifiable sources. All claims must be backed by citations.`;
    }
  }
  
  // Excel and spreadsheet questions
  if (lowerMessage.includes('excel') || lowerMessage.includes('formula') || lowerMessage.includes('spreadsheet')) {
    if (lowerMessage.includes('sum') || lowerMessage.includes('add') || lowerMessage.includes('total')) {
      return `To sum values in Excel, use =SUM(A1:A10) to add cells A1 through A10, or =SUM(A1, A2, A3) for specific cells. For conditional sums, use =SUMIF(range, criteria, sum_range) or =SUMIFS(sum_range, criteria_range1, criteria1, criteria_range2, criteria2).`;
    } else if (lowerMessage.includes('average') || lowerMessage.includes('mean')) {
      return `To calculate averages in Excel, use =AVERAGE(A1:A10) for a range, or =AVERAGE(A1, A2, A3) for specific cells. For conditional averages, use =AVERAGEIF(range, criteria, average_range) or =AVERAGEIFS(average_range, criteria_range1, criteria1).`;
    } else if (lowerMessage.includes('count') || lowerMessage.includes('number')) {
      return `To count cells in Excel, use =COUNT(A1:A10) for numbers, =COUNTA(A1:A10) for non-empty cells, or =COUNTIF(range, criteria) for conditional counting. For multiple conditions, use =COUNTIFS(criteria_range1, criteria1, criteria_range2, criteria2).`;
    } else if (lowerMessage.includes('lookup') || lowerMessage.includes('find') || lowerMessage.includes('search')) {
      return `For lookups in Excel, use =VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup]) for vertical lookups, or =XLOOKUP(lookup_value, lookup_array, return_array) for more flexible lookups. For horizontal lookups, use =HLOOKUP.`;
    } else if (lowerMessage.includes('if') || lowerMessage.includes('condition')) {
      return `For conditional logic in Excel, use =IF(logical_test, value_if_true, value_if_false). For multiple conditions, use =IFS(condition1, result1, condition2, result2) or nested IF statements. You can also use =AND() and =OR() for complex conditions.`;
    } else {
      return `I can help with Excel formulas! Common formulas include =SUM() for addition, =AVERAGE() for means, =COUNT() for counting, =VLOOKUP() for lookups, and =IF() for conditions. What specific calculation do you need help with?`;
    }
  }
  
  // Technical questions
  if (lowerMessage.includes('how to') || lowerMessage.includes('how do')) {
    if (lowerMessage.includes('code') || lowerMessage.includes('programming')) {
      return `Programming involves writing instructions for computers using programming languages like Python, JavaScript, or Java. Start by learning basic concepts like variables, loops, and functions, then practice with small projects.`;
    } else if (lowerMessage.includes('learn') || lowerMessage.includes('study')) {
      return `Effective learning involves setting clear goals, practicing regularly, and applying knowledge through projects. Use spaced repetition, active recall, and break complex topics into smaller, manageable chunks.`;
    }
  }
  
  // Direct answers for common questions
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! I'm your AI assistant. I can help you with questions about the current page, general knowledge, or any topic you're curious about. What would you like to know?`;
  }
  
  if (lowerMessage.includes('help')) {
    return `I'm here to help! I can answer questions about the current webpage, provide explanations on various topics, help with technical concepts, or discuss general knowledge. Just ask me anything!`;
  }
  
  // Default intelligent response
  if (pageContext) {
    return `I can see you're on "${pageContext.title}". Based on your question "${message}", I can provide information about this topic. Let me know if you need more specific details or have follow-up questions.`;
  } else {
    return `I understand you're asking about "${message}". I can help explain this topic and provide detailed information. What specific aspect would you like me to focus on?`;
  }
}

// keep old function for backward compatibility
function generateFallbackResponse(message, pageContext, history = []) {
  return generateEnhancedFallbackResponse(message, pageContext, history);
}

console.log('Enhanced background script ready');
