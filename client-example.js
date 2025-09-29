// Sound by Sound Slowly API Client Example
// This shows how to use the API service from your frontend application

const API_BASE_URL = 'https://api.soundbysoundslowly.com/v1';

class SoundBySoundAPI {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.baseURL = API_BASE_URL;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
  }

  // Get available models
  async getModels() {
    return this.makeRequest('/models');
  }

  // Chat completion for speech learning
  async chatCompletion(messages, options = {}) {
    const defaultOptions = {
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.7,
      ...options
    };

    return this.makeRequest('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        ...defaultOptions
      })
    });
  }

  // Text completion (legacy format)
  async textCompletion(prompt, options = {}) {
    const defaultOptions = {
      model: 'gpt-4o-mini',
      max_tokens: 200,
      temperature: 0.7,
      ...options
    };

    return this.makeRequest('/completions', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        ...defaultOptions
      })
    });
  }

  // Speech learning specific methods
  async getPronunciationHelp(word) {
    const messages = [
      {
        role: 'system',
        content: 'You are a speech therapist helping hearing-impaired users with pronunciation. Provide clear, step-by-step guidance with phonetic breakdowns.'
      },
      {
        role: 'user',
        content: `Help me pronounce the word "${word}". Break it down phonetically and give me tips for proper articulation.`
      }
    ];

    return this.chatCompletion(messages);
  }

  async getSpeechExercise(difficulty = 'beginner') {
    const messages = [
      {
        role: 'system',
        content: 'You are a speech therapist creating exercises for hearing-impaired users. Create engaging, progressive exercises.'
      },
      {
        role: 'user',
        content: `Create a ${difficulty} level speech exercise focusing on pronunciation practice. Include specific words to practice and tips for improvement.`
      }
    ];

    return this.chatCompletion(messages, { max_tokens: 300 });
  }

  async analyzeSpeechProgress(previousAttempts, currentAttempt) {
    const messages = [
      {
        role: 'system',
        content: 'You are a speech therapist analyzing progress. Provide encouraging feedback and specific improvement suggestions.'
      },
      {
        role: 'user',
        content: `Analyze my speech progress. Previous attempts: ${previousAttempts}. Current attempt: ${currentAttempt}. Give me feedback and next steps.`
      }
    ];

    return this.chatCompletion(messages);
  }

  // Health check
  async healthCheck() {
    const response = await fetch(`${this.baseURL.replace('/v1', '')}/health`);
    return response.json();
  }
}

// Usage examples
async function examples() {
  const api = new SoundBySoundAPI(); // No API key needed if REQUIRE_API_KEY=false

  try {
    // Health check
    console.log('🏥 Health check:', await api.healthCheck());

    // Get available models
    console.log('🤖 Available models:', await api.getModels());

    // Get pronunciation help
    console.log('🗣️ Pronunciation help:', await api.getPronunciationHelp('pronunciation'));

    // Get speech exercise
    console.log('💪 Speech exercise:', await api.getSpeechExercise('intermediate'));

    // Analyze progress
    console.log('📊 Progress analysis:', await api.analyzeSpeechProgress(
      'Previous attempts were unclear',
      'Current attempt is much clearer'
    ));

    // Custom chat completion
    console.log('💬 Custom chat:', await api.chatCompletion([
      {
        role: 'user',
        content: 'Help me practice the "th" sound in words like "think" and "this".'
      }
    ]));

  } catch (error) {
    console.error('❌ API Error:', error.message);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoundBySoundAPI;
}

// Run examples if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  examples();
}
