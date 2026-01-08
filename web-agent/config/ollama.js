const axios = require('axios');

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'mistral';

const SPEED_CONFIG = {
  timeout: 90000,
  temperature: 0.5,
  num_predict: 200,
  num_ctx: 4096,
  top_k: 50,
  top_p: 0.95,
};

// Health check
async function checkOllamaHealth() {
  try {
    const response = await axios.get('http://localhost:11434/api/tags', {
      timeout: 5000
    });
    console.log('✅ Ollama is healthy');
    return true;
  } catch (error) {
    console.error('❌ Ollama health check failed:', error.message);
    return false;
  }
}

// Retry logic with exponential backoff
async function callOllamaWithRetry(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Calling Ollama (attempt ${attempt}/${retries})...`);
      const startTime = Date.now();

      const response = await axios.post(
        OLLAMA_API_URL,
        {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          temperature: SPEED_CONFIG.temperature,
          num_predict: SPEED_CONFIG.num_predict,
          num_ctx: SPEED_CONFIG.num_ctx,
          top_k: SPEED_CONFIG.top_k,
          top_p: SPEED_CONFIG.top_p,
        },
        {
          timeout: SPEED_CONFIG.timeout,
        }
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Response received in ${(duration / 1000).toFixed(1)}s`);

      if (response.data && response.data.response) {
        return response.data.response.trim();
      }

      return JSON.stringify(response.data);

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      // Check error type
      if (error.response?.status === 500) {
        console.warn('⚠️ Ollama server error (500) - possible overload or crash');
        
        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('❌ OLLAMA NOT RUNNING!\n\nStart Ollama:\nterminal 1: ollama serve\n\nThen restart your app.');
      }

      if (error.message.includes('timeout')) {
        console.warn('⚠️ Ollama timeout - check system resources');
        
        if (attempt < retries) {
          console.log('⏳ Waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        throw new Error('⚠️ OLLAMA TIMEOUT\n\nTry:\n1. Close other apps\n2. Reduce prompt size\n3. Restart Ollama');
      }

      if (error.message.includes('EADDRINUSE')) {
        throw new Error('❌ PORT ALREADY IN USE\n\nOllama may be running twice.\nKill it: lsof -i :11434 then kill -9 <PID>');
      }

      // Generic error - try again
      if (attempt < retries) {
        const waitTime = 2000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw error;
    }
  }
}

async function callOllama(prompt) {
  try {
    // Check health first
    const isHealthy = await checkOllamaHealth();
    
    if (!isHealthy) {
      throw new Error('Ollama server is not responding. Make sure:\n1. Run: ollama serve\n2. Wait for it to load\n3. Try again');
    }

    // Call with retry logic
    return await callOllamaWithRetry(prompt, 3);

  } catch (error) {
    console.error('❌ Ollama Error:', error.message);
    throw error;
  }
}

module.exports = { callOllama, OLLAMA_MODEL, checkOllamaHealth };