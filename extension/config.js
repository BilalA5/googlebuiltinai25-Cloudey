// Configuration file for Google Cloud APIs
// Update these values with your actual API keys

const CONFIG = {
  // Gemini API Key from Google AI Studio
  // Get it from: https://aistudio.google.com/app/apikey
  GEMINI_API_KEY: 'your_gemini_api_key_here',
  
  // Cloud Translation API Key
  // Get it from: https://console.cloud.google.com/apis/credentials
  TRANSLATION_API_KEY: 'your_translation_api_key_here',
  
  // Optional: GCP Project ID
  GCP_PROJECT_ID: 'your_project_id_here',
  
  // API endpoints
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-nano:generateContent',
  TRANSLATION_ENDPOINT: 'https://translation.googleapis.com/language/translate/v2',
  
  // Fallback settings
  USE_FALLBACK: true, // Use Chrome built-in AI if Google APIs fail
  MAX_CONTENT_LENGTH: 5000, // Max characters to send to APIs
  TRANSLATION_TARGET_LANGUAGE: 'en' // Default translation target
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}
