import { icons, getIconHTML } from './icons.js';

console.log('Cloudey side panel loaded');

// Platform detection removed - microphone works on all platforms

// Scroll detection for scroll-to-bottom button
function checkScrollPosition() {
  if (!messagesContainer || !scrollToBottomBtn) return;
  
  const isAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 10;
  
  if (isAtBottom) {
    scrollToBottomBtn.classList.remove('show');
  } else {
    scrollToBottomBtn.classList.add('show');
  }
}

// Scroll to bottom function
function scrollToBottom() {
  if (!messagesContainer) return;
  
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: 'smooth'
  });
}

// Audio recording variables
let microphonePermission = false;
let isRecording = false;
let isUserInitiated = false; // Flag to ensure user-initiated microphone access
let micButtonCooldown = false; // Prevent rapid clicking
let listeningStartTime = null; // Track recording start time
let listeningTimer = null; // Timer for updating display
let speechRecognition = null; // Web Speech API for real-time transcription
let maxRecordingTime = 20000; // 20 seconds max recording time
let recordingTimeout = null; // Timeout for auto-stop

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
const scrollToBottomBtn = document.getElementById('scroll-to-bottom');
const fabActions = document.getElementById('fab-actions');
const closeBtn = document.getElementById('close-btn');
const ariaPolite = document.getElementById('aria-polite');
const ariaAssertive = document.getElementById('aria-assertive');


