const API_URL = 'http://localhost:5000';

// States
let currentStep = 'intent'; // 'intent' → 'website' → 'processing'
let userIntent = '';
let currentSitemap = null;

// DOM Elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const status = document.getElementById('status');
const responseBox = document.getElementById('response-box');
const stepsContainer = document.getElementById('steps-container');

// Event Listeners
sendBtn.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleUserInput();
});

function handleUserInput() {
  const input = userInput.value.trim();
  
  if (!input) {
    showStatus('Please enter something', 'error');
    return;
  }

  addChatMessage('user', input);
  userInput.value = '';
  sendBtn.disabled = true;

  if (currentStep === 'intent') {
    handleIntent(input);
  } else if (currentStep === 'website') {
    handleWebsite(input);
  }

  sendBtn.disabled = false;
}

function handleIntent(intent) {
  userIntent = intent;
  currentStep = 'website';
  
  addChatMessage('bot', `Got it! You want to: "${intent}"`);
  addChatMessage('bot', 'Now, which website do you want to use? (e.g., amazon.com, github.com, wikipedia.org)');
}

async function handleWebsite(websiteUrl) {
  if (!websiteUrl) {
    showStatus('Please enter a website URL', 'error');
    return;
  }

  // Normalize URL - add https:// and .com if needed
  let url = websiteUrl.trim().toLowerCase();
  
  // If it doesn't have http/https, add it
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // If it doesn't have a dot, assume it's a domain and add .com
    if (!url.includes('.')) {
      url = `https://${url}.com`;
    } else {
      url = `https://${url}`;
    }
  }

  addChatMessage('bot', `Scanning ${url}...`);
  showStatus('🕷️ Scanning website...', 'loading');

  try {
    const response = await fetch(`${API_URL}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website_url: url })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || 'Scanning failed');
    }

    currentSitemap = data.pages;

    addChatMessage('bot', `✅ Website scanned! Found ${data.links_count} links and ${data.headings_count} sections.`);
    addChatMessage('bot', `Now let me figure out how to "${userIntent}" on this website...`);

    // Ask agent for guidance
    await askAgent(userIntent, data.pages);

  } catch (error) {
    console.error('Scraping error:', error);
    addChatMessage('bot', `❌ Error scanning ${url}: ${error.message}`);
    addChatMessage('bot', 'Try a different website. Popular ones: amazon.com, github.com, wikipedia.org');
    showStatus(`Error: ${error.message}`, 'error');
    currentStep = 'website'; // Let them try again
  }
}

async function askAgent(query, pages) {
  showStatus('🤖 Generating guide...', 'loading');

  try {
    const response = await fetch(`${API_URL}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || 'Request failed');
    }

    addChatMessage('bot', data.response);

    if (data.steps && data.steps.length > 0) {
      displaySteps(data.steps);
    }

    // Reset for next query
    currentStep = 'intent';
    addChatMessage('bot', '---');
    addChatMessage('bot', 'What else would you like to do? Ask me anything!');

    showStatus('✅ Done!', 'success');

  } catch (error) {
    console.error('Agent error:', error);
    addChatMessage('bot', `❌ Error: ${error.message}`);
    addChatMessage('bot', 'Try asking something simpler or use a different website.');
    showStatus(`Error: ${error.message}`, 'error');
  }
}

function addChatMessage(sender, message) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${sender}`;
  messageEl.innerHTML = `<p>${escapeHtml(message)}</p>`;
  chatBox.appendChild(messageEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function displaySteps(steps) {
  stepsContainer.innerHTML = '';
  
  steps.forEach(step => {
    const stepEl = document.createElement('div');
    stepEl.className = 'step';
    stepEl.innerHTML = `
      <span class="step-number">Step ${step.step}:</span>
      ${escapeHtml(step.action)}
    `;
    stepsContainer.appendChild(stepEl);
  });

  responseBox.style.display = 'block';
}

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  if (type !== 'loading') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 4000);
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
