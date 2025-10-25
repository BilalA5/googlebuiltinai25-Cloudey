console.log('exTendifAI side panel indicator loaded');

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
    <button class="indicator-button" title="Open exTendifAI side panel">
      ⇄
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
    chrome.runtime.sendMessage({
      action: 'openSidePanel'
    }, (response) => {
      if (response && response.success) {
        console.log('Side panel opened');
      }
    });
  });
  
  // close indicator when X is clicked
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Hiding indicator');
    indicator.classList.add('hidden');
    
    // store preference for this tab session
    sessionStorage.setItem('sidePanelIndicatorHidden', 'true');
  });
}

// initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createIndicator);
} else {
  createIndicator();
}

// check if indicator should be shown based on session storage
window.addEventListener('beforeunload', () => {
  sessionStorage.removeItem('sidePanelIndicatorHidden');
});

// listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showIndicator') {
    const indicator = document.getElementById('side-panel-indicator');
    if (indicator) {
      indicator.classList.remove('hidden');
      indicator.classList.add('visible');
    }
  }
});

console.log('exTendifAI indicator initialized');
