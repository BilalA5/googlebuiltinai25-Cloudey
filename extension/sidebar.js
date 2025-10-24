console.log('Side panel loaded');

const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('microphone-btn');
const messagesContainer = document.getElementById('messages-container');

let isListening = false;
let conversationHistory = [];

// Initialize speech recognition if available
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    isListening = true;
    micBtn.style.opacity = '1';
    micBtn.style.background = 'rgba(66, 133, 244, 0.3)';
  };
  
  recognition.onend = () => {
    isListening = false;
    micBtn.style.opacity = '0.7';
    micBtn.style.background = 'transparent';
  };
  
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (transcript) {
      chatInput.value = transcript;
      sendMessage();
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

micBtn.addEventListener('click', () => {
  if (!recognition) {
    alert('Speech recognition not supported in this browser');
    return;
  }
  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

// Send message function
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Clear input
  chatInput.value = '';
  
  // Remove empty state if exists
  const emptyState = messagesContainer.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  // Add user message
  addMessage('user', message);
  
  // Add to history
  conversationHistory.push({ role: 'user', content: message });
  
  // Show thinking indicator
  showThinkingIndicator();
  
  try {
    // Get current tab for context
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send to background for AI processing
    chrome.runtime.sendMessage(
      {
        action: 'chat',
        message: message,
        includeContext: true,
        tabId: tab.id
      },
      (response) => {
        hideThinkingIndicator();
        
        if (response && response.success) {
          const aiResponse = response.response;
          addMessage('assistant', aiResponse);
          conversationHistory.push({ role: 'assistant', content: aiResponse });
        } else {
          addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        }
      }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    hideThinkingIndicator();
    addMessage('assistant', 'An error occurred. Please try again.');
  }
}

// Add message to display
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  
  // Auto-scroll to bottom
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 100);
}

// Thinking indicator
function showThinkingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'thinking-indicator';
  indicator.className = 'thinking-indicator';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'thinking-dot';
    indicator.appendChild(dot);
  }
  
  messagesContainer.appendChild(indicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideThinkingIndicator() {
  const indicator = document.getElementById('thinking-indicator');
  if (indicator) indicator.remove();
}

// Load conversation history from background (cleared on browser close)
window.addEventListener('load', () => {
  chrome.runtime.sendMessage(
    { action: 'getChatHistory' },
    (response) => {
      if (response && response.history && response.history.length > 0) {
        conversationHistory = response.history;
        messagesContainer.innerHTML = '';
        
        response.history.forEach(msg => {
          addMessage(msg.role, msg.content);
        });
      }
    }
  );
});

console.log('Side panel initialized');
