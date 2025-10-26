# Cloudey

AI-powered browser assistant using Chrome's built-in Prompt API with Gemini Nano.

## Features

- **Chat with AI** - Ask questions about any webpage
- **Quick Actions** - Summarize, improve, rewrite, translate text
- **Voice Input** - Speak your questions
- **Context Aware** - Understands current page content
- **Privacy First** - All AI processing happens locally on-device

## Setup

1. **Enable Chrome AI flags** (required for Gemini Nano):
   - Go to `chrome://flags/`
   - Search for and enable:
     - **"Prompt API for Gemini Nano"** - Set to "Enabled"
     - **"optimization-guide-on-device-model"** - Set to "Enabled (BypassPerfRequirement)"
   - Click **"Relaunch"** and wait for Chrome to restart

2. **Verify Chrome version**:
   - Go to `chrome://version/`
   - Ensure you're running Chrome **127 or newer**

3. **Install Extension**: 
   - Open `chrome://extensions`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" → Select the `extension` folder

4. **Use Cloudey**:
   - Click the Cloudey icon in the toolbar
   - Or look for the ⇄ arrow on web pages
   - Start chatting with the AI!

## How It Works

Cloudey uses the Chrome Prompt API (`navigator.languageModel`) to access Gemini Nano, Google's on-device AI model. This means:

- ✅ **No API keys needed** - Uses built-in Chrome AI
- ✅ **100% local processing** - Data never leaves your device
- ✅ **Fast responses** - On-device inference with no network latency
- ✅ **Free to use** - No cloud API costs

## Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- `/` - Focus chat input
- `S` - Skip animation

## Requirements

- **Chrome Browser** version 127+
- **Prompt API** enabled via flags
- **Gemini Nano model** downloaded (happens automatically on first use)

## Troubleshooting

### "Prompt API not available" error
- Make sure you've enabled both flags in `chrome://flags/`
- Restart Chrome completely after enabling flags
- Verify you're on Chrome 127+

### AI responses are slow
- The model downloads automatically on first use (~40MB)
- Subsequent responses are fast
- Check your internet connection for the initial download

## Privacy

All AI processing happens on your device using Gemini Nano. Your conversations, data, and prompts are never sent to external servers. Cloudey works completely offline after the initial model download.