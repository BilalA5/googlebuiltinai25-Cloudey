// Ollama API Client for Cloudey Extension
// Handles communication with local Ollama server

class OllamaClient {
  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.model = 'llama3.2:3b';
    this.isAvailable = false;
    this.checkAvailability();
  }

  async checkAvailability() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        this.isAvailable = true;
        console.log('Ollama server is available');
        return true;
      }
    } catch (error) {
      console.log('Ollama server not available:', error.message);
      this.isAvailable = false;
    }
    return false;
  }

  async generateResponse(message, conversationHistory = []) {
    if (!this.isAvailable) {
      const available = await this.checkAvailability();
      if (!available) {
        throw new Error('Ollama server is not running. Please start Ollama with: brew services start ollama');
      }
    }

    try {
      // Prepare conversation context
      const messages = [
        {
          role: 'system',
          content: 'You are Cloudey, a helpful AI assistant. Be concise, friendly, and helpful. Answer questions directly and completely.'
        },
        ...conversationHistory.slice(-6), // Keep last 6 messages for context
        {
          role: 'user',
          content: message
        }
      ];

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.message.content;

    } catch (error) {
      console.error('Ollama API error:', error);
      throw error;
    }
  }

  async generateStreamingResponse(message, conversationHistory = [], onChunk) {
    if (!this.isAvailable) {
      const available = await this.checkAvailability();
      if (!available) {
        throw new Error('Ollama server is not running. Please start Ollama with: brew services start ollama');
      }
    }

    try {
      // Prepare conversation context
      const messages = [
        {
          role: 'system',
          content: 'You are Cloudey, a helpful AI assistant. Be concise, friendly, and helpful. Answer questions directly and completely.'
        },
        ...conversationHistory.slice(-6), // Keep last 6 messages for context
        {
          role: 'user',
          content: message
        }
      ];

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          stream: true,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.message && data.message.content) {
                  fullResponse += data.message.content;
                  if (onChunk) {
                    onChunk(data.message.content);
                  }
                }
                if (data.done) {
                  break;
                }
              } catch (parseError) {
                // Skip malformed JSON lines
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return fullResponse;

    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw error;
    }
  }
}

// Export for use in other files
export { OllamaClient };
