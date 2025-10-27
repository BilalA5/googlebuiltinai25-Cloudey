# Cloudey

<div align="center">
  <img src="extension/assets/Cloudey ICON.svg" alt="Cloudey Logo" width="120" height="120">
  <h3>Your AI-powered browser assistant powered by Gemini</h3>
  <p>Context-aware AI assistant that understands web pages and helps you interact with them intelligently.</p>
</div>

---

## ⚠️ Important Setup Requirements

**Before installing Cloudey, you MUST enable Chrome's AI features:**

1. **Go to `chrome://flags/`**
2. **Enable these flags:**
   - `#prompt-api-for-gemini-nano` → Set to **"Enabled"**
   - `#optimization-guide-on-device-model` → Set to **"Enabled (BypassPerfRequirement)"**
   - `#prompt-api-for-gemini-nano-multimodal-input` → Set to **"Enabled"** (if available)
3. **Click "Relaunch"** and wait for Chrome to fully restart
4. **Verify Chrome version 138+** at `chrome://version/`

**Without these flags enabled, Cloudey will not work properly.**

---

## Features

### 🤖 **AI Chat Assistant**
- **Context-aware conversations** - Understands current webpage content
- **Gemini-powered responses** - Uses Google's on-device AI model
- **Privacy-first** - All processing happens locally on your device
- **No API keys required** - Uses Chrome's built-in Prompt API

### 🎤 **Voice Input** 
- **Speech-to-text** - Speak your questions naturally
- **Real-time transcription** - See your words as you speak
- **Hands-free interaction** - Perfect for accessibility
- **⚠️ macOS Limitation**: Voice input is currently not supported on macOS. A tooltip will appear explaining this limitation.

### 🔧 **Action Buttons**
- **Image Attachment** - Upload images for AI analysis
- **Voice Input** - Speak your questions naturally (🎤 button)
- **Translate** - Translate selected text on web pages
- **Agent Mode** - AI can interact with web pages automatically

### 🖼️ **Multimodal Input**
- **Image attachments** - Upload images for AI analysis
- **Visual context** - AI can see and understand images
- **Screenshot analysis** - Analyze webpage screenshots

### 🤖 **Agent Mode**
- **Page interaction** - AI can click buttons, fill forms, scroll pages
- **Smart automation** - Automate repetitive web tasks
- **Context-aware actions** - Understands page structure and content
- **Email composition** - Draft and send emails through web interfaces
- **Google Maps integration** - Search locations and get directions

### 📄 **Page Context Awareness**
- **Automatic page analysis** - Understands webpage structure and content
- **Smart references** - AI references specific page elements
- **Content extraction** - Pulls relevant information from pages
- **Cross-page conversations** - Maintains context across different pages

---

## Installation

### Prerequisites
- **Chrome Browser** version 138 or newer
- **Chrome AI flags** enabled (see setup requirements above)
- **Sufficient storage** (~40MB for Gemini Nano model)

### Setup Steps

1. **Enable Chrome AI Features** (Required)
   ```
   chrome://flags/ → Enable Prompt API flags → Relaunch Chrome
   ```

2. **Install Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" → Select the `extension` folder
   - Cloudey icon will appear in your toolbar

3. **First Use**
   - Click the Cloudey icon or look for the ⇄ arrow on web pages
   - Gemini Nano model will download automatically (~40MB)
   - Start chatting with the AI!

---

## Usage

### Basic Chat
- **Click Cloudey icon** in toolbar or **⇄ arrow** on web pages
- **Type your question** in the chat input
- **Press Enter** to send, **Shift+Enter** for new line
- **AI responds** with context-aware answers

### Voice Input
- **Click microphone button** 🎤 in chat input
- **Speak your question** clearly
- **AI transcribes** and responds
- **⚠️ Not available on macOS** - tooltip explains limitation

### Action Buttons
- **Image Attachment** - Click 📎 button to upload images for AI analysis
- **Voice Input** - Click 🎤 button to speak your questions (not available on macOS)
- **Translate** - Click Translate button to translate selected text on web pages
- **Agent Mode** - Toggle Agent mode for automated page interactions

### Agent Mode
- **Enable Agent toggle** in sidebar
- **Give instructions** like "click the login button" or "fill out this form"
- **AI performs actions** automatically on the page
- **Email composition** - "compose an email to john@example.com about the meeting"
- **Maps integration** - "find restaurants near me" or "search for coffee shops in Manhattan"

