import { icons, getIconHTML } from './icons.js';

console.log('Cloudey side panel loaded');

// Audio recording variables
let microphonePermission = false;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// DOM elements
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const micBtn = document.getElementById('mic-btn');
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
let includeContext = true; // Default to including context
let isSending = false; // Prevent double sends
const MAX_FILES = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Gemini API integration handled via background script

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

// Audio recording functions
async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function requestMicrophonePermission() {
  try {
    console.log('🎤 Requesting microphone permission via content script...');
    
    // Get the active tab first
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    // Try content script approach first
    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Content script timeout - no response received'));
        }, 5000); // 5 second timeout
        
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'requestMicrophonePermission' 
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response && response.success) {
        microphonePermission = true;
        console.log('✅ Microphone permission granted via content script');
        
        // Show success message
        addMessage('system', '🎤 **Microphone Access Granted!**\n\nYou can now use voice input. Click the microphone button to start recording.');
        
        return true;
      } else {
        throw new Error(response?.error || 'Permission denied');
      }
      
    } catch (contentScriptError) {
      console.log('⚠️ Content script approach failed, trying direct approach:', contentScriptError.message);
      
      // Fallback: Try direct microphone access in sidebar
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          } 
        });
        
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        
        microphonePermission = true;
        console.log('✅ Microphone permission granted via direct access');
        
        // Show success message
        addMessage('system', '🎤 **Microphone Access Granted!**\n\nYou can now use voice input. Click the microphone button to start recording.');
        
        return true;
        
      } catch (directError) {
        console.log('❌ Direct microphone access also failed:', directError.message);
        throw directError; // Re-throw the direct error
      }
    }
    
  } catch (error) {
    console.log('❌ Microphone permission denied:', error);
    
    let errorMessage = '🎤 **Microphone Access Denied**\n\n';
    
    if (error.message.includes('NotAllowedError') || error.message.includes('Permission dismissed')) {
      errorMessage += 'To enable voice input:\n1. Click the microphone button again\n2. Click "Allow" when Chrome asks for microphone access\n3. Or check Chrome settings: chrome://settings/content/microphone\n4. Make sure to click "Allow" instead of dismissing the dialog';
    } else if (error.message.includes('NotFoundError')) {
      errorMessage += 'No microphone found. Please connect a microphone and try again.';
    } else if (error.message.includes('NotSupportedError')) {
      errorMessage += 'Microphone access is not supported in this browser.';
    } else if (error.message.includes('Content script timeout') || error.message.includes('message port closed')) {
      errorMessage += 'Content script communication failed. Please:\n1. Refresh the current page\n2. Try clicking the microphone button again\n3. Or check if the extension is properly loaded';
    } else {
      errorMessage += `Error: ${error.message}\n\nPlease try clicking the microphone button again.`;
    }
    
    addMessage('system', errorMessage);
    return false;
  }
}

