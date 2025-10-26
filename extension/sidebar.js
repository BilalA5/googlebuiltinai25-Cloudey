import { icons, getIconHTML } from './icons.js';

console.log('Cloudey side panel loaded');

// DOM elements
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const micBtn = document.getElementById('microphone-btn');
const attachBtn = document.getElementById('attach-btn') || document.querySelector('.prompt-action-btn[title="Attach image"]');
const fileInput = document.getElementById('file-input');
const messagesContainer = document.getElementById('messages-container');
const attachmentChips = document.getElementById('attachment-chips');
const assistantTypingRow = document.getElementById('assistant-typing-row');
const fabToggle = document.getElementById('fab-toggle');
const fabActions = document.getElementById('fab-actions');
const closeBtn = document.getElementById('close-btn');
const ariaPolite = document.getElementById('aria-polite');
const ariaAssertive = document.getElementById('aria-assertive');

// State
let isListening = false;
let isStreaming = false;
let conversationHistory = [];
let attachedFiles = [];
let typewriterAbortController = null;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Initialize icons
function initializeIcons() {
  // Note: Icons are now embedded directly in HTML as SVG, so no JS initialization needed
  console.log('Icons embedded in HTML structure');
}

// Initialize Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    isListening = true;
    if (micBtn) micBtn.classList.add('listening');
    announceToScreenReader('Listening for voice input', 'polite');
  };
  
  recognition.onend = () => {
    isListening = false;
    if (micBtn) micBtn.classList.remove('listening');
  };
  
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (transcript) {
      chatInput.value = transcript;
      autoResizeTextarea();
      chatInput.focus();
      announceToScreenReader('Voice input received. Review and press Enter to send.', 'polite');
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    
    let errorMessage = 'Voice input failed. Please try again.';
    
    if (event.error === 'not-allowed') {
      errorMessage = 'Microphone permission denied. Please enable microphone access in Chrome settings.';
      if (micBtn) {
        micBtn.disabled = true;
        micBtn.title = 'Microphone access denied';
      }
    } else if (event.error === 'no-speech') {
      errorMessage = 'No speech detected. Please try again.';
    } else if (event.error === 'audio-capture') {
      errorMessage = 'No microphone found. Please check your microphone.';
    } else if (event.error === 'network') {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    announceToScreenReader(errorMessage, 'assertive');
    isListening = false;
    if (micBtn) micBtn.classList.remove('listening');
  };
}

// Auto-resize textarea (0-4 lines)
function autoResizeTextarea() {
  chatInput.style.height = 'auto';
  const newHeight = Math.min(chatInput.scrollHeight, 160);
  chatInput.style.height = newHeight + 'px';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Enter to send (without Shift)
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement === chatInput) {
    e.preventDefault();
    sendMessage();
  }
  
  // Cmd/Ctrl + Enter to send
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && document.activeElement === chatInput) {
    e.preventDefault();
    sendMessage();
  }
  
  // Escape to cancel recording or blur
  if (e.key === 'Escape') {
    if (isListening && recognition) {
      recognition.stop();
    } else if (document.activeElement === chatInput) {
      chatInput.blur();
    }
  }
  
  // / to focus chat bar
  if (e.key === '/' && document.activeElement !== chatInput) {
    e.preventDefault();
    chatInput.focus();
  }
  
  // S to skip typewriter
  if (e.key === 's' || e.key === 'S') {
    if (isStreaming) {
      skipTypewriter();
    }
  }
});

// Event listeners
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('input', () => {
  autoResizeTextarea();
  updateSendButtonState();
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

if (micBtn) {
  micBtn.addEventListener('click', async () => {
    if (!recognition) {
      announceToScreenReader('Speech recognition not supported in this browser', 'assertive');
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      // Check if microphone permission is granted before starting
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission granted, stop the test stream and start recognition
        stream.getTracks().forEach(track => track.stop());
        recognition.start();
      } catch (error) {
        const errorName = error.name || 'Unknown error';
        const errorMessage = error.message || '';
        console.error('Microphone permission denied:', errorName, errorMessage);
        
        let userMessage = 'Microphone permission denied. Please enable microphone access in Chrome settings.';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          userMessage = 'Microphone access denied. Please allow microphone access in Chrome settings and reload.';
        } else if (errorName === 'NotFoundError') {
          userMessage = 'No microphone found. Please connect a microphone.';
        } else if (errorName === 'NotReadableError') {
          userMessage = 'Microphone is being used by another application. Please close other apps using the microphone.';
        }
        
        announceToScreenReader(userMessage, 'assertive');
        micBtn.disabled = true;
        micBtn.title = 'Microphone access denied';
      }
    }
  });
}

// File input is now handled by the action button
if (fileInput) {
  fileInput.addEventListener('change', handleFileSelection);
}

if (stopBtn) {
  stopBtn.addEventListener('click', stopGeneration);
}

// Close button
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    window.close();
  });
}

