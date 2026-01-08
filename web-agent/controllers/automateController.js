const puppeteer = require('puppeteer');
const { callOllama } = require('../config/ollama');
const path = require('path');
const os = require('os');

let automationBrowser = null;
let activePage = null;

async function getAutomationBrowser() {
  if (!automationBrowser) {
    console.log('🚀 Launching browser (Isolated profile)...');
    
    const tempDir = path.join(os.tmpdir(), 'automation-chrome-profile');
    console.log(`📂 Using profile: ${tempDir}`);

    try {
      automationBrowser = await puppeteer.launch({
        headless: false,
        userDataDir: tempDir,
        executablePath: process.platform === 'win32' 
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : process.platform === 'darwin'
          ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          : '/usr/bin/google-chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--start-maximized'
        ],
        defaultViewport: null
      });
      console.log('✅ Browser started!');
    } catch (e) {
      console.error('❌ Error launching browser:', e.message);
      throw e;
    }
  }
  return automationBrowser;
}

async function automateTask(req, res) {
  try {
    const { website_url, task_query } = req.body;

    if (!website_url || !task_query) {
      return res.status(400).json({
        error: 'website_url and task_query required'
      });
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🤖 AUTOMATION MODE`);
    console.log(`📍 Website: ${website_url}`);
    console.log(`🎯 Task: ${task_query}`);
    console.log(`${'='.repeat(70)}\n`);

    const browser = await getAutomationBrowser();
    
    try {
      const pages = await browser.pages();
      for (let p of pages.slice(1)) {
        try {
          await p.close();
        } catch (e) {}
      }
    } catch (e) {}

    const page = await browser.newPage();
    activePage = page;

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Load initial website
    console.log('📄 Loading website...');
    await page.goto(website_url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    }).catch(() => {});
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ✅ UNIVERSAL LOGIN DETECTION (No hardcoding)
    const pageContent = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      
      // Look for any login-related elements
      const hasLoginForm = 
        document.querySelector('input[type="password"]') !== null ||
        document.querySelector('[type="password"]') !== null ||
        bodyText.includes('sign in') ||
        bodyText.includes('log in') ||
        bodyText.includes('login') ||
        bodyText.includes('password');
      
      return {
        url: window.location.href,
        hasLoginForm: hasLoginForm,
        title: document.title
      };
    });

    console.log(`✅ Page loaded: ${pageContent.title}`);
    console.log(`📍 URL: ${pageContent.url}`);

    // If on login page, wait for manual login
    if (pageContent.hasLoginForm) {
      console.log('⏳ LOGIN PAGE DETECTED');
      console.log('⏰ Waiting for you to log in manually (up to 120 seconds)...');
      console.log('📢 Please log in in the Chrome window...');
      
      let isLoggedIn = false;
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const stillOnLogin = await page.evaluate(() => {
          const hasLoginForm = 
            document.querySelector('input[type="password"]') !== null ||
            document.querySelector('[type="password"]') !== null;
          return hasLoginForm;
        });
        
        if (!stillOnLogin) {
          console.log('✅ LOGIN DETECTED!');
          isLoggedIn = true;
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;
        }
      }
      
      if (!isLoggedIn) {
        return res.json({
          success: false,
          message: 'Login timeout. Please log in manually in the browser window.'
        });
      }
    }

    console.log('🔐 Logged in: true');

    // ✅ COMPLETELY GENERIC: Find ALL action buttons
    console.log('🔍 Scanning for action buttons...');

    const elements = await page.evaluate((taskQuery) => {
      const items = [];
      
      // Keywords that suggest action buttons
      const actionKeywords = [
        'create', 'new', 'add', 'post', 'upload', 'compose', 'write',
        'start', 'begin', 'make', 'generate', 'build', 'design',
        'submit', 'send', 'share', 'publish', 'edit', 'delete',
        'save', 'export', 'import', 'download', 'open', 'launch',
        'apply', 'book', 'order', 'buy', 'sell', 'claim', 'connect',
        'authorize', 'allow', 'grant', 'join', 'participate'
      ];

      // Get all clickable elements
      document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]').forEach((el, i) => {
        // Get text from element
        let text = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || el.value || '').trim();
        
        // Clean up text
        text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Skip if too short or too long
        if (text.length < 2 || text.length > 100) return;
        
        // Check if visible
        const visible = el.offsetHeight > 0 && el.offsetWidth > 0;
        if (!visible) return;

        // Score based on keywords
        const textLower = text.toLowerCase();
        const taskLower = taskQuery.toLowerCase();
        
        let score = 0;
        
        // Exact match with task = highest score
        if (textLower.includes(taskLower.split(' '))) score += 50;
        
        // Action keyword match
        actionKeywords.forEach(keyword => {
          if (textLower.includes(keyword)) score += 10;
        });

        items.push({
          index: i,
          text: text,
          score: score
        });
      });

      // Remove duplicates (same text)
      const seen = new Set();
      const unique = items.filter(item => {
        if (seen.has(item.text)) return false;
        seen.add(item.text);
        return true;
      });

      // Sort by score (highest first)
      return unique.sort((a, b) => b.score - a.score).slice(0, 20);
    }, task_query);

    console.log(`✅ Found ${elements.length} clickable elements`);
    
    if (elements.length === 0) {
      return res.json({
        success: false,
        message: 'No clickable elements found on page'
      });
    }

    // Show top buttons
    console.log(`🔘 Top action buttons:`);
    elements.slice(0, 5).forEach((btn, i) => {
      console.log(`  [${i}] ${btn.text.substring(0, 60)}`);
    });

    // ✅ USE AI TO PICK BEST BUTTON (Completely generic)
    const buttonList = elements
      .slice(0, 10)
      .map((btn, i) => `[${i}] "${btn.text}"`)
      .join('\n');

    const aiPrompt = `You are helping automate a task on a website.

WEBSITE TASK: "${task_query}"

AVAILABLE BUTTONS:
${buttonList}

Which button number (0-${Math.min(elements.length - 1, 9)}) should be clicked to complete the task "${task_query}"?

Respond ONLY with the number, nothing else. Example: 0`;

    console.log('🧠 AI selecting best button...');
    let aiResponse = await callOllama(aiPrompt);
    
    console.log(`📝 AI Response: ${aiResponse.trim()}`);

    // Parse response
    const indexMatch = aiResponse.match(/\d+/);
    let selectedIndex = 0;

    if (indexMatch) {
      selectedIndex = parseInt(indexMatch);
      if (selectedIndex >= elements.length) {
        selectedIndex = 0;
      }
    }

    const selectedButton = elements[selectedIndex];
    console.log(`✅ Selected: "${selectedButton.text}"`);
    console.log(`👆 Clicking button...`);

    // Click the button
    try {
      await page.evaluate((buttonText) => {
        // Get all clickable elements
        const allElements = Array.from(
          document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')
        );

        // Find matching element
        const target = allElements.find(el => {
          const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.value || '').trim();
          return text === buttonText && el.offsetHeight > 0;
        });
        
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.click();
        }
      }, selectedButton.text);

      console.log('✅ Click executed');
      await new Promise(resolve => setTimeout(resolve, 3000));

      const finalUrl = await page.evaluate(() => window.location.href);
      const finalTitle = await page.title();

      console.log(`✅ Action completed successfully!`);
      console.log(`📍 Final URL: ${finalUrl}`);
      console.log(`📄 Final page: ${finalTitle}`);

      return res.json({
        success: true,
        mode: 'AUTOMATION',
        action: 'button_click',
        userTask: task_query,
        website: website_url,
        execution: {
          action: 'clicked_button',
          button: selectedButton.text,
          method: 'AI-selected from all relevant buttons',
          currentUrl: finalUrl,
          pageTitle: finalTitle
        },
        pageStatus: 'OPEN - Action completed'
      });

    } catch (e) {
      console.error('❌ Click failed:', e.message);
      return res.json({
        success: false,
        message: 'Button click failed',
        error: e.message,
        attempted_button: selectedButton.text
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      error: 'Automation failed',
      details: error.message
    });
  }
}

async function closeBrowser(req, res) {
  try {
    if (automationBrowser) {
      await automationBrowser.close();
      automationBrowser = null;
      activePage = null;
      console.log('✅ Browser closed');
    }
    res.json({ success: true, message: 'Browser closed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  automateTask,
  closeBrowser
};