async function startRecording() {
  console.log('🎤 Starting recording process...');
  
  if (!microphonePermission) {
    console.log('🎤 No permission yet, requesting...');
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      console.log('❌ Permission denied, cannot start recording');
      return;
    }
  }
  
  try {
    console.log('🎤 Starting recording via content script...');
    
    // Get the active tab first
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    // Try content script approach first
    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Content script timeout - no response received'));
        }, 5000); // 5 second timeout
        
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'startRecording' 
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response && response.success) {
        isRecording = true;
        
        // Update UI with visual feedback
        micBtn.classList.add('recording');
        micBtn.classList.add('active'); // Add blue glow effect
        micBtn.title = 'Stop recording';
        
        // Show audio visualizer
        showAudioVisualizer();
        
        // Start listening animation
        startListeningAnimation();
        
        console.log('🎤 Recording started successfully via content script');
        return;
      } else {
        throw new Error(response?.error || 'Recording failed');
      }
      
    } catch (contentScriptError) {
      console.log('⚠️ Content script recording failed, trying direct approach:', contentScriptError.message);
      
      // Fallback: Try direct recording in sidebar
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      isRecording = true;
      
      // Update UI with visual feedback
      micBtn.classList.add('recording');
      micBtn.classList.add('active'); // Add blue glow effect
      micBtn.title = 'Stop recording';
      
      // Show audio visualizer
      showAudioVisualizer();
      
      // Start listening animation
      startListeningAnimation();
      
      console.log('🎤 Recording started successfully via direct access');
    }
    
  } catch (error) {
    console.log('❌ Recording failed:', error);
    
    let errorMessage = '❌ **Recording Failed**\n\n';
    
    if (error.message.includes('NotAllowedError')) {
      errorMessage += 'Microphone access was denied. Please:\n1. Click the microphone button again\n2. Click "Allow" when Chrome asks for permission\n3. Or check Chrome settings: chrome://settings/content/microphone';
    } else if (error.message.includes('NotFoundError')) {
      errorMessage += 'No microphone found. Please connect a microphone and try again.';
    } else if (error.message.includes('NotSupportedError')) {
      errorMessage += 'Microphone access is not supported in this browser.';
    } else if (error.message.includes('Content script timeout') || error.message.includes('message port closed')) {
      errorMessage += 'Content script communication failed. Please:\n1. Refresh the current page\n2. Try clicking the microphone button again\n3. Or check if the extension is properly loaded';
    } else {
      errorMessage += `Error: ${error.message}\n\nPlease try again.`;
    }
    
    addMessage('system', errorMessage);
  }
}

function stopRecording() {
  if (isRecording) {
    console.log('🎤 Stopping recording...');
    
    // Try content script approach first
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'stopRecording' 
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('⚠️ Content script stop failed, using direct approach');
            // Fallback: Stop direct recording
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }
        });
      } else {
        // Fallback: Stop direct recording
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }
    });
    
    isRecording = false;
    
    // Update UI
    micBtn.classList.remove('recording');
    micBtn.classList.remove('active'); // Remove blue glow effect
    micBtn.classList.add('processing');
    micBtn.title = 'Processing...';
    
    // Hide audio visualizer
    hideAudioVisualizer();
    
    // Stop listening animation
    stopListeningAnimation();
    
    console.log('🎤 Recording stopped');
  }
}

async function processAudio(audioBlob) {
  try {
    // Convert audio to base64
    const base64Audio = await blobToBase64(audioBlob);
    
    // Call Google Speech-to-Text API
    const transcription = await callGoogleSpeechAPI(base64Audio);
    
    if (transcription && transcription.trim()) {
      // Insert transcribed text into chat input
      chatInput.value = transcription;
      chatInput.focus();
      
      // Show success message
      addMessage('system', `🎤 **Voice Input Received**\n\n"${transcription}"`);
      
      console.log('✅ Transcription successful:', transcription);
    } else {
      addMessage('system', '❌ **No Speech Detected**\n\nPlease try speaking more clearly or check your microphone.');
    }
    
  } catch (error) {
    console.log('❌ Transcription failed:', error);
    addMessage('system', '❌ **Transcription Failed**\n\nUnable to process audio. Please try again.');
  } finally {
    // Reset UI
    micBtn.classList.remove('processing');
    micBtn.title = 'Voice input';
  }
}

async function callGoogleSpeechAPI(base64Audio) {
  // Get API key from background script
  const response = await chrome.runtime.sendMessage({ action: 'getApiKey' });
  const apiKey = response?.apiKey;
  
  if (!apiKey) {
    throw new Error('API key not available');
  }
  
  const speechResponse = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 44100,
        languageCode: 'en-US',
        alternativeLanguageCodes: ['es', 'fr', 'de', 'it', 'pt'],
        enableAutomaticPunctuation: true,
        model: 'latest_long'
      },
      audio: {
        content: base64Audio.split(',')[1] // Remove data:audio/webm;base64, prefix
      }
    })
  });
  
  const result = await speechResponse.json();
  
  if (result.results && result.results.length > 0) {
    return result.results[0].alternatives[0].transcript;
  }
  
  return null;
}