// State
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
    if (isRecording) {
      stopRecording();
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

// Platform check for microphone availability
function checkMicrophoneAvailability() {
  // Microphone is available on all platforms
  return true;
}

// Audio recording functions
async function toggleRecording() {
  // Check if microphone is available on this platform
  if (!checkMicrophoneAvailability()) {
    return;
  }
  
  // Prevent rapid clicking
  if (micButtonCooldown) {
    console.log('Microphone button in cooldown, ignoring click');
    return;
  }
  
  if (isRecording) {
    stopRecording();
  } else {
    // Set user-initiated flag before requesting microphone access
    isUserInitiated = true;
    
    // Set cooldown to prevent rapid clicking
    micButtonCooldown = true;
    setTimeout(() => {
      micButtonCooldown = false;
    }, 2000); // 2 second cooldown
    
    await startRecording();
  }
}

// Microphone permission and recording functions simplified

async function startRecording() {
  console.log('Starting speech recognition');
  
  try {
    // Check if Speech Recognition API is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addMessage('system', '**Speech Recognition Not Supported**\n\nYour browser does not support speech recognition. Please use Chrome or Edge.');
      if (micBtn) {
        micBtn.classList.add('disabled');
        micBtn.title = 'Speech recognition not supported';
      }
      return;
    }
    
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia not supported');
      addMessage('system', '**Microphone Not Supported**\n\nYour browser does not support microphone access.');
      if (micBtn) {
        micBtn.classList.add('disabled');
        micBtn.title = 'Microphone not supported';
      }
      return;
    }
    
    // Check if we already have permission
    if (!microphonePermission) {
      console.log('Requesting microphone permission via helper window');
      
      // Open the microphone permission helper window
      try {
        chrome.windows.create({
          url: chrome.runtime.getURL('mic-permission.html'),
          type: 'popup',
          width: 400,
          height: 550,
          focused: true
        });
        
        addMessage('system', '**Permission Required**\n\nA popup window will open. Please click "Enable Microphone" and then "Allow" when prompted.\n\nAfter granting permission, click the microphone button again.');
        return; // Exit and wait for permission to be granted
      } catch (windowError) {
        console.error('Failed to open permission window:', windowError);
        addMessage('system', '**Permission Error**\n\nCould not open permission window. Please try again.');
        return;
      }
    }
    
    // If we reach here, permission should already be granted
    // Try to verify permission is still valid
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission verified');
      
      // Log audio input device info
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log('Using microphone:', audioTracks[0].label);
        console.log('Microphone settings:', audioTracks[0].getSettings());
      }
      
      // Stop stream immediately after permission check
      stream.getTracks().forEach(track => track.stop());
      
      microphonePermission = true;
    } catch (permError) {
      // Permission was revoked or not granted yet
      microphonePermission = false;
        console.error('Microphone permission error:');
        console.error('Error name:', permError.name);
        console.error('Error message:', permError.message);
        console.error('Full error:', permError);
        
        // Update UI for disabled state
        if (micBtn) {
          // Don't disable button if user just dismissed the prompt
          if (permError.message && permError.message.toLowerCase().includes('dismiss')) {
            micBtn.title = 'Voice input - Click Allow when prompted';
          } else {
            micBtn.classList.add('disabled');
            micBtn.title = 'Microphone access denied - Check system permissions';
          }
        }
        
        // Detect platform for platform-specific instructions
        const isMacOS = navigator.platform.toLowerCase().includes('mac');
        const isWindows = navigator.platform.toLowerCase().includes('win');
        
        // Display error message to user
        let errorMessage = '**Microphone Access Required**\n\n';
        
        if (permError.name === 'NotAllowedError') {
          // Check if permission prompt was dismissed
          if (permError.message && permError.message.toLowerCase().includes('dismiss')) {
            errorMessage += 'Permission prompt was closed without allowing access.\n\n';
            errorMessage += '**To enable:**\n';
            errorMessage += '1. Click the microphone button again\n';
            errorMessage += '2. Look for the permission popup at the top of the browser window\n';
            errorMessage += '3. Click "Allow" without clicking outside or pressing Escape';
          } else if (isMacOS) {
            // macOS system-level permission issue
            errorMessage += 'macOS requires system permission for microphone access.\n\n**To enable:**\n';
            errorMessage += '1. Open **System Preferences** (or System Settings)\n';
            errorMessage += '2. Go to **Security & Privacy → Privacy → Microphone**\n';
            errorMessage += '3. Find and enable your browser (Chrome/Edge)\n';
            errorMessage += '4. **Completely quit and restart** your browser\n';
            errorMessage += '5. Reload this extension\n';
            errorMessage += '6. Click the microphone button again\n\n';
            errorMessage += 'After system permission is granted, you\'ll see a browser prompt to click "Allow".';
          } else if (isWindows) {
            errorMessage += 'Windows requires system permission for microphone access.\n\n**To enable:**\n';
            errorMessage += '1. Open **Windows Settings → Privacy → Microphone**\n';
            errorMessage += '2. Enable "Allow apps to access your microphone"\n';
            errorMessage += '3. Ensure Chrome/Edge is allowed\n';
            errorMessage += '4. Restart your browser\n';
            errorMessage += '5. Click the microphone button again';
          } else {
            errorMessage += 'Microphone access was blocked.\n\n**To enable:**\n';
            errorMessage += '1. Look for the microphone icon in your browser address bar\n';
            errorMessage += '2. Click it and select "Allow"\n';
            errorMessage += '3. Or go to chrome://settings/content/microphone\n';
            errorMessage += '4. Check your system microphone permissions';
          }
          
        } else if (permError.name === 'NotFoundError') {
          errorMessage += 'No microphone detected. Please connect a microphone and try again.';
        } else if (permError.name === 'NotReadableError') {
          errorMessage += 'Microphone is already in use by another application. Please close other apps using the microphone.';
        } else {
          errorMessage += `Error: ${permError.message}\n\nPlease check your microphone settings.`;
        }
        
        addMessage('system', errorMessage);
        return;
    }
    
    isRecording = true;
    
    // Update UI for active recording
    if (micBtn) {
      micBtn.classList.remove('disabled');
      micBtn.classList.add('recording', 'active');
      micBtn.title = 'Stop recording (max 20s)';
    }
    
    startMinimalListeningUI();
    
    // Auto-stop recording after 20 seconds
    recordingTimeout = setTimeout(() => {
      console.log('Recording time limit reached, auto-stopping');
      addMessage('system', '**Recording Time Limit**\n\n20-second maximum reached. Processing your speech...');
      
      // Get transcript before stopping
      const currentTranscript = chatInput ? chatInput.value.trim() : '';
      
      stopRecording();
      
      // Process transcript if available
      if (currentTranscript) {
        processSpeechTranscript(currentTranscript);
        
        // Reset mic button after processing
        setTimeout(() => {
          if (micBtn) {
            micBtn.classList.remove('recording', 'processing', 'active');
            micBtn.title = 'Voice input';
          }
        }, 500);
      } else {
        if (micBtn) {
          micBtn.classList.remove('recording', 'processing', 'active');
          micBtn.title = 'Voice input';
        }
      }
    }, maxRecordingTime);
    
    console.log('Speech recognition started successfully');
    
  } catch (error) {
    console.error('Speech recognition failed:', error);
    
    resetMicrophoneUI();
    
    let errorMessage = '**Microphone Error**\n\n';
    errorMessage += `${error.message}\n\nPlease try again or check your microphone settings.`;
    
    addMessage('system', errorMessage);
  }
}

