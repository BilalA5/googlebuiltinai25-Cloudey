# exTendifAI - AI-Powered Browser Assistant

> Your intelligent browsing companion powered by Chrome's built-in AI APIs and Gemini Nano

## 🌟 Features

### 🤖 AI-Powered Chat
- **Contextual Understanding**: Automatically analyzes current page content to provide relevant answers
- **Conversation History**: Maintains chat history per tab during browser session
- **Typewriter Effect**: Smooth, readable AI response animation (25-40ms per character)
- **Voice Input**: Speak your questions using the Web Speech API

### ⚡ Quick Actions (FAB Menu)
- **📄 Summarize Page**: Get instant key-point summaries of any webpage
- **✏️ Improve Writing**: Enhance selected text for clarity and professionalism
- **🔄 Rewrite Text**: Generate alternative phrasings of selected content
- **🌐 Translate**: Detect and translate text between languages

### 🎨 Modern UI/UX
- **Bottom-Docked Chat**: Comet-inspired design with fixed bottom bar
- **Glassmorphism**: Beautiful frosted glass aesthetic throughout
- **Auto-Resizing Input**: Textarea expands from 1 to 4 lines seamlessly
- **Suggestion Chips**: Quick-start prompts for common tasks
- **Dark Theme**: Easy on the eyes with proper contrast ratios

### ♿ Accessibility First
- **ARIA Labels**: Full screen reader support
- **Keyboard Navigation**: Complete keyboard control (Tab, Enter, Shift+Enter, Esc, /, S)
- **High Contrast Mode**: Automatic adaptation for visually impaired users
- **Reduced Motion**: Respects user motion preferences
- **Live Regions**: Real-time announcements for assistive technologies

## 🚀 Getting Started

### Prerequisites
- Chrome Browser (version 120+)
- Enable Chrome AI features:
  1. Navigate to `chrome://flags/#optimization-guide-on-device-model`
  2. Set to "Enabled BypassPerfRequirement"
  3. Restart Chrome

### Installation
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the `extension` folder
5. The exTendifAI icon should appear in your extensions

### First Use
1. Click the exTendifAI icon in the extension toolbar
2. The side panel will open with the chat interface
3. Alternatively, look for the small arrow indicator (⇄) on web pages
4. Click the arrow to open the side panel
5. Start chatting or use the quick action buttons!

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line in message |
| `Cmd/Ctrl + Enter` | Send message |
| `Esc` | Cancel voice input or blur input |
| `/` | Focus chat input |
| `S` | Skip typewriter animation |

## 🔧 Technical Details

### Built With
- **Gemini Nano**: Google's on-device AI model for natural language processing
- **Chrome Prompt API**: For conversational AI capabilities
- **Chrome Summarizer API**: For intelligent page summarization
- **Chrome Writer API**: For text improvement suggestions
- **Chrome Rewriter API**: For alternative text phrasings
- **Chrome Translator API**: For multilingual support
- **Web Speech API**: For voice input functionality

### Privacy & Performance
- ✅ **100% Local Processing**: All AI runs on-device, no data sent to servers
- ✅ **Offline Capable**: Works without internet connection (once AI model is downloaded)
- ✅ **No API Costs**: Free to use, no quotas or rate limits
- ✅ **Context Never Leaves Device**: Page content stays private

### File Structure
```
extension/
├── manifest.json           # Extension configuration
├── background-simple.js    # Service worker with AI handlers
├── sidebar.html            # Side panel UI
├── sidebar.js              # Side panel logic
├── content.js              # Page indicator injection
├── icons.js                # SVG icon library
├── styles/
│   ├── sidebar.css         # Main UI styles
│   └── page-indicator.css  # Arrow indicator styles
└── assets/                 # Extension icons
```

## 🎨 Design Principles

### Bottom-Dock Chat Surface
- Fixed to bottom, full-width on desktop
- Max container width: 1200px, centered
- Height: 48-56px (expands to ~160px for 4 lines)
- 1px hairline top border + subtle shadow
- Glassmorphic background with backdrop blur

### Visual Design
- **Border Radius**: 12-16px for containers, 8px gaps
- **Font**: Inter, 14-16px base size
- **Colors**: 
  - Primary: #4285F4 (Google Blue)
  - Background: Dark with transparency layers
  - Text: White with varying opacity (95%, 60%, 40%)
- **Contrast**: Minimum 4.5:1 ratio for WCAG AA compliance

## 🐛 Known Issues

- Gemini Nano requires Chrome flags to be enabled
- AI model download may take time on first use
- Some APIs may not be available on all devices
- File attachments UI present but upload not yet implemented

## 📝 Changelog

See [CHANGELOG-v2.md](./CHANGELOG-v2.md) for detailed version history.

## 🤝 Contributing

This is a hackathon project for the Google Chrome Built-in AI Challenge 2025. 

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Google Chrome team for the Built-in AI APIs
- Perplexity's Comet UI for design inspiration
- Lucide icons for beautiful SVG icons
- The open-source community

---

**Built with ❤️ for the Google Chrome Built-in AI Challenge 2025**