// Listening Animation Controller
function startListeningAnimation() {
  const promptBox = document.getElementById('prompt-box');
  const listeningStatus = document.getElementById('listening-status');
  const listeningWaveform = document.getElementById('listening-waveform');
  
  if (promptBox) {
    promptBox.classList.add('listening');
    console.log('🎤 Started listening animation');
  }
  
  if (listeningStatus) {
    listeningStatus.textContent = '🎤 Listening...';
  }
  
  if (listeningWaveform) {
    listeningWaveform.style.display = 'block';
  }
}

function stopListeningAnimation() {
  const promptBox = document.getElementById('prompt-box');
  const listeningStatus = document.getElementById('listening-status');
  const listeningWaveform = document.getElementById('listening-waveform');
  
  if (promptBox) {
    promptBox.classList.remove('listening');
    console.log('🎤 Stopped listening animation');
  }
  
  if (listeningStatus) {
    listeningStatus.textContent = '🎤 Processing...';
    
    // Change to processing state briefly
    setTimeout(() => {
      if (listeningStatus) {
        listeningStatus.textContent = '✅ Complete';
        setTimeout(() => {
          if (listeningStatus) {
            listeningStatus.style.opacity = '0';
          }
        }, 1000);
      }
    }, 500);
  }
  
  if (listeningWaveform) {
    setTimeout(() => {
      if (listeningWaveform) {
        listeningWaveform.style.display = 'none';
      }
    }, 1000);
  }
}

function resetListeningAnimation() {
  const promptBox = document.getElementById('prompt-box');
  const listeningStatus = document.getElementById('listening-status');
  const listeningWaveform = document.getElementById('listening-waveform');
  
  if (promptBox) {
    promptBox.classList.remove('listening');
  }
  
  if (listeningStatus) {
    listeningStatus.style.opacity = '0';
    listeningStatus.textContent = '🎤 Listening...';
  }
  
  if (listeningWaveform) {
    listeningWaveform.style.display = 'none';
  }
}

function getFileIcon(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const iconMap = {
    // Images
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
    // Documents
    'pdf': '📄', 'doc': '📄', 'docx': '📄', 'txt': '📄', 'rtf': '📄',
    // Spreadsheets
    'xls': '📊', 'xlsx': '📊', 'csv': '📊',
    // Presentations
    'ppt': '📽️', 'pptx': '📽️',
    // Code
    'js': '📝', 'ts': '📝', 'html': '📝', 'css': '📝', 'json': '📝', 'xml': '📝', 'md': '📝',
    // Archives
    'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
    // Audio
    'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵', 'ogg': '🎵',
    // Video
    'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'wmv': '🎬', 'flv': '🎬', 'webm': '🎬',
    // Default
    'default': '📎'
  };
  
  return iconMap[extension] || iconMap['default'];
}

function handleAudioTranscriptionResult(transcript) {
  console.log('🎤 Audio transcription result:', transcript);
  
  // Update UI
  micBtn.classList.remove('processing');
  micBtn.title = 'Voice input';
  
  // Reset listening animation
  resetListeningAnimation();
  
  // Add transcript to message input
  const messageInput = document.getElementById('message-input');
  if (messageInput && transcript) {
    messageInput.value = transcript;
    messageInput.focus();
    
    // Show success message
    addMessage('system', `🎤 **Voice Input Received**\n\n"${transcript}"\n\nClick send to process your voice message.`);
  }
}

function showAudioVisualizer() {
  const visualizer = document.createElement('div');
  visualizer.className = 'audio-visualizer';
  visualizer.innerHTML = `
    <div class="audio-bar"></div>
    <div class="audio-bar"></div>
    <div class="audio-bar"></div>
    <div class="audio-bar"></div>
  `;
  
  micBtn.appendChild(visualizer);
}

