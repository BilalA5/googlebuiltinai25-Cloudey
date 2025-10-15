# exTendifAI - Contextual Link Reasoning Chrome Extension

A Chrome extension that analyzes your browser tabs to provide contextual insights and connections using Google Cloud APIs.

## Features

- **Auto-capture**: Automatically captures content from all open tabs
- **AI Analysis**: Uses Gemini API for intelligent content analysis
- **Multi-language Support**: Cloud Translation API for analyzing content in any language
- **Contextual Insights**: Detects patterns like studying, shopping, research across tabs
- **Floating UI**: Beautiful liquid glass pill interface on every page
- **Detailed Analysis**: Sidebar with comprehensive tab analysis and connections

## Setup Instructions

### 1. Get Google Cloud API Keys

#### Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key

#### Cloud Translation API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Enable the Cloud Translation API
3. Create credentials (API key)
4. Copy the key

### 2. Configure the Extension

1. Open `config.js` in the extension folder
2. Replace the placeholder values:
   ```javascript
   GEMINI_API_KEY: 'your_actual_gemini_key_here',
   TRANSLATION_API_KEY: 'your_actual_translation_key_here',
   ```

### 3. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder
5. The extension will appear in your browser

## How It Works

1. **Auto-capture**: Extension monitors all tabs and captures content
2. **AI Analysis**: Gemini API analyzes content for entities, topics, and intent
3. **Translation**: If content is in another language, it's translated to English
4. **Context Detection**: AI finds connections between tabs (e.g., ChatGPT + D2L = studying)
5. **Insights Display**: Floating pill shows contextual insights on every page

## API Usage

The extension uses two Google Cloud APIs:

- **Gemini API**: For content analysis and context detection
- **Cloud Translation API**: For multi-language content analysis

Both APIs have generous free tiers, but usage is tracked and may incur costs for heavy usage.

## Fallback Mode

If Google Cloud APIs are not configured or fail, the extension falls back to:
- Chrome's built-in AI capabilities
- Basic content analysis
- Pattern-based context detection

## Troubleshooting

- **API Errors**: Check your API keys in `config.js`
- **Permission Issues**: Ensure the extension has access to all tabs
- **Translation Issues**: Verify Cloud Translation API is enabled
- **Analysis Issues**: Check browser console for error messages

## Privacy

- All content analysis happens locally or through Google Cloud APIs
- No data is stored on external servers (except for API calls)
- Content is only sent to Google for analysis, not stored
