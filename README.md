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

**These flags enable Chrome APIs that Gemini orchestrates for page interaction and context awareness.**

---

## Features

### 🤖 **AI Chat Assistant**
- **Context-aware conversations** - Understands current webpage content
- **Gemini-powered responses** - Uses Google's Gemini API
- **Chrome API orchestration** - Gemini controls Chrome APIs for page interaction
- **Pre-configured API** - Uses integrated Gemini API access

### 🎤 **Voice Input** 
- **Speech-to-text** - Speak your questions naturally
- **Real-time transcription** - See your words as you speak
- **Hands-free interaction** - Perfect for accessibility
- 
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
- **Internet connection** - Required for Gemini API access

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

3. **Start Using Cloudey**
   - Click the Cloudey icon or look for the ⇄ arrow on web pages
   - Start chatting with the AI immediately
   - No additional configuration needed

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
- **Gemini API**: Uses Google's Gemini API for AI responses
- **Chrome APIs**: Gemini orchestrates Chrome extension APIs for page interaction
- **Cloud Processing**: AI inference happens via Google's servers
- **API Communication**: Real-time communication with Gemini API

### Model Information
- **Model**: Google Gemini API
- **API Access**: Via Google AI Studio
- **Processing**: Cloud-based inference
- **Availability**: Requires internet connection

### Security & Privacy
- **Cloud Processing**: AI inference happens on Google's servers
- **Pre-configured Access**: Uses integrated Gemini API access
- **Data Transmission**: Conversations sent to Gemini API
- **Secure Communication**: HTTPS communication with Google's servers

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

### **Browser Requirements**
- **Chrome 138+** - Required for Prompt API support
- **Chrome Flags** - Must be enabled for AI functionality
- **Hardware** - Some older devices may not support on-device AI

---

## Troubleshooting

### Common Issues

#### "API Access Error"
- ✅ Check your internet connection
- ✅ Ensure Chrome flags are enabled for page interaction
- ✅ Try refreshing the page and extension
- ✅ Contact support if issues persist

#### AI Responses Are Slow
- ✅ Check your internet connection
- ✅ Gemini API may be experiencing high load
- ✅ Try refreshing the page and extension
- ✅ Contact support if issues persist

#### Model Unavailable
- ✅ Check your internet connection
- ✅ Verify Chrome flags are enabled for page interaction
- ✅ Some features require Chrome 138+ and enabled flags
- ✅ Contact support if issues persist

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
- **Google Gemini API**: Primary AI inference via Google AI Studio
- **Chrome Extensions API**: Sidebar, tabs, scripting, storage
- **Web APIs**: Speech recognition, file upload, image processing
- **Chrome Flags**: Enable page interaction capabilities

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