function hideAudioVisualizer() {
  const visualizer = document.querySelector('.audio-visualizer');
  if (visualizer) {
    visualizer.remove();
  }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
pauseBtn.addEventListener('click', stopGeneration);
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

// Handle file input click when attachment button is clicked
if (attachBtn) {
  attachBtn.addEventListener('click', () => {
    if (fileInput) {
  fileInput.click();
    }
  });
}

// Microphone button event listener
if (micBtn) {
  micBtn.addEventListener('click', toggleRecording);
  console.log('🎤 Microphone button event listener added');
} else {
  console.log('❌ Microphone button not found');
}

// FAB actions
document.querySelectorAll('.fab-action').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const action = btn.dataset.action;
    fabActions.classList.add('hidden');
    fabToggle.classList.remove('active');
    await handleFabAction(action);
  });
});


// Toggle buttons
const agentToggle = document.getElementById('agent-toggle');

// Agent Mode elements
const agentDialog = document.getElementById('agent-permission-dialog');
const agentDialogClose = document.getElementById('agent-dialog-close');
const agentDialogCancel = document.getElementById('agent-dialog-cancel');
const agentDialogConfirm = document.getElementById('agent-dialog-confirm');

const agentActionsList = document.getElementById('agent-actions-list');

// Agent Mode state
let isAgentMode = false;

// Toggle system - only one can be active at a time
function deactivateAllToggles() {
  agentToggle?.classList.remove('active');
  // Context is always enabled - no need to toggle
}

function activateToggle(toggle, mode) {
  deactivateAllToggles();
  toggle.classList.add('active');
  // Context is always enabled - no mode needed
}

// Translate main button - Direct translation on click
const translateMainBtn = document.getElementById('translate-main-btn');
if (translateMainBtn) {
  translateMainBtn.addEventListener('click', async () => {
    console.log('🌐 Translate main button clicked');
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (tab) {
        const textToTranslate = await getSelectedText(tab.id);
        console.log('Selected text for translation:', textToTranslate);
        
        if (textToTranslate && textToTranslate.trim().length > 0) {
          addMessage('user', `Translate this: "${textToTranslate}"`);
          showTypingIndicator();
          
          console.log('Sending translation request to background script...');
          chrome.runtime.sendMessage(
            { action: 'translate', text: textToTranslate, from: 'auto', to: 'en' },
            (response) => {
              console.log('Translation response received:', response);
              handleFabResponse(response);
            }
          );
        } else {
          console.log('No text selected for translation');
          announceToScreenReader('Please select some text first', 'assertive');
        }
      }
    } catch (error) {
      console.error('Translate main button error:', error);
      addMessage('assistant', 'An error occurred while translating. Please try again.');
    }
  });
}

// Agent toggle
if (agentToggle) {
  agentToggle.addEventListener('click', () => {
    const isActive = agentToggle.classList.contains('active');
    
    if (isActive) {
      // Deactivate agent mode
      deactivateAgentMode();
    } else {
      // Show permission dialog for agent mode
      showAgentPermissionDialog();
    }
  });
}

// Agent permission dialog handlers
if (agentDialogClose) {
  agentDialogClose.addEventListener('click', () => {
    hideAgentPermissionDialog();
  });
}

if (agentDialogCancel) {
  agentDialogCancel.addEventListener('click', () => {
    hideAgentPermissionDialog();
  });
}

if (agentDialogConfirm) {
  agentDialogConfirm.addEventListener('click', () => {
    activateAgentMode();
    hideAgentPermissionDialog();
  });
}



// Agent Mode Functions
function showAgentPermissionDialog() {
  if (agentDialog) {
    // Generate sample actions for preview
    const sampleActions = [
      'Analyze page content',
      'Scroll to relevant sections',
      'Extract key information',
      'Fill form fields if needed'
    ];
    
    if (agentActionsList) {
      agentActionsList.innerHTML = sampleActions.map(action => 
        `<li>${action}</li>`
      ).join('');
    }
    
    agentDialog.classList.remove('hidden');
  }
}

function hideAgentPermissionDialog() {
  if (agentDialog) {
    agentDialog.classList.add('hidden');
  }
}

function activateAgentMode() {
  isAgentMode = true;
  agentToggle.classList.add('active');
  
  // Notify background script that agent mode is active
  chrome.runtime.sendMessage({ action: 'agentModeChanged', active: true });
  
  // Start border animation
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'agentStart' });
  });
  
  announceToScreenReader('Agent mode enabled - Cloudey can take control of your screen', 'polite');
}

