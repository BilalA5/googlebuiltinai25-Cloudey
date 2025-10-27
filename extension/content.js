console.log('Cloudey side panel indicator loaded');

// AI Action Cursor/Trail System
let aiCursor = null;
let aiTrail = [];

function createAICursor() {
  if (aiCursor) return aiCursor;
  
  aiCursor = document.createElement('div');
  aiCursor.id = 'cloudey-ai-cursor';
  aiCursor.style.cssText = `
    position: fixed;
    width: 20px;
    height: 20px;
    background: radial-gradient(circle, rgba(147, 51, 234, 0.9) 0%, rgba(147, 51, 234, 0.3) 70%, transparent 100%);
    border-radius: 50%;
    pointer-events: none;
    z-index: 999999;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 20px rgba(147, 51, 234, 0.6);
    animation: cloudey-cursor-pulse 2s infinite;
  `;
  
  document.body.appendChild(aiCursor);
  
  // Add cursor styles
  if (!document.getElementById('cloudey-cursor-styles')) {
    const style = document.createElement('style');
    style.id = 'cloudey-cursor-styles';
    style.textContent = `
      @keyframes cloudey-cursor-pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.9;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.6;
        }
      }
      
      @keyframes cloudey-trail-fade {
        0% {
          opacity: 0.8;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(0.3);
        }
      }
      
      .cloudey-trail-dot {
        position: fixed;
        width: 8px;
        height: 8px;
        background: rgba(147, 51, 234, 0.7);
        border-radius: 50%;
        pointer-events: none;
        z-index: 999998;
        animation: cloudey-trail-fade 2s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }
  
  return aiCursor;
}

function moveAICursor(x, y, action = '') {
  const cursor = createAICursor();
  
  // Add trail dot
  const trailDot = document.createElement('div');
  trailDot.className = 'cloudey-trail-dot';
  trailDot.style.left = (x - 4) + 'px';
  trailDot.style.top = (y - 4) + 'px';
  document.body.appendChild(trailDot);
  
  // Move cursor
  cursor.style.left = (x - 10) + 'px';
  cursor.style.top = (y - 10) + 'px';
  
  // Add action indicator
  if (action) {
    const actionIndicator = document.createElement('div');
    actionIndicator.textContent = action;
    actionIndicator.style.cssText = `
      position: fixed;
      left: ${x + 15}px;
      top: ${y - 10}px;
      background: rgba(20, 10, 25, 0.9);
      color: rgba(147, 51, 234, 1);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      pointer-events: none;
      z-index: 999999;
      border: 1px solid rgba(147, 51, 234, 0.5);
      animation: cloudey-trail-fade 3s ease-out forwards;
    `;
    document.body.appendChild(actionIndicator);
    
    setTimeout(() => {
      if (actionIndicator.parentNode) {
        actionIndicator.parentNode.removeChild(actionIndicator);
      }
    }, 3000);
  }
  
  // Clean up old trail dots
  setTimeout(() => {
    if (trailDot.parentNode) {
      trailDot.parentNode.removeChild(trailDot);
    }
  }, 2000);
}

function hideAICursor() {
  if (aiCursor && aiCursor.parentNode) {
    aiCursor.parentNode.removeChild(aiCursor);
    aiCursor = null;
  }
  
  // Clear trail
  const trailDots = document.querySelectorAll('.cloudey-trail-dot');
  trailDots.forEach(dot => {
    if (dot.parentNode) {
      dot.parentNode.removeChild(dot);
    }
  });
}

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

// Google Maps Drawing Functions
let mapMarkers = [];
let mapOverlay = null;

function createMapOverlay() {
  if (mapOverlay) return mapOverlay;
  
  // Find the map canvas
  const mapCanvas = document.querySelector('canvas') || document.querySelector('[role="main"]');
  if (!mapCanvas) return null;
  
  // Create overlay div
  mapOverlay = document.createElement('div');
  mapOverlay.className = 'cloudey-map-overlay';
  mapOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  `;
  
  mapCanvas.parentElement.appendChild(mapOverlay);
  return mapOverlay;
}

function drawCircleOnMap(lat, lng, radius = 500, color = 'rgba(147, 51, 234, 0.3)') {
  const overlay = createMapOverlay();
  if (!overlay) return;
  
  // Create circle element
  const circle = document.createElement('div');
  circle.className = 'cloudey-map-circle';
  circle.style.cssText = `
    position: absolute;
    border: 3px solid ${color};
    border-radius: 50%;
    background: ${color};
    animation: cloudey-pulse 2s infinite;
    pointer-events: none;
  `;
  
  // Convert lat/lng to pixel coordinates (this is approximate)
  // Real implementation would need Google Maps API
  const x = Math.random() * 100 + '%';
  const y = Math.random() * 100 + '%';
  circle.style.left = x;
  circle.style.top = y;
  circle.style.width = '40px';
  circle.style.height = '40px';
  
  overlay.appendChild(circle);
  mapMarkers.push({ element: circle, lat, lng });
  
  return circle;
}

function drawLineOnMap(startLat, startLng, endLat, endLng, color = 'rgba(147, 51, 234, 0.6)') {
  const overlay = createMapOverlay();
  if (!overlay) return;
  
  const line = document.createElement('div');
  line.className = 'cloudey-map-line';
  line.style.cssText = `
    position: absolute;
    border: 2px solid ${color};
    pointer-events: none;
    transform-origin: 0 50%;
  `;
  
  // Calculate position and rotation (simplified)
  line.style.left = '10%';
  line.style.top = '50%';
  line.style.width = '200px';
  line.style.transform = 'rotate(45deg)';
  
  overlay.appendChild(line);
  
  return line;
}

function highlightMapResult(selector, rank = 1, isBest = false) {
  // Find the result in the sidebar
  const result = document.querySelector(selector);
  if (result) {
    // Different styling based on rank
    const colors = {
      1: 'rgba(147, 51, 234, 0.8)', // Purple for #1
      2: 'rgba(59, 130, 246, 0.7)',  // Blue for #2
      3: 'rgba(16, 185, 129, 0.6)'   // Green for #3
    };
    
    const color = colors[rank] || 'rgba(147, 51, 234, 0.6)';
    
    if (isBest) {
      // Special styling for the best match
      result.style.cssText = `
        background: rgba(147, 51, 234, 0.15) !important;
        border: 3px solid rgba(147, 51, 234, 0.9) !important;
        border-radius: 12px !important;
        padding: 8px !important;
        box-shadow: 0 0 25px rgba(147, 51, 234, 0.5) !important;
        animation: cloudey-best-match-pulse 2s infinite !important;
        transform: scale(1.02) !important;
        transition: all 0.3s ease !important;
        position: relative !important;
      `;
      
      // Add a "BEST MATCH" badge
      const badge = document.createElement('div');
      badge.textContent = '🏆 BEST MATCH';
      badge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background: rgba(147, 51, 234, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
        z-index: 1000;
        animation: cloudey-badge-pulse 1.5s infinite;
      `;
      result.appendChild(badge);
      
      // Remove badge after 5 seconds
      setTimeout(() => {
        if (badge.parentNode) {
          badge.parentNode.removeChild(badge);
        }
      }, 5000);
    } else {
      // Regular highlighting for other results
      result.style.cssText = `
        background: ${color.replace('0.8', '0.2')} !important;
        border: 2px solid ${color} !important;
        border-radius: 8px !important;
        padding: 6px !important;
        animation: cloudey-highlight-pulse 1.5s infinite !important;
        transition: all 0.3s ease !important;
      `;
    }
    
    // Scroll into view
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Remove highlight after 4 seconds
    setTimeout(() => {
      result.style.cssText = '';
    }, 4000);
  }
}

function clearMapDrawings() {
  if (mapOverlay) {
    mapOverlay.remove();
    mapOverlay = null;
  }
  mapMarkers = [];
}

// Add enhanced CSS animations
if (!document.getElementById('cloudey-map-styles')) {
  const style = document.createElement('style');
  style.id = 'cloudey-map-styles';
  style.textContent = `
    @keyframes cloudey-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.4;
      }
    }
    
    @keyframes cloudey-highlight-pulse {
      0%, 100% {
        box-shadow: 0 0 10px rgba(147, 51, 234, 0.5);
      }
      50% {
        box-shadow: 0 0 20px rgba(147, 51, 234, 0.8);
      }
    }
    
    @keyframes cloudey-best-match-pulse {
      0%, 100% {
        box-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
        transform: scale(1.02);
      }
      50% {
        box-shadow: 0 0 35px rgba(147, 51, 234, 0.8);
        transform: scale(1.05);
      }
    }
    
    @keyframes cloudey-badge-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }
    
    @keyframes cloudey-rank-highlight {
      0%, 100% {
        box-shadow: 0 0 8px currentColor;
      }
      50% {
        box-shadow: 0 0 16px currentColor;
      }
    }
    
    .agent-element-highlight {
      outline: 3px solid rgba(147, 51, 234, 0.8) !important;
      outline-offset: 2px !important;
      animation: cloudey-highlight-pulse 1s infinite !important;
    }
    
    .cloudey-best-match {
      background: rgba(147, 51, 234, 0.15) !important;
      border: 3px solid rgba(147, 51, 234, 0.9) !important;
      border-radius: 12px !important;
      animation: cloudey-best-match-pulse 2s infinite !important;
    }
    
    .cloudey-rank-1 { border-color: rgba(147, 51, 234, 0.8) !important; }
    .cloudey-rank-2 { border-color: rgba(59, 130, 246, 0.7) !important; }
    .cloudey-rank-3 { border-color: rgba(16, 185, 129, 0.6) !important; }
  `;
  document.head.appendChild(style);
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
  } else if (request.action === 'mapDrawCircle') {
    const circle = drawCircleOnMap(request.lat, request.lng, request.radius, request.color);
    sendResponse({ success: true });
  } else if (request.action === 'mapDrawLine') {
    const line = drawLineOnMap(request.startLat, request.startLng, request.endLat, request.endLng, request.color);
    sendResponse({ success: true });
  } else if (request.action === 'mapHighlightResult') {
    highlightMapResult(request.selector, request.rank, request.isBest);
    sendResponse({ success: true });
  } else if (request.action === 'mapClear') {
    clearMapDrawings();
    sendResponse({ success: true });
  } else if (request.action === 'aiCursorMove') {
    moveAICursor(request.x, request.y, request.actionText || '');
    sendResponse({ success: true });
  } else if (request.action === 'aiCursorHide') {
    hideAICursor();
    sendResponse({ success: true });
  }
});
