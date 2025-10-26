// Ollama Proxy - Content script to handle Ollama requests
// This bypasses some Chrome extension security restrictions

console.log('Ollama proxy content script loaded');

// Listen for messages from the sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ollamaRequest') {
    handleOllamaRequest(request, sendResponse);
    return true; // Keep the message channel open for async response
  }
});

async function handleOllamaRequest(request, sendResponse) {
  try {
    console.log('Content script handling Ollama request');
    
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: request.messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000
        }
      })
    });

    console.log('Ollama response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    sendResponse({
      success: true,
      response: data.message.content
    });
    
  } catch (error) {
    console.error('Ollama proxy error:', error);
    sendResponse({
      success: false,
      response: `Error: ${error.message}. Please ensure Ollama is running on localhost:11434`
    });
  }
}
