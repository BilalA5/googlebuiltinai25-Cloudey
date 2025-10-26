# Cloudey

AI-powered browser assistant using Chrome's built-in Prompt API with Gemini Nano.

## Features

- **Chat with AI** - Ask questions about any webpage
- **Quick Actions** - Summarize, improve, rewrite, translate text
- **Voice Input** - Speak your questions
- **Context Aware** - Understands current page content
- **Privacy First** - All AI processing happens locally on-device

## Setup

1. **Verify Chrome version** (required Chrome 138+):
   - Go to `chrome://version/`
   - Ensure you're running Chrome **138 or newer**

2. **Enable Chrome AI flags** (required for Gemini Nano):
   - Go to `chrome://flags/`
   - Search for and enable:
     - **"Prompt API for Gemini Nano"** - Set to "Enabled"
     - **"optimization-guide-on-device-model"** - Set to "Enabled (BypassPerfRequirement)"
     - **"Prompt API for Gemini Nano Multimodal Input"** - Set to "Enabled" (if available)
   - Click **"Relaunch"** and wait for Chrome to fully restart

3. **Install Extension**: 
   - Open `chrome://extensions`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" → Select the `extension` folder

4. **Use Cloudey**:
   - Click the Cloudey icon in the toolbar
   - Or look for the ⇄ arrow on web pages
   - Start chatting with the AI!
   - First use will download the Gemini Nano model (~40MB) automatically

## How It Works

Cloudey uses the Chrome Prompt API (`navigator.languageModel`) to access Gemini Nano, Google's on-device AI model. This means:

- ✅ **No API keys needed** - Uses built-in Chrome AI
- ✅ **100% local processing** - Data never leaves your device
- ✅ **Fast responses** - On-device inference with no network latency
- ✅ **Free to use** - No cloud API costs
- ✅ **No special manifest permissions** - Prompt API works in extensions by default

## Technical Details

- **Extension Context**: Works in sidebar window context (not service workers)
- **Model Download**: Automatically downloads on first use (~40MB)
- **Availability States**: Handles 'available', 'downloadable', 'downloading', and 'unavailable' states
- **User Activation**: Download requires user gesture (button click)

## Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- `/` - Focus chat input
- `S` - Skip animation

## Requirements

- **Chrome Browser** version 138+
- **Prompt API** enabled via flags
- **Gemini Nano model** downloaded (happens automatically on first use, ~40MB)

## Troubleshooting

### "Prompt API not available" error
- Make sure you've enabled all three flags in `chrome://flags/`
- Verify you're on Chrome 138+
- Restart Chrome completely after enabling flags
- Reload the extension after restarting Chrome

### AI responses are slow
- The model downloads automatically on first use (~40MB)
- Subsequent responses are fast
- Check your internet connection for the initial download
- Monitor download progress in the chat

### Model unavailable
- Check that all flags are enabled and Chrome was restarted
- Make sure you have sufficient storage (~40MB for the model)
- Some hardware may not support on-device AI

## Privacy

All AI processing happens on your device using Gemini Nano. Your conversations, data, and prompts are never sent to external servers. Cloudey works completely offline after the initial model download.

## Development Notes

- **No manifest permission needed**: Prompt API works in extensions without special permissions
- **Sidebar context**: API is available in extension pages (sidebar, popup, options)
- **Service worker**: Use chrome.runtime messaging to proxy if needed from content scripts
- **Origin Trial**: No longer required for extensions (removed in Chrome 138+)