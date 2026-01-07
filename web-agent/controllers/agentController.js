const { callOllama } = require('../config/ollama');
const { generatePrompt } = require('../utils/promptTemplates');

async function askAgent(req, res) {
  try {
    const { query, pages } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query required' });
    }

    if (!pages || pages.length === 0) {
      return res.status(400).json({ error: 'pages required - run /api/scrape first' });
    }

    console.log(`🤖 Processing query: "${query}"`);

    // Extract relevant content from pages
    const content = pages.map(p => ({
      url: p.url,
      title: p.title,
      links: p.structure?.links || [],
      headings: p.structure?.headings || [],
      buttons: p.structure?.buttons || [],
      forms: p.structure?.forms || []
    }));

    // Build prompt for Ollama
    const prompt = generatePrompt(query, content);

    // Call Ollama local AI
    const responseText = await callOllama(prompt);

    // Parse response
    const steps = parseSteps(responseText);

    res.json({
      success: true,
      query,
      response: responseText,
      steps,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Agent error:', error.message);
    
    // Better error messages
    let errorMsg = 'Agent processing failed';
    if (error.message.includes('not running')) {
      errorMsg = 'Ollama AI is not running. Please start it first: https://ollama.ai';
    } else if (error.message.includes('timeout')) {
      errorMsg = 'Request timeout. Try a simpler question.';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMsg = 'Cannot connect to Ollama. Make sure it\'s running on localhost:11434';
    }
    
    res.status(500).json({ 
      error: errorMsg,
      details: error.message 
    });
  }
}

function parseSteps(text) {
  const lines = text.split('\n');
  const steps = [];
  let currentStep = null;

  for (const line of lines) {
    if (line.match(/step\s*\d+/i) || line.match(/^\d+\./)) {
      if (currentStep) steps.push(currentStep);
      currentStep = { text: line.trim() };
    } else if (line.trim() && currentStep) {
      currentStep.text += ' ' + line.trim();
    }
  }

  if (currentStep) steps.push(currentStep);

  return steps.map((s, i) => ({
    step: i + 1,
    action: s.text,
    url: 'See explanation above'
  })).slice(0, 10);
}

module.exports = { askAgent };
