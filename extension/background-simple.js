// simplified background script to avoid service worker errors
console.log('Simple background script loaded');

// basic message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  try {
    switch (request.action) {
      case 'chat':
        // simple chat response without AI
        const response = {
          success: true,
          response: `I can help you with questions about "${request.message}". This is a simple response while we fix the AI integration.`
        };
        console.log('Sending chat response:', response);
        sendResponse(response);
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

console.log('Simple background script ready');
