// enhanced background script with AI integration
console.log('Cloudey background script loaded');

// store conversation history per tab
const conversationHistory = new Map();

// Google AI Studio configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent';
const GEMINI_API_KEY = atob('QUl6YVN5Q0c2czRYaC1VcVI2VEUyY3E0ZFVxUEFRODk4VGhOQlNv');

// AI-powered message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  try {
    switch (request.action) {
      case 'chat':
        handleChatRequest(request, sender, sendResponse);
        break;
        
      case 'getChatHistory':
        const tabId = sender.tab?.id || 'default';
        sendResponse({ history: conversationHistory.get(tabId) || [] });
        break;
        
      case 'clearChatHistory':
        const clearTabId = sender.tab?.id || 'default';
        conversationHistory.delete(clearTabId);
        sendResponse({ success: true });
        break;
      
      case 'openSidePanel':
        // Open side panel for the current tab
        chrome.sidePanel.open({ tabId: sender.tab.id });
        sendResponse({ success: true });
        break;
      
      case 'summarizePage':
        handleSummarizePage(request, sender, sendResponse);
        break;
      
      case 'improveText':
        handleImproveText(request, sender, sendResponse);
        break;
      
      case 'rewriteText':
        handleRewriteText(request, sender, sendResponse);
        break;
      
      case 'translateText':
        handleTranslateText(request, sender, sendResponse);
        break;
        
      case 'translate':
        handleChromeTranslate(request, sender, sendResponse);
        return true;
      
      case 'geminiChat':
        handleGeminiChat(request, sender, sendResponse);
        break;
      
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Background script error:', error);
    sendResponse({ 
      success: false, 
      response: 'Sorry, I encountered an error. Please try again.' 
    });
  }
  
  return true; // Keep message channel open
});

// handle chat requests with AI
async function handleChatRequest(request, sender, sendResponse) {
  const { message, includeContext } = request;
  const tabId = sender.tab?.id || 'default';
  
  console.log('Processing chat request:', { message, includeContext, tabId });
  
  try {
    // get conversation history for this tab
    const history = conversationHistory.get(tabId) || [];
    
    // get page context if needed
    let pageContext = null;
    if (includeContext) {
      pageContext = await getPageContext(sender.tab);
    }
    
    // add user message to history
    history.push({ role: 'user', content: message, timestamp: Date.now() });
    
    // generate AI response with conversation context
    const aiResponse = await generateAIResponse(message, pageContext, history);
    
    // add AI response to history
    if (aiResponse.success) {
      history.push({ role: 'assistant', content: aiResponse.response, timestamp: Date.now() });
      conversationHistory.set(tabId, history);
    }
    
    console.log('AI response generated:', aiResponse);
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Chat processing error:', error);
    sendResponse({
      success: false,
      response: 'Sorry, I encountered an error processing your request.'
    });
  }
}

