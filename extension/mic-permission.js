// Microphone Permission Window Script
console.log('Microphone permission window loaded');

const enableBtn = document.getElementById('enable-btn');
const statusDiv = document.getElementById('status');
const closeBtn = document.getElementById('close-btn');

let permissionGranted = false;

// Handle enable microphone button click
enableBtn.addEventListener('click', async () => {
  try {
    enableBtn.disabled = true;
    enableBtn.textContent = 'Requesting Permission...';
    statusDiv.textContent = 'Requesting microphone access...';
    statusDiv.className = 'status';

    console.log('🎤 Requesting microphone permission from trusted context...');
    
    // Request microphone permission - this will trigger macOS permission dialog
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    });

    console.log('✅ Microphone permission granted in trusted context');
    
    // Stop the stream immediately - we just needed permission
    stream.getTracks().forEach(track => track.stop());
    
    // Update UI to show success
    enableBtn.textContent = '✓ Permission Granted';
    enableBtn.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
    statusDiv.textContent = 'Microphone access enabled successfully!';
    statusDiv.className = 'status success';
    
    permissionGranted = true;
    
    // Notify the sidebar that permission was granted
    chrome.runtime.sendMessage({ 
      action: 'micPermissionGranted',
      source: 'mic-permission-window'
    });
    
    console.log('📨 Sent micPermissionGranted message to background script');
    
    // Auto-close window after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Microphone permission denied:', error);
    
    enableBtn.disabled = false;
    enableBtn.textContent = 'Try Again';
    
    let errorMessage = 'Permission denied. Please try again.';
    
    switch (error.name) {
      case 'NotAllowedError':
        errorMessage = 'Permission denied. Please click "Allow" when prompted.';
        break;
      case 'NotFoundError':
        errorMessage = 'No microphone found. Please connect a microphone.';
        break;
      case 'NotReadableError':
        errorMessage = 'Microphone is being used by another application.';
        break;
      default:
        errorMessage = `Error: ${error.message}`;
    }
    
    statusDiv.textContent = errorMessage;
    statusDiv.className = 'status error';
  }
});

// Handle close button
closeBtn.addEventListener('click', () => {
  window.close();
});

// Handle window close
window.addEventListener('beforeunload', () => {
  if (!permissionGranted) {
    // Notify that permission window was closed without granting permission
    chrome.runtime.sendMessage({ 
      action: 'micPermissionCancelled',
      source: 'mic-permission-window'
    });
  }
});

// Handle escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.close();
  }
});