function stopRecording() {
  if (isRecording) {
    console.log('Stopping recording');
    
    isRecording = false;
    
    // Clear auto-stop timeout
    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
      recordingTimeout = null;
    }
    
    // Update UI for processing state
    if (micBtn) {
      micBtn.classList.remove('recording', 'active');
      micBtn.classList.add('processing');
      micBtn.title = 'Processing...';
    }
    
    hideAudioVisualizer();
    stopMinimalListeningUI();
    
    console.log('Recording stopped');
  }
}

// Minimal listening UI controller
function startMinimalListeningUI() {
  const listeningOverlay = document.getElementById('listening-overlay');
  const listeningTimerElement = document.getElementById('listening-timer');
  const listeningStopBtn = document.getElementById('listening-stop-btn');
  
  if (listeningOverlay) {
    listeningOverlay.classList.add('active');
    console.log('Started minimal listening UI');
  }
  
  // Add stop button event listener
  if (listeningStopBtn) {
    listeningStopBtn.addEventListener('click', () => {
      console.log('Stop button clicked');
      handleStopButtonClick();
    });
  }
  
  // Start timer
  listeningStartTime = Date.now();
  listeningTimer = setInterval(updateListeningTimer, 100);
  
  startSpeechRecognition();
}

function stopMinimalListeningUI() {
  const listeningOverlay = document.getElementById('listening-overlay');
  
  if (listeningOverlay) {
    listeningOverlay.classList.remove('active');
    console.log('Stopped minimal listening UI');
  }
  
  if (listeningTimer) {
    clearInterval(listeningTimer);
    listeningTimer = null;
  }
  
  stopSpeechRecognition();
}