// Action button toggle (handles both file attachments and quick actions)
if (fabToggle) {
  fabToggle.addEventListener('click', () => {
    const isOpen = !fabActions.classList.contains('hidden');
    if (isOpen) {
      fabActions.classList.add('hidden');
      fabToggle.classList.remove('active');
    } else {
      fabActions.classList.remove('hidden');
      fabToggle.classList.add('active');
    }
  });
}

// Handle file input click when attachment action is selected
document.querySelector('[data-action="attach"]')?.addEventListener('click', () => {
  fileInput.click();
});

// FAB actions
document.querySelectorAll('.fab-action').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const action = btn.dataset.action;
    fabActions.classList.add('hidden');
    fabToggle.classList.remove('active');
    await handleFabAction(action);
  });
});

// Suggestion chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const prompt = chip.dataset.prompt;
    chatInput.value = prompt;
    autoResizeTextarea();
    sendMessage();
  });
});

// File handling
function handleFileSelection(e) {
  const files = Array.from(e.target.files);
  
  for (const file of files) {
    if (attachedFiles.length >= MAX_FILES) {
      announceToScreenReader(`Maximum ${MAX_FILES} files allowed`, 'assertive');
      break;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      announceToScreenReader(`File ${file.name} exceeds 25MB limit`, 'assertive');
      continue;
    }
    
    attachedFiles.push(file);
    addAttachmentChip(file);
  }
  
  fileInput.value = ''; // Reset input
}

function addAttachmentChip(file) {
  attachmentChips.classList.remove('hidden');
  
  const chip = document.createElement('div');
  chip.className = 'attachment-chip';
  chip.dataset.fileName = file.name;
  
  const sizeKB = (file.size / 1024).toFixed(1);
  chip.innerHTML = `
    <span class="attachment-chip-name">${file.name}</span>
    <span class="attachment-chip-size">(${sizeKB}KB)</span>
    <button class="attachment-chip-remove" aria-label="Remove ${file.name}">
      ${icons.x}
    </button>
  `;
  
  chip.querySelector('.attachment-chip-remove').addEventListener('click', () => {
    removeAttachment(file.name);
    chip.remove();
    if (attachedFiles.length === 0) {
      attachmentChips.classList.add('hidden');
    }
  });
  
  attachmentChips.appendChild(chip);
}

function removeAttachment(fileName) {
  attachedFiles = attachedFiles.filter(f => f.name !== fileName);
}

// Send message
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message && attachedFiles.length === 0) return;
  
  // Clear input
  chatInput.value = '';
  autoResizeTextarea();
  updateSendButtonState();
  
  // Add loading state to prompt box
  const promptBox = document.getElementById('prompt-box');
  promptBox?.classList.add('loading');
  
  // Remove empty state
  const emptyState = messagesContainer.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  // Add user message
  addMessage('user', message || '[File attachments]');
  
  // Add to history
  conversationHistory.push({ role: 'user', content: message });
  
  // Show typing indicator
  showTypingIndicator();
  
  // file attachments are stored but not sent
  if (attachedFiles.length > 0) {
    console.log('Files attached (UI only):', attachedFiles.map(f => f.name));
    // clear attachments after sending
    attachedFiles = [];
    attachmentChips.innerHTML = '';
    attachmentChips.classList.add('hidden');
  }
  
  try {
    // Check if chrome.ai.prompt is available (runs in window context, not service worker)
    console.log('Checking chrome.ai availability in sidebar...');
    
    if (chrome.ai && chrome.ai.prompt) {
      // Use Chrome's built-in Gemini Nano via chrome.ai.prompt()
      console.log('Using chrome.ai.prompt() - Gemini Nano');
      
      const prompt = `You are Cloudey, a helpful AI assistant. Answer the user's question directly and completely.

User Question: ${message}

Provide a direct, helpful answer using your full knowledge and capabilities.`;
      
      try {
        const aiResponse = await chrome.ai.prompt(prompt);
        console.log('Gemini Nano response received');
        
        hideTypingIndicator();
        promptBox?.classList.remove('loading');
        typewriterEffect(aiResponse);
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        return; // Success, exit early
      } catch (aiError) {
        console.error('Error calling chrome.ai.prompt:', aiError);
        // Fall through to API fallback
      }
    }
    
    // Fallback: Use Gemini API via background script
    console.log('chrome.ai.prompt not available, using Gemini API via background');
    chrome.runtime.sendMessage(
      {
        action: 'chat',
        message: message,
        includeContext: false
      },
      (response) => {
        hideTypingIndicator();
        promptBox?.classList.remove('loading');
        
        if (response && response.success) {
          const aiResponse = response.response;
          typewriterEffect(aiResponse);
          conversationHistory.push({ role: 'assistant', content: aiResponse });
        } else {
          addMessage('assistant', response?.response || 'Sorry, I encountered an error. Please check your API key configuration.');
          announceToScreenReader('Error processing message', 'assertive');
        }
      }
    );
    
  } catch (error) {
    console.error('Error sending message:', error);
    hideTypingIndicator();
    
    // Remove loading state from prompt box
    const promptBox = document.getElementById('prompt-box');
    promptBox?.classList.remove('loading');
    
    addMessage('assistant', 'An error occurred. Please try again.');
    announceToScreenReader('An error occurred', 'assertive');
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
  
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 100);
}

