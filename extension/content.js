console.log('Cloudey side panel indicator loaded');

// Check if extension context is valid before proceeding
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
  console.log('Extension context not available, skipping indicator creation');
} else {

// Create and inject the minimal arrow indicator
function createIndicator() {
  // check if already exists
  if (document.getElementById('side-panel-indicator')) {
    return;
  }

  const indicator = document.createElement('div');
  indicator.id = 'side-panel-indicator';
  indicator.className = 'visible';
  
  indicator.innerHTML = `
    <button class="indicator-button" title="Open Cloudey side panel">
      <img src="${chrome.runtime.getURL('assets/cloudey-icon-48.png')}" alt="Cloudey" class="cloudey-logo">
    </button>
    <button class="indicator-close" title="Close indicator">
      ✕
    </button>
  `;
  
  document.body.appendChild(indicator);
  
  const button = indicator.querySelector('.indicator-button');
  const closeBtn = indicator.querySelector('.indicator-close');
  
  // open side panel when clicked
  button.addEventListener('click', () => {
    console.log('Opening side panel...');
    try {
      // Check if extension context is still valid
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        console.log('Extension context invalidated, reloading page...');
        window.location.reload();
        return;
      }
      
      chrome.runtime.sendMessage({
        action: 'openSidePanel'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Extension context error:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          console.log('Side panel opened');
        }
      });
    } catch (error) {
      console.log('Error opening side panel:', error);
      // If we get here, the extension context is likely invalid
      window.location.reload();
    }
  });
  
  // close indicator when X is clicked
  closeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    console.log('Hiding indicator');
    indicator.classList.add('hidden');
    
    // store preference for this tab session
    try {
      // Use chrome.storage instead of sessionStorage for better cross-origin compatibility
      await chrome.storage.session.set({ 'sidePanelIndicatorHidden': 'true' });
    } catch (error) {
      console.log('Failed to save indicator preference:', error);
    }
  });
}

// initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createIndicator);
} else {
  createIndicator();
}

// check if indicator should be shown based on session storage
window.addEventListener('beforeunload', async () => {
  try {
    await chrome.storage.session.remove('sidePanelIndicatorHidden');
  } catch (error) {
    console.log('Failed to remove indicator preference:', error);
  }
});

// listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      console.log('Extension context invalidated in message listener');
      return;
    }
    
    if (request.action === 'showIndicator') {
      const indicator = document.getElementById('side-panel-indicator');
      if (indicator) {
        indicator.classList.remove('hidden');
        indicator.classList.add('visible');
      }
    }
  } catch (error) {
    console.log('Error in message listener:', error);
  }
});

console.log('Cloudey indicator initialized');
}

// Agent Mode Border Management
let agentBorderOverlay = null;

function createAgentBorder() {
  if (agentBorderOverlay) return;
  
  agentBorderOverlay = document.createElement('div');
  agentBorderOverlay.className = 'agent-border-overlay';
  agentBorderOverlay.id = 'cloudey-agent-border';
  document.body.appendChild(agentBorderOverlay);
  console.log('Agent border overlay created');
}

function removeAgentBorder() {
  if (agentBorderOverlay) {
    agentBorderOverlay.remove();
    agentBorderOverlay = null;
    console.log('Agent border overlay removed');
  }
}

function highlightElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.add('agent-element-highlight');
    setTimeout(() => {
      element.classList.remove('agent-element-highlight');
    }, 2000);
  }
}

// Listen for agent mode messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'agentStart') {
    createAgentBorder();
    sendResponse({ success: true });
  } else if (request.action === 'agentEnd') {
    removeAgentBorder();
    sendResponse({ success: true });
  } else if (request.action === 'agentHighlight') {
    highlightElement(request.selector);
    sendResponse({ success: true });
  }
});