function deactivateAgentMode() {
  isAgentMode = false;
  agentToggle.classList.remove('active');
  
  // Notify background script that agent mode is inactive
  chrome.runtime.sendMessage({ action: 'agentModeChanged', active: false });
  
  // Remove border animation from ALL tabs
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach((tab) => {
      try {
        chrome.tabs.sendMessage(tab.id, { action: 'agentEnd' }).catch(() => {
          // Ignore errors for tabs that can't receive messages
        });
      } catch (error) {
        // Ignore errors
      }
    });
  });
  
  announceToScreenReader('Agent mode disabled', 'polite');
}

// Note: Agent steps are now shown in the typing indicator shimmer

// Get page context for agent mode
async function getPageContextForAgent() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (!tab) return null;
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          title: document.title,
          url: window.location.href,
          content: document.body.innerText.substring(0, 5000)
        };
      }
    });
    
    return results[0].result;
  } catch (error) {
    console.error('Error getting page context for agent:', error);
    return null;
  }
}

// Listen for agent step updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'agentStepUpdate') {
    
    // Show action indicator based on step status and title
    if (request.status === 'active') {
      const stepTitle = request.title || '';
      let action = 'working';
      let details = '';
      
      if (stepTitle.includes('planning_actions')) {
        action = 'planning';
        details = 'next steps';
      } else if (stepTitle.includes('write_content')) {
        action = 'writing';
        details = 'to document';
                    } else if (stepTitle.includes('search_google_maps')) {
                action = 'searching_maps';
        details = '';
      } else if (stepTitle.includes('scroll')) {
        action = 'scrolling';
        details = 'to target element';
      } else if (stepTitle.includes('click')) {
        action = 'clicking';
        details = 'on element';
      } else if (stepTitle.includes('extract_data')) {
        action = 'extracting';
        details = 'from page';
      } else if (stepTitle.includes('rewrite_text')) {
        action = 'rewriting';
        details = 'content';
      } else if (stepTitle.includes('summarize_content')) {
        action = 'summarizing';
        details = 'content';
      } else if (stepTitle.includes('fill_text')) {
        action = 'writing';
        details = 'in form field';
      }
      
      showAgentActionIndicator(action, details);
    } else if (request.status === 'completed') {
      // Show completion indicator briefly
      showAgentActionIndicator('completing', 'task finished');
      setTimeout(() => {
        hideTypingIndicator();
      }, 1000);
    }
  }
  
  if (request.action === 'audioTranscriptionResult') {
    handleAudioTranscriptionResult(request.transcript);
  }
});