// Typewriter effect
async function typewriterEffect(text, speed = 30) {
  isStreaming = true;
  typewriterAbortController = new AbortController();
  
  // Show stop button
  if (sendBtn) sendBtn.classList.add('hidden');
  if (stopBtn) stopBtn.classList.remove('hidden');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content typing';
  
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  
  announceToScreenReader('Assistant is responding. Press S to skip animation.', 'polite');
  
  let currentText = '';
  
  try {
    for (let i = 0; i < text.length; i++) {
      if (typewriterAbortController.signal.aborted) {
        contentDiv.textContent = text;
        break;
      }
      
      currentText += text[i];
      contentDiv.textContent = currentText;
      
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      const adjustedSpeed = text.length > 500 ? speed * 0.6 : speed;
      await sleep(adjustedSpeed);
    }
  } catch (error) {
    contentDiv.textContent = text;
  }
  
  contentDiv.classList.remove('typing');
  
  isStreaming = false;
  typewriterAbortController = null;
  
  if (stopBtn) stopBtn.classList.add('hidden');
  if (sendBtn) sendBtn.classList.remove('hidden');
  
  announceToScreenReader('Response complete', 'polite');
}

function skipTypewriter() {
  if (typewriterAbortController) {
    typewriterAbortController.abort();
  }
}

function stopGeneration() {
  if (typewriterAbortController) {
    typewriterAbortController.abort();
  }
  hideTypingIndicator();
  isStreaming = false;
  if (stopBtn) stopBtn.classList.add('hidden');
  if (sendBtn) sendBtn.classList.remove('hidden');
  announceToScreenReader('Generation stopped', 'polite');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Debounce helper for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle helper for scroll performance
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Typing indicator
function showTypingIndicator() {
  assistantTypingRow.classList.remove('hidden');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  announceToScreenReader('Assistant is thinking', 'polite');
}

function hideTypingIndicator() {
  assistantTypingRow.classList.add('hidden');
}

// Update send button state
function updateSendButtonState() {
  const hasContent = chatInput.value.trim().length > 0 || attachedFiles.length > 0;
  sendBtn.disabled = !hasContent;
}

// FAB actions
async function handleFabAction(action) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    switch (action) {
      case 'summarize':
        addMessage('user', 'Summarize this page');
        showTypingIndicator();
        chrome.runtime.sendMessage(
          { action: 'summarizePage', tabId: tab.id },
          handleFabResponse
        );
        break;
        
      case 'improve':
        const selectedText = await getSelectedText(tab.id);
        if (selectedText) {
          addMessage('user', `Improve this: "${selectedText}"`);
          showTypingIndicator();
          chrome.runtime.sendMessage(
            { action: 'improveText', text: selectedText },
            handleFabResponse
          );
        } else {
          announceToScreenReader('Please select some text first', 'assertive');
        }
        break;
        
      case 'rewrite':
        const textToRewrite = await getSelectedText(tab.id);
        if (textToRewrite) {
          addMessage('user', `Rewrite this: "${textToRewrite}"`);
          showTypingIndicator();
          chrome.runtime.sendMessage(
            { action: 'rewriteText', text: textToRewrite },
            handleFabResponse
          );
        } else {
          announceToScreenReader('Please select some text first', 'assertive');
        }
        break;
        
      case 'translate':
        const textToTranslate = await getSelectedText(tab.id);
        if (textToTranslate) {
          addMessage('user', `Translate this: "${textToTranslate}"`);
          showTypingIndicator();
          chrome.runtime.sendMessage(
            { action: 'translateText', text: textToTranslate },
            handleFabResponse
          );
        } else {
          announceToScreenReader('Please select some text first', 'assertive');
        }
        break;
    }
  } catch (error) {
    console.error('FAB action error:', error);
    hideTypingIndicator();
    addMessage('assistant', 'An error occurred. Please try again.');
  }
}

function handleFabResponse(response) {
  hideTypingIndicator();
  if (response && response.success) {
    typewriterEffect(response.response);
  } else {
    addMessage('assistant', response?.response || 'Feature coming soon!');
  }
}

async function getSelectedText(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => window.getSelection().toString()
    });
    return results[0]?.result || '';
  } catch (error) {
    console.error('Error getting selected text:', error);
    return '';
  }
}

// Screen reader announcements
function announceToScreenReader(message, priority = 'polite') {
  const element = priority === 'assertive' ? ariaAssertive : ariaPolite;
  element.textContent = message;
  setTimeout(() => {
    element.textContent = '';
  }, 1000);
}

// Load conversation history
window.addEventListener('load', () => {
  initializeIcons();
  updateSendButtonState();
  
  chrome.runtime.sendMessage(
    { action: 'getChatHistory' },
    (response) => {
      if (response && response.history && response.history.length > 0) {
        conversationHistory = response.history;
        const emptyState = messagesContainer.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        response.history.forEach(msg => {
          addMessage(msg.role, msg.content);
        });
      }
    }
  );
});

console.log('Cloudey side panel initialized');