function updateListeningTimer() {
  const listeningTimerElement = document.getElementById('listening-timer');
  if (listeningTimerElement && listeningStartTime) {
    const elapsed = Math.floor((Date.now() - listeningStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    listeningTimerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function startSpeechRecognition() {
  // Check if Speech Recognition API is available
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.log('Speech Recognition not supported');
    addMessage('system', '**Speech Recognition Not Supported**\n\nYour browser does not support speech recognition. Please use text input instead.');
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  speechRecognition = new SpeechRecognition();
  
  // Configure for continuous and interim results
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.lang = 'en-US';
  speechRecognition.maxAlternatives = 1;
  
  let finalTranscript = '';
  let interimTranscript = '';
  
  speechRecognition.onstart = () => {
    console.log('Speech recognition started');
    finalTranscript = '';
    interimTranscript = '';
  };
  
  speechRecognition.onresult = (event) => {
    console.log('Speech recognition received result event');
    interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      const confidence = event.results[i][0].confidence;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
        console.log('Final transcript:', transcript, 'Confidence:', confidence);
      } else {
        interimTranscript += transcript;
        console.log('Interim transcript:', transcript);
      }
    }
    
    // Update chat input with real-time transcription
    if (chatInput) {
      const displayText = finalTranscript + interimTranscript;
      chatInput.value = displayText;
      chatInput.focus();
      
      // Auto-resize textarea
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }
  };
  
  speechRecognition.onerror = (event) => {
    console.log('Speech recognition error:', event.error);
    console.log('Error details:', event);
    
    // Skip error messages for user-aborted recognition
    if (event.error === 'aborted') {
      console.log('Speech recognition aborted by user');
      return;
    }
    
    let errorMessage = '';
    switch (event.error) {
      case 'no-speech':
        errorMessage = '**No Speech Detected**\n\nPlease speak clearly into your microphone.';
        break;
      case 'audio-capture':
        errorMessage = '**Microphone Error**\n\nCould not access your microphone. Please check your microphone settings.';
        break;
      case 'not-allowed':
        errorMessage = '**Permission Denied**\n\nMicrophone access was denied. Please allow microphone access and try again.';
        break;
      case 'network':
        errorMessage = '**Network Error**\n\nSpeech recognition requires an internet connection. Please check your connection.';
        break;
      default:
        errorMessage = `**Speech Recognition Error**\n\nError: ${event.error}\n\nPlease try again.`;
    }
    
    addMessage('system', errorMessage);
  };
  
  speechRecognition.onaudiostart = () => {
    console.log('Audio capture started');
  };
  
  speechRecognition.onaudioend = () => {
    console.log('Audio capture ended');
  };
  
  speechRecognition.onsoundstart = () => {
    console.log('Sound detected');
  };
  
  speechRecognition.onsoundend = () => {
    console.log('Sound ended');
  };
  
  speechRecognition.onspeechstart = () => {
    console.log('Speech detected');
  };
  
  speechRecognition.onspeechend = () => {
    console.log('Speech ended');
  };
  
  speechRecognition.onend = () => {
    console.log('Speech recognition ended');
    
    if (finalTranscript.trim()) {
      console.log('Processing final transcript:', finalTranscript.trim());
    } else if (interimTranscript.trim()) {
      console.log('Processing interim transcript:', interimTranscript.trim());
    } else {
      console.log('No speech detected');
    }
  };
  
  try {
    speechRecognition.start();
    console.log('Speech recognition started successfully');
  } catch (error) {
    console.log('Failed to start speech recognition:', error);
    addMessage('system', '**Speech Recognition Failed**\n\nCould not start speech recognition. Please try again.');
  }
}

function stopSpeechRecognition() {
  if (speechRecognition) {
    speechRecognition.stop();
    speechRecognition = null;
  }
}

function processSpeechTranscript(transcript) {
  console.log('Processing speech transcript:', transcript);
  
  // Add transcript to input for user to review
  if (chatInput && transcript) {
    chatInput.value = transcript;
    
    // Auto-resize textarea
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    
    // Update send button state based on content
    updateSendButtonState();
    
    // Focus input so user can review and send
    chatInput.focus();
  }
}

function handleStopButtonClick() {
  const listeningStopBtn = document.getElementById('listening-stop-btn');
  
  // Show processing state
  if (listeningStopBtn) {
    listeningStopBtn.classList.add('processing');
    listeningStopBtn.textContent = '';
  }
  
  // Stop speech recognition first
  stopSpeechRecognition();
  
  // Get the current transcript from chat input
  const currentTranscript = chatInput ? chatInput.value.trim() : '';
  
  // Stop the recording
  stopRecording();
  
  // Process transcript if available
  if (currentTranscript) {
    console.log('Transcript captured');
    processSpeechTranscript(currentTranscript);
    
    // Reset mic button after processing
    setTimeout(() => {
      if (micBtn) {
        micBtn.classList.remove('recording', 'processing', 'active');
        micBtn.title = 'Voice input';
      }
    }, 500);
  } else {
    addMessage('system', '**No Speech Detected**\n\nPlease try speaking again.');
    
    // Reset mic button
    if (micBtn) {
      micBtn.classList.remove('recording', 'processing', 'active');
      micBtn.title = 'Voice input';
    }
  }
  
  // Reset stop button
  if (listeningStopBtn) {
    listeningStopBtn.classList.remove('processing');
    listeningStopBtn.textContent = '⏹';
  }
}

function handleMicrophonePermissionError(error) {
  let errorMessage = '**Microphone Access Error**\n\n';
  
  if (error.name === 'NotAllowedError') {
    errorMessage += 'Please allow microphone access when prompted.\n\n**To fix:**\n1. Click the microphone button again\n2. Select "Allow" when prompted\n3. Check chrome://settings/content/microphone if needed';
  } else if (error.name === 'NotFoundError') {
    errorMessage += 'No microphone detected. Please connect a microphone and try again.';
  } else if (error.name === 'NotSupportedError') {
    errorMessage += 'Speech recognition is not supported. Please use Chrome or Edge browser.';
  } else {
    errorMessage += `Error: ${error.message}\n\nPlease try again or check your microphone settings.`;
  }
  
  // Show error message
  addMessage('system', errorMessage);
  
  // Reset microphone button state
  if (micBtn) {
    micBtn.classList.remove('recording', 'processing');
    micBtn.title = 'Voice input';
  }
  
  // Stop minimal listening UI
  stopMinimalListeningUI();
}

function resetMicrophoneUI() {
  console.log('Resetting microphone UI state');
  
  // Reset button to default state
  if (micBtn) {
    micBtn.classList.remove('recording', 'processing', 'active');
    // Preserve disabled state if permission was denied
    if (microphonePermission) {
      micBtn.classList.remove('disabled');
    }
    micBtn.title = 'Voice input';
  }
  
  isRecording = false;
  micButtonCooldown = false;
  
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }
  
  hideAudioVisualizer();
  stopMinimalListeningUI();
  
  console.log('Microphone UI reset complete');
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

// handleAudioTranscriptionResult removed - Web Speech API handles transcription directly in startSpeechRecognition()

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

// Scroll to bottom button event listener
if (scrollToBottomBtn) {
  scrollToBottomBtn.addEventListener('click', scrollToBottom);
}

// Messages container scroll listener
if (messagesContainer) {
  messagesContainer.addEventListener('scroll', checkScrollPosition);
}

// Microphone button event listener
if (micBtn) {
  micBtn.addEventListener('click', () => {
    toggleRecording();
  });
} else {
  console.log('Microphone button not found');
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

// Listen for agent step updates and microphone permission
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle microphone permission granted
  if (request.action === 'micPermissionGranted') {
    console.log('✅ Microphone permission granted from helper window');
    microphonePermission = true;
    
    // Update mic button UI
    if (micBtn) {
      micBtn.classList.remove('disabled');
      micBtn.title = 'Voice input';
    }
    
    addMessage('system', '**Permission Granted**\n\nMicrophone access enabled! You can now use voice input by clicking the microphone button.');
    return;
  }
  
  // Handle microphone permission cancelled
  if (request.action === 'micPermissionCancelled') {
    console.log('❌ Microphone permission cancelled');
    addMessage('system', '**Permission Cancelled**\n\nMicrophone permission was not granted. Click the microphone button to try again.');
    return;
  }
  
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
  
  // Speech recognition handles transcription directly - no additional handlers needed
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
    console.log('Attachment chips container not found');
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
    console.log('Files attached:', attachedFiles.map(f => f.name));
    
    // Show file processing indicator
    showTypingIndicator('Processing files...', 'processing');
    
    for (const file of attachedFiles) {
      try {
        const fileData = await readFileContent(file);
        
        if (fileData.type === 'image') {
          // Handle image files
          fileContext += `\n\n[Image: ${fileData.name}]\nType: ${fileData.mimeType}\nSize: ${fileData.size} bytes\nData: ${fileData.data}`;
          console.log(`Processed image: ${fileData.name}`);
          
          // Show success message for image
          addMessage('system', `**Image Processed**: ${fileData.name}\n\nImage has been added to your message context for analysis.`);
        } else {
          // Handle text files
          fileContext += `\n\n[File: ${fileData.name}]\n${fileData}`;
          console.log(`Processed file: ${fileData.name}`);
          
          // Show success message for text file
          addMessage('system', `**File Processed**: ${fileData.name}\n\nFile content has been added to your message context.`);
        }
        
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        addMessage('system', `**File Processing Failed**: ${file.name}\n\nCould not read file content: ${error.message}`);
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
      
      console.log('Response content:', response.response);
      typewriterEffect(response.response);
      conversationHistory.push({ role: 'assistant', content: response.response });
      return;
        } else {
      // Show the helpful error message from the background script
      hideTypingIndicator();
      promptBox?.classList.remove('loading');
      console.log('Response error:', response.error);
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
  
  // Enhanced auto-scroll with better timing
  setTimeout(() => {
    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: 'smooth'
    });
  }, 50);
  
  // Fallback scroll in case smooth scroll doesn't work
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    checkScrollPosition(); // Update scroll button visibility
  }, 200);
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
      
      // Smooth scroll during typewriter effect
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
      
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
  
  // Enhanced scroll for typing indicator
  setTimeout(() => {
    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: 'smooth'
    });
  }, 50);
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
