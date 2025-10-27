// Platform Detection Script
// Add platform class to body
document.addEventListener('DOMContentLoaded', () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMacOS = userAgent.includes('mac os x') || userAgent.includes('macintosh');
  
  if (isMacOS) {
    document.body.classList.add('macos');
  }
});