// Context is always enabled - no toggle needed

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
  if (!attachmentChips) {
    console.log('❌ Attachment chips container not found');
    return;
  }
  
  attachmentChips.classList.remove('hidden');
  
  const chip = document.createElement('div');
  chip.className = 'attachment-chip';
  chip.dataset.fileName = file.name;
  
  const sizeKB = (file.size / 1024).toFixed(1);
  const fileIcon = getFileIcon(file.name);
  
  chip.innerHTML = `
    <div class="attachment-chip-icon">${fileIcon}</div>
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

// Read file content based on file type
async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target.result;
      
      // Handle different file types
      const extension = file.name.split('.').pop().toLowerCase();
      
      switch (extension) {
        case 'csv':
          resolve(content); // Return raw CSV
          break;
        case 'json':
          try {
            const parsed = JSON.parse(content);
            resolve(JSON.stringify(parsed, null, 2));
          } catch (err) {
            resolve(content); // Return raw if parsing fails
          }
          break;
        case 'txt':
        case 'md':
          resolve(content);
          break;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'bmp':
        case 'svg':
          // For images, return base64 data URL for vision API
          resolve({
            type: 'image',
            name: file.name,
            mimeType: file.type,
            data: content, // This is the data URL (base64)
            size: file.size
          });
          break;
        default:
          // For other files, try to read as text
          resolve(content.substring(0, 50000)); // Limit to 50KB
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    
    // Handle different file types
    const extension = file.name.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
}

// Send message
async function sendMessage() {
  // Prevent double sends
  if (isSending) {
    console.log('Already sending, skipping duplicate...');
    return;
  }
  
  let message = chatInput.value.trim();
  
  // Validate message length - must be at least 1 character
  if (message.length < 1) {
    console.log('Message too short, not sending');
    
    // Add visual feedback for empty message
    const promptBox = document.getElementById('prompt-box');
    if (promptBox) {
      promptBox.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        promptBox.style.animation = '';
      }, 500);
    }
    
    // Show brief error message
    announceToScreenReader('Please enter a message before sending', 'assertive');
    return;
  }
  
  // Set flag after validation to prevent race conditions
  isSending = true;
  
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
  addMessage('user', message || '[Empty message]');
  
  // Add to history
  conversationHistory.push({ role: 'user', content: message });
  
  console.log('Message being sent:', message);
  console.log('Message length:', message.length);
  
  // Show typing indicator
  showTypingIndicator();
  
  // Process attached files
  let fileContext = '';
  if (attachedFiles.length > 0) {
    console.log('📎 Files attached:', attachedFiles.map(f => f.name));
    
    // Show file processing indicator
    showTypingIndicator('Processing files...', 'processing');
    
    for (const file of attachedFiles) {
      try {
        const fileData = await readFileContent(file);
        
        if (fileData.type === 'image') {
          // Handle image files
          fileContext += `\n\n[Image: ${fileData.name}]\nType: ${fileData.mimeType}\nSize: ${fileData.size} bytes\nData: ${fileData.data}`;
          console.log(`✅ Processed image: ${fileData.name}`);
          
          // Show success message for image
          addMessage('system', `🖼️ **Image Processed**: ${fileData.name}\n\nImage has been added to your message context for analysis.`);
        } else {
          // Handle text files
          fileContext += `\n\n[File: ${fileData.name}]\n${fileData}`;
          console.log(`✅ Processed file: ${fileData.name}`);
          
          // Show success message for text file
          addMessage('system', `📎 **File Processed**: ${fileData.name}\n\nFile content has been added to your message context.`);
        }
        
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        addMessage('system', `❌ **File Processing Failed**: ${file.name}\n\nCould not read file content: ${error.message}`);
      }
    }
    
    // Append file context to message
    message += fileContext;
    
    // Clear attachments after processing
    attachedFiles = [];
    if (attachmentChips) {
    attachmentChips.innerHTML = '';
    attachmentChips.classList.add('hidden');
    }
    
    // Hide file processing indicator
    hideTypingIndicator();
  }
  
  try {
    // Check which mode is currently active (only one can be active at a time)
    const isAgentMode = agentToggle?.classList.contains('active') || false;
    const isContextMode = true; // Always enabled
    
    console.log('Sending message with mode:', {
      isAgentMode,
      isContextMode,
      includeContext: true, // Always enabled
      message: message.substring(0, 50) + '...'
    });
    
    // Use Gemini API via background script with page context
    let response;
    if (isAgentMode) {
      // Show pause button for agent mode
      if (sendBtn) sendBtn.classList.add('hidden');
      if (pauseBtn) pauseBtn.classList.remove('hidden');
      
      // Show initial agent action
      showAgentActionIndicator('analyzing', 'page content');
      
      // Agent Mode: Execute actions
      response = await chrome.runtime.sendMessage({
        action: 'agentExecute',
        message: message,
        pageContext: await getPageContextForAgent()
      });
    } else {
      // Normal chat mode
      response = await chrome.runtime.sendMessage({
        action: 'geminiChat',
        message: message,
        history: conversationHistory,
        includeContext: true, // Always enabled
        agentMode: false,
        isContextMode: true // Always enabled
      });
    }
    
    console.log('📨 Response received:', response);
    
    if (response.success) {
        hideTypingIndicator();
      promptBox?.classList.remove('loading');
      
      // Show pause button during streaming
      if (sendBtn) sendBtn.classList.add('hidden');
      if (pauseBtn) pauseBtn.classList.remove('hidden');
      
      console.log('📝 Response content:', response.response);
      typewriterEffect(response.response);
      conversationHistory.push({ role: 'assistant', content: response.response });
      return;
        } else {
      // Show the helpful error message from the background script
      hideTypingIndicator();
      promptBox?.classList.remove('loading');
      console.log('❌ Response error:', response.error);
      addMessage('assistant', response.response || response.error || 'Unknown error occurred');
      announceToScreenReader('Error occurred', 'assertive');
      return;
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    hideTypingIndicator();
    promptBox?.classList.remove('loading');
    
    let errorMessage = '';
    if (error.message.includes('Gemini API error')) {
      errorMessage = `Gemini API error: ${error.message}`;
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Cannot connect to Gemini API. Please check your internet connection.';
    } else {
      errorMessage = `Error: ${error.message}. Please try again.`;
    }
    
    addMessage('assistant', errorMessage);
    announceToScreenReader('An error occurred', 'assertive');
  } finally {
    isSending = false; // Reset flag
  }
}

// Add message to display
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  // Add avatar for assistant messages
  if (role === 'assistant') {
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = '<img src="assets/Cloudey ICON.svg" alt="Cloudey" class="avatar-icon">';
    messageDiv.appendChild(avatarDiv);
  }
  
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
  
  // Show pause button
  if (sendBtn) sendBtn.classList.add('hidden');
  if (pauseBtn) pauseBtn.classList.remove('hidden');
  if (stopBtn) stopBtn.classList.add('hidden');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  
  // Add avatar for assistant messages
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar';
  avatarDiv.innerHTML = '<img src="assets/Cloudey ICON.svg" alt="Cloudey" class="avatar-icon">';
  messageDiv.appendChild(avatarDiv);
  
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
  if (pauseBtn) pauseBtn.classList.add('hidden');
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
  
  // Also stop agent mode if active
  if (agentToggle && agentToggle.classList.contains('active')) {
    deactivateAgentMode();
    addMessage('assistant', 'Agent mode stopped by user.');
  }
  
  if (stopBtn) stopBtn.classList.add('hidden');
  if (pauseBtn) pauseBtn.classList.add('hidden');
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
  
  // Position the typing indicator at the top of messages
  if (messagesContainer) {
    messagesContainer.appendChild(assistantTypingRow);
  }
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  announceToScreenReader('Assistant is thinking', 'polite');
}

// Agent action indicator with shimmer effects
function showAgentActionIndicator(action, details = '') {
  const typingStatus = document.querySelector('.typing-status');
  const typingName = document.querySelector('.typing-name');
  
  if (typingStatus && typingName) {
    // Update the indicator content
    typingName.textContent = 'Cloudey Agent';
    
    // Set action-specific text and colors
    switch (action) {
      case 'analyzing':
        typingStatus.textContent = 'Analyzing page content...';
        typingStatus.style.color = 'rgba(100, 200, 255, 0.8)';
        break;
      case 'planning':
        typingStatus.textContent = 'Planning actions...';
        typingStatus.style.color = 'rgba(255, 200, 100, 0.8)';
        break;
      case 'writing':
        typingStatus.textContent = 'Writing content...';
        typingStatus.style.color = 'rgba(100, 255, 100, 0.8)';
        break;
      case 'scrolling':
        typingStatus.textContent = 'Scrolling to target...';
        typingStatus.style.color = 'rgba(255, 100, 255, 0.8)';
        break;
      case 'clicking':
        typingStatus.textContent = 'Clicking element...';
        typingStatus.style.color = 'rgba(255, 150, 100, 0.8)';
        break;
      case 'extracting':
        typingStatus.textContent = 'Extracting data...';
        typingStatus.style.color = 'rgba(150, 100, 255, 0.8)';
        break;
      case 'rewriting':
        typingStatus.textContent = 'Rewriting content...';
        typingStatus.style.color = 'rgba(100, 255, 200, 0.8)';
        break;
      case 'summarizing':
        typingStatus.textContent = 'Summarizing content...';
        typingStatus.style.color = 'rgba(255, 255, 100, 0.8)';
        break;
      case 'searching_maps':
        typingStatus.textContent = 'Searching Google Maps...';
        typingStatus.style.color = 'rgba(100, 200, 255, 0.8)';
        break;
      case 'completing':
        typingStatus.textContent = 'Completing task...';
        typingStatus.style.color = 'rgba(200, 200, 200, 0.8)';
        break;
      default:
        typingStatus.textContent = 'Working...';
        typingStatus.style.color = 'rgba(180, 160, 190, 0.8)';
    }
    
    // Add details if provided
    if (details) {
      typingStatus.textContent += ` (${details})`;
    }
    
    // Show the indicator
    assistantTypingRow.classList.remove('hidden');
    
    // Position at top of messages
    if (messagesContainer) {
      messagesContainer.appendChild(assistantTypingRow);
    }
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
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
        console.log('🌐 Translation requested');
        const textToTranslate = await getSelectedText(tab.id);
        console.log('Selected text:', textToTranslate);
        
        if (textToTranslate && textToTranslate.trim().length > 0) {
          addMessage('user', `Translate this: "${textToTranslate}"`);
          showTypingIndicator();
          
          console.log('Sending translation request to background script...');
          chrome.runtime.sendMessage(
            { action: 'translate', text: textToTranslate, from: 'auto', to: 'en' },
            (response) => {
              console.log('Translation response received:', response);
              handleFabResponse(response);
            }
          );
        } else {
          console.log('No text selected for translation');
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
    // Handle translation responses specially
    if (response.result && response.from && response.to) {
      const translatedText = response.result;
      const detectedLanguage = response.detectedLanguage || response.from || 'auto';
      const targetLanguage = response.to || 'en';
      const method = response.method || 'unknown';
      
      // Show translation in chat with method indicator
      let methodIcon = '🌐';
      if (method === 'chrome_translator_api') {
        methodIcon = '⚡'; // Chrome Translator API
      } else if (method === 'chrome_api') {
        methodIcon = '🔧'; // Chrome i18n API
      }
      
      const translationMessage = `${methodIcon} **Translation** (${detectedLanguage} → ${targetLanguage}):\n\n${translatedText}`;
      typewriterEffect(translationMessage);
    } else {
      // Handle other responses normally
    typewriterEffect(response.response);
    }
  } else {
    addMessage('assistant', response?.response || 'Feature coming soon!');
  }
}

async function getSelectedText(tabId) {
  try {
    console.log('Getting selected text from tab:', tabId);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        console.log('Selected text in page:', selectedText);
        return selectedText;
      }
    });
    const selectedText = results[0]?.result || '';
    console.log('Retrieved selected text:', selectedText);
    return selectedText;
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

// Chrome AI flags check removed - using Gemini API for AI chat





// Initialize sidebar when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  // Initialize translate button
  const translateBtn = document.getElementById('translate-btn');
  if (translateBtn) {
    translateBtn.addEventListener('click', async () => {
      console.log('🌐 Translate button clicked');
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (tab) {
          const textToTranslate = await getSelectedText(tab.id);
          console.log('Selected text for translation:', textToTranslate);
          
          if (textToTranslate && textToTranslate.trim().length > 0) {
            addMessage('user', `Translate this: "${textToTranslate}"`);
            showTypingIndicator();
            
            console.log('Sending translation request to background script...');
            chrome.runtime.sendMessage(
              { action: 'translate', text: textToTranslate, from: 'auto', to: 'en' },
              (response) => {
                console.log('Translation response received:', response);
                handleFabResponse(response);
              }
            );
          } else {
            console.log('No text selected for translation');
            announceToScreenReader('Please select some text first', 'assertive');
          }
        }
      } catch (error) {
        console.error('Translate button error:', error);
        addMessage('assistant', 'An error occurred while translating. Please try again.');
      }
    });
  }
});

console.log('Cloudey side panel initialized');
