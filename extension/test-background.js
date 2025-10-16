// Simple test background script
console.log('Test background script loaded');

// Test basic functionality
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  sendResponse({ success: true });
  return true;
});

console.log('Test background script initialized');
