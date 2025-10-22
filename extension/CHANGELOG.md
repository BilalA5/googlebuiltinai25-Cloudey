# Changelog - exTendifAI

## Version 2.0.0 - AI Assistant Transformation

### 🚀 Major Features

**Full AI Assistant Integration**
- Transformed from contextual-link widget to a comprehensive AI assistant
- Powered by Gemini Nano (Chrome's built-in AI)
- Chat interface accessible via pill icon, chat button, and sidebar
- Session-based conversation history (persists while browser is open)
- Hybrid context injection: proactive + on-demand page analysis

### ✨ New Features

**Chat Manager**
- Session-based conversation storage per tab
- Auto-prunes history (max 50 messages per tab)
- Page context caching with 5-minute TTL
- Smart context detection for page-related queries

**AI Bridge Enhancements**
- `chatWithAssistant()` method for conversational queries
- Context injection logic with keyword matching
- System prompts with page metadata
- Fallback handling for service worker context

**Mini Chat Overlay**
- Quick chat accessible from pill icon or chat button
- 400x400px floating overlay with glassmorphism styling
- Escape key to close, click-outside dismissal
- "Open in Sidebar" button for deep conversations
- Beautiful Google gradient header

**Sidebar Chat Interface**
- Chat-first layout with collapsible context section
- Message bubbles with timestamps
- Auto-expanding textarea (up to 5 lines)
- Context toggle checkbox
- Clear chat and export chat functionality

**AI Thinking Animations**
- **Thinking** 🧠 - Grey pulsing for general processing
- **Reasoning** 🔍 - Rotating icon for complex analysis
- **Contextualizing** 🔗 - Gradient shimmer for multi-tab correlation
- Animated ellipsis dots
- Smooth state transitions

### 🎨 UI/UX Improvements

**Styling**
- Dark mode throughout with Google 4-color gradient accents
- Pure white pill background with black text
- Message bubbles with Google gradient top border
- Smooth animations and transitions
- Glassmorphism effects on overlays

**Interactions**
- Lightning icon (⚡) clickable to open chat
- Chat button added to pill actions
- Hover effects on all buttons
- Auto-scroll to latest messages
- Enter to send, Shift+Enter for new line

### 📁 New Files

- `extension/chatManager.js` - Conversation management
- `extension/sidebar-chat.js` - Sidebar chat logic
- `extension/styles/chat.css` - Chat interface styling

### 🔧 Modified Files

- `extension/manifest.json` - Version 2.0.0, updated description
- `extension/background.js` - Chat handlers, context extraction
- `extension/aiBridge.js` - Chat methods, system prompts
- `extension/content.js` - Mini chat overlay, event handlers
- `extension/sidebar.html` - Chat-first layout
- `extension/styles/pill.css` - Mini chat overlay styles
- `extension/styles/sidebar.css` - Collapsible context section

### 🎯 Key Capabilities

1. **Page Context Awareness** - Automatically analyzes current page
2. **General Knowledge** - Answers questions beyond page content
3. **Cross-Tab Insights** - Can correlate information across tabs
4. **Session Persistence** - Conversation history lasts browser session
5. **Instant Responses** - Local AI processing with Gemini Nano

### 📊 Commit Summary

15+ commits with mixed styles:
- `feat: added chatWithAssistant method with context injection`
- `Created ChatManager class for session-based chat storage.`
- `Implemented sidebar chat functionality with thinking indicators`
- `Built chat interface styling with dark mode and thinking animations.`
- And more...

### 🔮 Future Enhancements

- Copy message button
- Regenerate response
- Message editing
- Conversation branching
- Export as markdown (partially implemented)

---

## Version 1.0.1 - Initial Release

- Floating liquid glass pill
- Page capture and analysis
- Cross-page comparison
- Entity and claim extraction
- Contextual insights

