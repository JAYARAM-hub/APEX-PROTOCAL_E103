const puppeteer = require('puppeteer');

async function scrapeWebsite(req, res) {
  try {
    const { website_url } = req.body;
    
    if (!website_url) {
      return res.status(400).json({ error: 'website_url required' });
    }

    console.log(`🕷️ Scraping: ${website_url}`);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      const page = await browser.newPage();
      
      // Mask automation detection
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set longer timeout and better navigation options
      try {
        await page.goto(website_url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
      } catch (navError) {
        console.warn('Navigation timeout, proceeding with partial content:', navError.message);
      }

      // Add delay to let page stabilize (using setTimeout instead of deprecated waitForTimeout)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract all links, headings, buttons, forms
      const sitemap = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'))
          .map(a => ({
            href: a.href,
            text: a.innerText.trim().slice(0, 100),
            id: a.id,
            class: a.className
          }))
          .filter(l => l.text.length > 0)
          .slice(0, 50);

        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
          .map(h => ({ level: h.tagName, text: h.innerText.trim() }))
          .slice(0, 30);

        const buttons = Array.from(document.querySelectorAll('button'))
          .map(b => ({ text: b.innerText.trim(), id: b.id, class: b.className }))
          .filter(b => b.text.length > 0)
          .slice(0, 20);

        const forms = Array.from(document.querySelectorAll('form'))
          .map((f, i) => ({
            id: f.id,
            action: f.action,
            method: f.method,
            inputs: Array.from(f.querySelectorAll('input, textarea, select'))
              .map(inp => ({ name: inp.name, type: inp.type, placeholder: inp.placeholder }))
          }))
          .slice(0, 10);

        return { links, headings, buttons, forms };
      });

      const pages = [{
        url: website_url,
        title: await page.title(),
        structure: sitemap,
        timestamp: new Date().toISOString()
      }];

      await browser.close();

      res.json({
        success: true,
        pages,
        links_count: sitemap.links.length,
        headings_count: sitemap.headings.length
      });

    } catch (err) {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('Error closing browser:', e.message);
        }
      }
      throw err;
    }

  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    res.status(500).json({ 
      error: 'Scraping failed - Website may block automated access',
      details: error.message,
      suggestion: 'Try: wikipedia.org, github.com, or stackoverflow.com'
    });
  }
}

module.exports = { scrapeWebsite };
