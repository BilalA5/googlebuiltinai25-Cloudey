# 🚀 Quick Start Guide - Cloudey

## ⚡ 60-Second Setup

### Step 1: Enable Chrome AI (One-Time)
```
1. Open: chrome://flags/#optimization-guide-on-device-model
2. Select: "Enabled BypassPerfRequirement"
3. Click: "Relaunch" button
```

### Step 2: Load Extension
```
1. Open: chrome://extensions
2. Toggle: "Developer mode" (top-right)
3. Click: "Load unpacked"
4. Select: /path/to/extension folder
```

### Step 3: Start Chatting!
```
1. Click the Cloudey icon in toolbar
   OR
   Look for the ⇄ arrow on any webpage
2. Type your question
3. Press Enter
```

---

## 🎯 What Can You Do?

### 💬 Chat with AI
- Ask questions about the current page
- Get contextual answers based on page content
- Use voice input (click microphone)
- Conversation persists per tab

### ⚡ Quick Actions (+ Button)
- **📄 Summarize**: Click to get page summary
- **✏️ Improve**: Select text → Click → Get better version
- **🔄 Rewrite**: Select text → Click → Get alternatives
- **🌐 Translate**: Select text → Click → Auto-translate

### ⌨️ Keyboard Shortcuts
- `Enter`: Send message
- `Shift + Enter`: New line
- `/`: Focus chat
- `S`: Skip animation
- `Esc`: Cancel voice

---

## 🎨 UI Tour

```
┌─────────────────────────────────────┐
│  💬 Your messages appear on right   │
│  🤖 AI responses on left             │
│  [Scrollable chat history]          │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Comet is thinking...                │ ← Typing indicator
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 📎 [Type here...] 🎤 ▶              │ ← Bottom dock
└─────────────────────────────────────┘
                            ┌─────┐
                            │  +  │ ← Quick actions
                            └─────┘
```

---

## ✅ Verify It's Working

1. **Test Basic Chat**:
   ```
   You: "What is AI?"
   AI: [Should respond with definition]
   ```

2. **Test Page Context**:
   ```
   Visit Wikipedia article
   You: "Summarize this page"
   AI: [Should summarize article]
   ```

3. **Test Voice**:
   ```
   Click microphone 🎤
   Speak: "Hello world"
   Verify transcript appears
   Press Enter to send
   ```

---

## 🐛 Troubleshooting

### "AI not available" error
- ✅ Check `chrome://flags` is enabled
- ✅ Restart Chrome after enabling
- ✅ Wait for model download (may take a few minutes)

### Voice input not working
- ✅ Check microphone permissions
- ✅ Ensure HTTPS (voice requires secure context)
- ✅ Try different browser if Web Speech API unsupported

### Side panel won't open
- ✅ Reload extension at `chrome://extensions`
- ✅ Try clicking extension icon instead of arrow
- ✅ Check console for errors (F12)

---

## 📚 Learn More

- **Full Documentation**: See [README.md](./README.md)
- **Changelog**: See [CHANGELOG-v2.md](./CHANGELOG-v2.md)
- **Implementation**: See [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)

---

## 🎉 You're All Set!

Enjoy your AI-powered browsing experience! 🚀

**Pro Tip**: Try the suggestion chips in the empty state for quick starts.

