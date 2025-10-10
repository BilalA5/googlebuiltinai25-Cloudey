# exTendifAI - Contextual Link Reasoning

A Chrome extension that captures text from pages, extracts entities & claims using Chrome AI, and allows cross-page comparison and reasoning.

## Project Structure

```
exTendifAI/
├── landing-page/          # Remix app (documentation & landing page)
│   ├── app/               # Remix app source
│   ├── package.json       # Remix dependencies
│   ├── vite.config.ts     # Vite configuration
│   └── ...
├── extension/             # Chrome extension
│   ├── manifest.json      # Extension configuration
│   ├── background.js      # Background service worker
│   ├── content.js         # Content script (floating pill)
│   ├── styles/            # CSS for floating pill
│   └── ...
└── requirements.txt       # Project brief and specifications
```

## Getting Started

### Landing Page (Remix App)
```bash
cd landing-page
npm install
npm run dev
```

### Chrome Extension
```bash
cd extension
# Load the extension folder in Chrome Developer Mode
```

## Features

- **Floating Liquid Glass Pill**: Beautiful floating UI on web pages
- **AI-Powered Content Analysis**: Extracts entities and claims from articles
- **Cross-Page Comparison**: Compare insights across multiple pages
- **Chrome AI Integration**: Uses Chrome's built-in AI capabilities

## Development

Both projects are completely independent and can be developed separately:

- **Landing Page**: Use `npx shadcn` and other React tools without conflicts
- **Extension**: Pure HTML/CSS/JS with Chrome APIs

## License

MIT