// get page context from the current tab
async function getPageContext(tab) {
  try {
    if (!tab || !tab.id) {
      console.log('No valid tab provided for page context');
      return null;
    }
    
    console.log('Getting page context for tab:', tab.id, tab.url);
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        console.log('Content extraction script running on:', window.location.href);
        // UNIVERSAL CONTENT EXTRACTION - Get ALL page content including raw HTML
        const extractAllContent = () => {
          const content = {
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            timestamp: new Date().toISOString(),
            // Get raw HTML for deep analysis
            rawHTML: document.documentElement.outerHTML.substring(0, 50000), // First 50KB of HTML
            // Extract all text content
            fullText: document.body.innerText || document.body.textContent || '',
            // Extract all headings
            headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
              level: h.tagName,
              text: h.textContent?.trim(),
              id: h.id
            })).filter(h => h.text),
            // Extract all links
            links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
              text: a.textContent?.trim(),
              href: a.href,
              title: a.title
            })).filter(l => l.text && l.href),
            // Extract all images
            images: Array.from(document.querySelectorAll('img')).map(img => ({
              src: img.src,
              alt: img.alt,
              title: img.title
            })).filter(i => i.src),
            // Extract all videos with detailed info
            videos: Array.from(document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]')).map(v => ({
              src: v.src || v.getAttribute('src'),
              title: v.title || v.getAttribute('title'),
              type: v.tagName
            })).filter(v => v.src),
            // YouTube specific extraction
            youtubeData: (() => {
              if (!window.location.hostname.includes('youtube.com')) return null;
              
              // Try multiple selectors for YouTube data
              const videoTitle = document.querySelector('h1.title yt-formatted-string')?.textContent || 
                               document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent ||
                               document.querySelector('#title h1')?.textContent || '';
              
              const channelName = document.querySelector('#owner-name a')?.textContent || 
                                document.querySelector('#channel-name a')?.textContent ||
                                document.querySelector('#owner-text a')?.textContent || '';
              
              const subscriberCount = document.querySelector('#owner-sub-count')?.textContent || '';
              const videoViews = document.querySelector('#count .view-count')?.textContent || 
                               document.querySelector('#count')?.textContent || '';
              const videoLikes = document.querySelector('#top-level-buttons-computed #segmented-like-button button')?.getAttribute('aria-label') || 
                               document.querySelector('#segmented-like-button button')?.getAttribute('aria-label') || '';
              const videoDuration = document.querySelector('.ytp-time-duration')?.textContent || '';
              const videoUploadDate = document.querySelector('#info-strings yt-formatted-string')?.textContent || '';
              const videoDescription = document.querySelector('#description-text')?.textContent || 
                                    document.querySelector('#description')?.textContent || '';
              
              // Get all video elements on the page (recommendations, etc.)
              const allVideos = Array.from(document.querySelectorAll('ytd-video-renderer, ytd-compact-video-renderer')).map(video => {
                const title = video.querySelector('#video-title')?.textContent?.trim() || '';
                const channel = video.querySelector('#channel-name')?.textContent?.trim() || '';
                const views = video.querySelector('#metadata-line span')?.textContent?.trim() || '';
                const uploadTime = video.querySelector('#metadata-line span:last-child')?.textContent?.trim() || '';
                const duration = video.querySelector('.ytd-thumbnail-overlay-time-status-renderer')?.textContent?.trim() || '';
                const link = video.querySelector('#video-title')?.href || '';
                
                return { title, channel, views, uploadTime, duration, link };
              }).filter(v => v.title);
              
              // Get channel uploads if on channel page
              const channelVideos = Array.from(document.querySelectorAll('ytd-grid-video-renderer')).map(video => {
                const title = video.querySelector('#video-title')?.textContent?.trim() || '';
                const views = video.querySelector('#metadata-line span')?.textContent?.trim() || '';
                const uploadTime = video.querySelector('#metadata-line span:last-child')?.textContent?.trim() || '';
                const duration = video.querySelector('.ytd-thumbnail-overlay-time-status-renderer')?.textContent?.trim() || '';
                const link = video.querySelector('#video-title')?.href || '';
                
                return { title, views, uploadTime, duration, link };
              }).filter(v => v.title);
              
              return {
                currentVideo: {
                  title: videoTitle,
                  channel: channelName,
                  subscribers: subscriberCount,
                  views: videoViews,
                  likes: videoLikes,
                  duration: videoDuration,
                  uploadDate: videoUploadDate,
                  description: videoDescription.substring(0, 1000)
                },
                recommendedVideos: allVideos.slice(0, 20),
                channelVideos: channelVideos.slice(0, 50)
              };
            })(),
            // Extract meta information
            meta: {
              description: document.querySelector('meta[name="description"]')?.content || '',
              keywords: document.querySelector('meta[name="keywords"]')?.content || '',
              author: document.querySelector('meta[name="author"]')?.content || '',
              ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
              ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
              ogImage: document.querySelector('meta[property="og:image"]')?.content || ''
            },
            // Extract structured data (JSON-LD)
            structuredData: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => {
              try { return JSON.parse(s.textContent); } catch { return null; }
            }).filter(d => d),
            // Extract forms
            forms: Array.from(document.querySelectorAll('form')).map(f => ({
              action: f.action,
              method: f.method,
              inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
                type: i.type || i.tagName,
                name: i.name,
                placeholder: i.placeholder,
                value: i.value
              }))
            })),
            // Extract tables
            tables: Array.from(document.querySelectorAll('table')).map(t => ({
              headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent?.trim()),
              rows: Array.from(t.querySelectorAll('tr')).map(tr => 
                Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim())
              )
            }))
          };
          
          return content;
        };
        
        const pageData = extractAllContent();
        
        // Format content for AI consumption
        let formattedContent = `🌐 UNIVERSAL PAGE CONTENT EXTRACTION
Title: ${pageData.title}
URL: ${pageData.url}
Domain: ${pageData.domain}
Timestamp: ${pageData.timestamp}

📝 MAIN CONTENT:
${pageData.fullText.substring(0, 3000)}

📋 STRUCTURE:
${pageData.headings.map(h => `${h.level}: ${h.text}`).join('\n')}

🔗 LINKS (${pageData.links.length}):
${pageData.links.slice(0, 20).map(l => `• ${l.text} → ${l.href}`).join('\n')}

🖼️ IMAGES (${pageData.images.length}):
${pageData.images.slice(0, 10).map(i => `• ${i.alt || 'No alt text'} (${i.src})`).join('\n')}

🎥 VIDEOS (${pageData.videos.length}):
${pageData.videos.map(v => `• ${v.title || 'Untitled'} (${v.src})`).join('\n')}`;

        // Add YouTube specific data if available
        if (pageData.youtubeData) {
          formattedContent += `\n\n🎥 YOUTUBE DETAILED DATA:
Current Video:
• Title: ${pageData.youtubeData.currentVideo.title}
• Channel: ${pageData.youtubeData.currentVideo.channel}
• Subscribers: ${pageData.youtubeData.currentVideo.subscribers}
• Views: ${pageData.youtubeData.currentVideo.views}
• Likes: ${pageData.youtubeData.currentVideo.likes}
• Duration: ${pageData.youtubeData.currentVideo.duration}
• Upload Date: ${pageData.youtubeData.currentVideo.uploadDate}
• Description: ${pageData.youtubeData.currentVideo.description}

Recommended Videos (${pageData.youtubeData.recommendedVideos.length}):
${pageData.youtubeData.recommendedVideos.map(v => `• ${v.title} | ${v.channel} | ${v.views} | ${v.uploadTime}`).join('\n')}

Channel Videos (${pageData.youtubeData.channelVideos.length}):
${pageData.youtubeData.channelVideos.map(v => `• ${v.title} | ${v.views} | ${v.uploadTime}`).join('\n')}`;
        }

        formattedContent += `\n\n📊 META DATA:
Description: ${pageData.meta.description}
Keywords: ${pageData.meta.keywords}
Author: ${pageData.meta.author}
OG Title: ${pageData.meta.ogTitle}
OG Description: ${pageData.meta.ogDescription}

📋 TABLES (${pageData.tables.length}):
${pageData.tables.slice(0, 3).map((t, i) => `Table ${i+1}:\n${t.rows.map(r => r.join(' | ')).join('\n')}`).join('\n\n')}

🔍 RAW HTML (First 10KB):
${pageData.rawHTML.substring(0, 10000)}`;

        const result = {
          title: pageData.title,
          url: pageData.url,
          content: formattedContent.substring(0, 12000) // Increased limit for comprehensive content
        };
        
        console.log('Content extraction completed:', {
          title: result.title,
          url: result.url,
          contentLength: result.content.length,
          fullTextLength: pageData.fullText.length
        });
        
        return result;
      }
    });
    
    const pageContext = results[0]?.result || null;
    console.log('Page context extraction result:', pageContext ? 'Success' : 'Failed');
    if (pageContext) {
      console.log('Extracted content length:', pageContext.content?.length || 0);
    }
    
    return pageContext;
  } catch (error) {
    console.error('Failed to get page context:', error);
    return null;
  }
}