### Image Analysis
- **Click attachment button** 📎 in chat input
- **Upload image** or take screenshot
- **AI analyzes** image content and context
- **Ask questions** about the image

---

## Technical Details

### Architecture
- **Extension Context**: Works in sidebar window context
- **Prompt API**: Uses Chrome's built-in `navigator.languageModel`
- **Gemini Nano**: Google's on-device AI model (~40MB)
- **Local Processing**: All AI inference happens on-device
- **No Network Calls**: After initial model download, works offline

### Model Information
- **Model**: Gemini Nano (Google's on-device model)
- **Size**: ~40MB download on first use
- **Precision**: Optimized for mobile and desktop inference
- **Availability**: Automatically handled by Chrome's Prompt API

### Security & Privacy
- **100% Local Processing**: Data never leaves your device
- **No API Keys**: Uses Chrome's built-in AI capabilities
- **No External Servers**: All processing happens on-device
- **Secure Context**: Runs in Chrome's secure extension environment

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line in input |
| `/` | Focus chat input |
| `S` | Skip typing animation |
| `Esc` | Close sidebar |

---

## Platform Support

### ✅ **Supported Platforms**
- **Windows** - Full feature support including voice input
- **Linux** - Full feature support including voice input
- **Chrome OS** - Full feature support including voice input

### ⚠️ **Limited Support**
- **macOS** - All features work except voice input (microphone not supported)

### **Browser Requirements**
- **Chrome 138+** - Required for Prompt API support
- **Chrome Flags** - Must be enabled for AI functionality
- **Hardware** - Some older devices may not support on-device AI

---

## Troubleshooting

### Common Issues

#### "Prompt API not available" Error
- ✅ Verify Chrome version 138+ at `chrome://version/`
- ✅ Enable all three flags in `chrome://flags/`
- ✅ Restart Chrome completely after enabling flags
- ✅ Reload the extension after restarting Chrome

#### AI Responses Are Slow
- ✅ First use downloads Gemini Nano model (~40MB)
- ✅ Subsequent responses are fast
- ✅ Check internet connection for initial download
- ✅ Monitor download progress in chat interface

#### Model Unavailable
- ✅ Ensure all flags are enabled and Chrome restarted
- ✅ Check sufficient storage space (~40MB)
- ✅ Some hardware may not support on-device AI
- ✅ Try disabling and re-enabling flags

#### Voice Input Not Working
- ✅ **macOS Users**: Voice input is not supported on macOS
- ✅ **Other Platforms**: Check microphone permissions
- ✅ Ensure microphone is not being used by other applications
- ✅ Try refreshing the page and extension

#### Agent Mode Issues
- ✅ Ensure Agent toggle is enabled
- ✅ Give clear, specific instructions
- ✅ Some websites may block automated interactions
- ✅ Check that page elements are visible and accessible

---

## Development

### Project Structure
```
extension/
├── manifest.json          # Extension configuration
├── sidebar.html           # Main UI interface
├── sidebar.js            # UI logic and interactions
├── background-simple.js  # Background service worker
├── content.js            # Content script for page interaction
├── aiBridge.js           # AI communication layer
├── chatManager.js        # Chat history management
├── config.js             # Configuration settings
└── styles/
    └── sidebar.css       # UI styling
```

### Key Components
- **AI Bridge**: Handles communication with Gemini via Prompt API
- **Chat Manager**: Manages conversation history and context
- **Agent System**: Orchestrates page interactions and automation
- **Content Scripts**: Enable page analysis and interaction
- **Background Service**: Handles extension lifecycle and messaging

### API Integration
- **Chrome Prompt API**: `navigator.languageModel` for AI inference
- **Chrome Extensions API**: Sidebar, tabs, scripting, storage
- **Web APIs**: Speech recognition, file upload, image processing

---

## Contributing

We welcome contributions to improve Cloudey! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Setup
1. Clone the repository
2. Enable Chrome developer mode
3. Load the `extension` folder as an unpacked extension
4. Enable required Chrome flags
5. Start developing!

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Google** for the Gemini AI model and Chrome Prompt API
- **Chrome Extensions Team** for the excellent extension platform
- **Open Source Community** for inspiration and tools

---

## Support

If you encounter any issues or have questions:

1. **Check the troubleshooting section** above
2. **Verify Chrome flags** are properly enabled
3. **Ensure Chrome version 138+** is installed
4. **Create an issue** on GitHub with detailed information

---

<div align="center">
  <p><strong>Cloudey</strong> - Making the web more intelligent, one conversation at a time.</p>
</div>
