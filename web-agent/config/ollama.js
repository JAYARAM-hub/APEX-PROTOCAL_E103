const axios = require('axios');

// Ollama local API setup (runs on your computer)
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'mistral';  // Fast and good quality

async function callOllama(prompt) {
  try {
    console.log('🔄 Calling Ollama local AI (this may take 30-60 seconds first time)...');
    
    const response = await axios.post(
      OLLAMA_API_URL,
      {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        temperature: 0.7,
      },
      {
        timeout: 120000,  // Increased from 60s to 120s (2 minutes)
      }
    );

    if (response.data && response.data.response) {
      return response.data.response;
    }

    return JSON.stringify(response.data);
  } catch (error) {
    console.error('Ollama API Error:', error.message);
    
    // Helpful error message
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Ollama is not running. Please start Ollama first: https://ollama.ai');
    }
    
    if (error.message.includes('timeout')) {
      throw new Error('Ollama timeout - model is processing. Try again, it gets faster after first request');
    }
    
    throw error;
  }
}

module.exports = { callOllama, OLLAMA_MODEL };