// Chrome Translator API handler using self.Translator
async function handleChromeTranslate(request, sender, sendResponse) {
  const { text, from = 'auto', to = 'en' } = request;
  
  console.log('Chrome Translate API called with:', { text: text.substring(0, 50) + '...', from, to });
  
  try {
    // Check if Translator API is supported
    if (!('Translator' in self)) {
      console.error('Translator API not available in service worker');
      throw new Error('Chrome Translator API not supported in this browser. Please ensure you have Chrome 138+ with the Translator API enabled.');
    }
    
    console.log('Translator API is available');
    
    // Detect language if auto is specified
    let sourceLanguage = from;
    if (from === 'auto') {
      try {
        console.log('🔍 DETECTING LANGUAGE FOR TEXT:', text.substring(0, 100) + '...');
        console.log('🔍 Full text length:', text.length);
        
        // Check what APIs are available
        console.log('🔍 API Availability Check:');
        console.log('  - LanguageDetector in self:', 'LanguageDetector' in self);
        console.log('  - chrome.i18n available:', typeof chrome.i18n !== 'undefined');
        
        // Use Chrome's Language Detector API
        if ('LanguageDetector' in self) {
          console.log('✅ Using LanguageDetector API');
          try {
            // Check availability first
            const availability = await LanguageDetector.availability({
              expectedInputLanguages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-PT', 'ru-RU', 'zh-CN', 'ja-JP', 'ko-KR', 'ar-SA']
            });
            console.log('✅ LanguageDetector availability:', availability);
            
            if (availability === 'unavailable') {
              throw new Error('LanguageDetector not available');
            }
            
            const detector = await LanguageDetector.create({
              expectedInputLanguages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-PT', 'ru-RU', 'zh-CN', 'ja-JP', 'ko-KR', 'ar-SA'],
              monitor: (monitor) => {
                monitor.addEventListener('downloadprogress', (e) => {
                  console.log(`📥 LanguageDetector download progress: ${e.loaded * 100}%`);
                });
              }
            });
            console.log('✅ LanguageDetector created successfully');
            
            const results = await detector.detect(text);
            console.log('✅ LanguageDetector results:', results);
            
            if (results && results.length > 0) {
              sourceLanguage = results[0].detectedLanguage;
              console.log('✅ Detected language code:', sourceLanguage);
            } else {
              throw new Error('No language detected');
            }
          } catch (detectorError) {
            console.error('❌ LanguageDetector failed:', detectorError);
            throw detectorError;
          }
        } else {
          console.log('⚠️ LanguageDetector not available, using i18n fallback');
          // Fallback to i18n detection
          try {
            const detectedLanguages = await chrome.i18n.detectLanguage(text);
            console.log('✅ i18n detection result:', detectedLanguages);
            if (detectedLanguages && detectedLanguages.languages && detectedLanguages.languages.length > 0) {
              sourceLanguage = detectedLanguages.languages[0].language;
              console.log('✅ i18n detected language:', sourceLanguage);
            } else {
              console.warn('⚠️ i18n returned no languages, using fallback');
              sourceLanguage = 'en'; // fallback
            }
          } catch (i18nError) {
            console.error('❌ i18n detection failed:', i18nError);
            sourceLanguage = 'en';
          }
        }
        
        console.log('🎯 FINAL DETECTED SOURCE LANGUAGE:', sourceLanguage);
      } catch (detectError) {
        console.error('❌ Language detection completely failed:', detectError);
        sourceLanguage = 'en';
      }
    }
    
    // Check if source and target are the same
    if (sourceLanguage === to) {
      sendResponse({
        success: true,
        result: text,
        detectedLanguage: sourceLanguage,
        from: sourceLanguage,
        to: to,
        method: 'chrome_translator_api'
      });
      return;
    }
    
    // Check language pair availability
    console.log('Checking language pair availability:', { sourceLanguage, targetLanguage: to });
    const translatorCapabilities = await Translator.availability({
      sourceLanguage: sourceLanguage,
      targetLanguage: to,
    });
    
    console.log('Translator capabilities:', translatorCapabilities);
    
    if (translatorCapabilities !== 'available') {
      throw new Error(`Translation from ${sourceLanguage} to ${to} is not available (status: ${translatorCapabilities})`);
    }
    
    // Create translator with download monitoring
    console.log('Creating translator...');
    const translator = await Translator.create({
      sourceLanguage: sourceLanguage,
      targetLanguage: to,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Model download progress: ${e.loaded * 100}%`);
        });
      },
    });
    
    console.log('Translator created successfully');
    
    // Translate the text (use streaming for longer texts)
    let translatedText;
    console.log('🔄 STARTING TRANSLATION PROCESS...');
    console.log('🔄 Text to translate:', text.substring(0, 100) + '...');
    console.log('🔄 From:', sourceLanguage, 'To:', to);
    
    if (text.length > 1000) {
      console.log('📡 Using streaming translation for long text');
      // Use streaming for longer texts
      const stream = translator.translateStreaming(text);
      const chunks = [];
      for await (const chunk of stream) {
        console.log('📡 Received chunk:', chunk);
        chunks.push(chunk);
      }
      translatedText = chunks.join('');
      console.log('📡 Streaming completed, total chunks:', chunks.length);
    } else {
      console.log('⚡ Using regular translation for short text');
      // Use regular translate for shorter texts
      translatedText = await translator.translate(text);
      console.log('⚡ Regular translation completed');
    }
    
    console.log('✅ TRANSLATION RESULT:');
    console.log('  Original:', text.substring(0, 100) + '...');
    console.log('  Translated:', translatedText.substring(0, 100) + '...');
    console.log('  Same text?', text === translatedText);
    
    sendResponse({
      success: true,
      result: translatedText,
      detectedLanguage: sourceLanguage,
      from: sourceLanguage,
      to: to,
      method: 'chrome_translator_api'
    });
    
  } catch (error) {
    console.error('Chrome Translator API error:', error);
    
    // Fallback: Try to provide a helpful error message
    let errorMessage = error.message;
    if (error.message.includes('not supported')) {
      errorMessage = 'Chrome Translator API not available. Please ensure you have Chrome 138+ with the Translator API enabled in chrome://flags/';
    } else if (error.message.includes('not available')) {
      errorMessage = `Translation from ${sourceLanguage} to ${to} is not available. Try a different language pair.`;
    }
    
    sendResponse({
      success: false,
      error: errorMessage,
      details: {
        sourceLanguage,
        targetLanguage: to,
        originalError: error.message
      }
    });
  }
}

// generate AI response using Gemini Nano
async function generateAIResponse(message, pageContext, history = []) {
  try {
    // Note: navigator.languageModel is NOT available in service worker context
    // The Prompt API only works in window contexts (sidebar, popup, etc.)
    // All AI calls should be made directly from the sidebar.
    
    console.log('Background script: Prompt API not available in service worker context');
    console.log('This is expected - the sidebar handles all AI calls directly.');
    
    // Return a helpful message explaining the situation
    return {
      success: false,
      response: generateFallbackResponse(message, pageContext, history)
    };
    
  } catch (error) {
    console.error('AI generation error:', error);
    console.error('Error details:', error.message, error.stack);
    return {
      success: false,
      response: generateFallbackResponse(message, pageContext, history)
    };
  }
}

// generate fallback response when AI is not available
function generateFallbackResponse(message, pageContext, history = []) {
  console.log('AI not available, using minimal fallback');
  
  // provide helpful fallback when Gemini Nano is unavailable
  const instructions = `
To enable Cloudey with Gemini Nano:

1. Go to chrome://flags/
2. Search for and enable:
   - "Prompt API for Gemini Nano" → Set to "Enabled"
   - "optimization-guide-on-device-model" → Set to "Enabled (BypassPerfRequirement)"
3. Click "Relaunch" and wait for Chrome to restart

After restarting, Cloudey will be able to use on-device AI capabilities.

Note: The Prompt API only works in Chrome 127+ with the required flags enabled.
`;
  
  if (pageContext) {
    return `I can see you're on "${pageContext.title}". ${instructions}`;
  } else {
    return `Hello! I'm Cloudey, your AI assistant. ${instructions}`;
  }
}

// ===== API ACTION HANDLERS =====

// Summarize page handler
async function handleSummarizePage(request, sender, sendResponse) {
  const { tabId } = request;
  console.log('Handling summarize page request:', tabId);
  
  try {
    // Get page context
    const tab = sender.tab || (await chrome.tabs.get(tabId));
    const pageContext = await getPageContext(tab);
    
    if (!pageContext) {
      sendResponse({
        success: false,
        response: 'Unable to access page content.'
      });
      return;
    }
    
    // Use Gemini Nano Prompt API for summarization
    const prompt = `Please provide a concise summary of this webpage:\n\nTitle: ${pageContext.title}\nContent: ${pageContext.content.substring(0, 3000)}`;
    const aiResponse = await generateAIResponse(prompt, null, []);
    
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Summarize page error:', error);
    sendResponse({
      success: false,
      response: 'Failed to summarize page. Please try again.'
    });
  }
}

// Improve text handler
async function handleImproveText(request, sender, sendResponse) {
  const { text } = request;
  console.log('Handling improve text request');
  
  try {
    // Use Gemini Nano Prompt API for text improvement
    const prompt = `Please improve this text to make it clearer and more professional:\n\n"${text}"`;
    const aiResponse = await generateAIResponse(prompt, null, []);
    
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Improve text error:', error);
    sendResponse({
      success: false,
      response: 'Failed to improve text. Please try again.'
    });
  }
}

// Rewrite text handler
async function handleRewriteText(request, sender, sendResponse) {
  const { text } = request;
  console.log('Handling rewrite text request');
  
  try {
    // Use Gemini Nano Prompt API for rewriting
    const prompt = `Please provide an alternative way to phrase this text:\n\n"${text}"`;
    const aiResponse = await generateAIResponse(prompt, null, []);
    
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Rewrite text error:', error);
    sendResponse({
      success: false,
      response: 'Failed to rewrite text. Please try again.'
    });
  }
}

// Translate text handler
async function handleTranslateText(request, sender, sendResponse) {
  const { text } = request;
  console.log('Handling translate text request');
  
  try {
    // Use Gemini Nano Prompt API for translation
    const prompt = `Please translate this text to English (or if it's already in English, translate to Spanish):\n\n"${text}"`;
    const aiResponse = await generateAIResponse(prompt, null, []);
    
    sendResponse(aiResponse);
    
  } catch (error) {
    console.error('Translate text error:', error);
    sendResponse({
      success: false,
      response: 'Failed to translate text. Please try again.'
    });
  }
}

// Gemini chat handler
async function handleGeminiChat(request, sender, sendResponse) {
  const { message, history = [], includeContext = false, searchMode = false, agentMode = false, isContextMode = false } = request;
  
  try {
    // Use the built-in API key
    const apiKey = GEMINI_API_KEY;

    // Get page context if context mode is active
    let pageContext = null;
    if (isContextMode) {
      // Try to get the current active tab if sender.tab is not available
      let targetTab = sender.tab;
      if (!targetTab) {
        console.log('No sender tab, getting current active tab');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        targetTab = tabs[0];
      }
      
      if (targetTab) {
        console.log('Getting page context for tab:', targetTab.id, targetTab.url);
        pageContext = await getPageContext(targetTab);
        console.log('Page context retrieved:', pageContext ? 'Success' : 'Failed');
        if (pageContext) {
          console.log('Page title:', pageContext.title);
          console.log('Page URL:', pageContext.url);
          console.log('Content length:', pageContext.content?.length || 0);
        }
      } else {
        console.log('No active tab found for page context');
      }
    } else {
      console.log('Page context not requested');
    }

    // Prepare conversation context for Gemini
    const conversationContext = history.slice(-6).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Build context-aware prompt
    let contextPrompt = `You are Cloudey, a helpful AI assistant. Keep responses BRIEF and use emojis + structured lists.`;
    
    if (searchMode) {
      contextPrompt += `\n\n🔍 SEARCH MODE: Research current info. Be concise.`;
    } else if (agentMode) {
      contextPrompt += `\n\n🤖 AGENT MODE: Screen control available. Be brief.`;
    } else if (isContextMode) {
      contextPrompt += `\n\n📄 CONTEXT MODE: You can see the page. Use it.`;
    }
    
    if (pageContext) {
      console.log('Including page context in prompt');
      contextPrompt += `\n\n📄 PAGE CONTEXT:
Title: ${pageContext.title}
URL: ${pageContext.url}
Content: ${pageContext.content.substring(0, 2000)}`;
    }
    
    if (conversationContext.length > 0) {
      contextPrompt += `\n\n💬 HISTORY:\n${conversationContext.map(c => `${c.role}: ${c.parts[0].text}`).join('\n')}`;
    }
    
    contextPrompt += `\n\n👤 USER: ${message}

📝 RESPONSE RULES:
- MAX 3-4 sentences
- Use emojis 🎯 📝 🔗 💡
- Use bullet points • or numbered lists
- Be direct and helpful
- Reference page content when relevant
- FORMAT: Use line breaks between bullet points
- STRUCTURE: Each bullet point on its own line
- NO: Long paragraphs with bullets inline
- YES: Proper line breaks for readability`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: contextPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      sendResponse({
        success: true,
        response: aiResponse
      });
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
    
  } catch (error) {
    sendResponse({
      success: false,
      response: `Error: ${error.message}. Please check your internet connection.`
    });
  }
}


console.log('Cloudey background script ready');
