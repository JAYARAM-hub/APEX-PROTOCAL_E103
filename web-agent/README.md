# 🤖 AI Website Navigation Assistant

**Universal AI-powered website guide** that understands any website's structure and generates step-by-step instructions to complete user tasks, without being hardcoded for specific sites.

---

## ✨ Features

- ✅ **Universal Navigation** - Works on ANY website (Wikipedia, Amrita, GitHub, Makemytrip, etc.)
- ✅ **Local AI** - Uses Ollama + Mistral (no API costs, no internet required after setup)
- ✅ **Real-time Scraping** - Extracts live website structure (links, headings, buttons, forms)
- ✅ **Smart Context-Awareness** - Understands both user intent and website layout
- ✅ **Step-by-Step Guidance** - Clear, actionable instructions for task completion
- ✅ **Clean UI** - Chat panel (left) + Steps panel (right), no duplicates

---

## 🏗️ Architecture

```
┌─────────────┐        ┌──────────────┐         ┌─────────────┐
│   Frontend  │        │   Backend    │         │   Ollama    │
│ (HTML/JS)   │───────▶│(Express API) │────────▶│  (Mistral)  │
│             │        │              │         │             │
│ • Chat      │        │ /api/scrape  │         │ Local LLM   │
│ • Steps     │        │ /api/ask     │         │ (7B model)  │
└─────────────┘        └──────────────┘         └─────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   Website    │
                      │   Scraper    │
                      │ (Puppeteer)  │
                      └──────────────┘
```

**Data Flow:**
1. User describes goal → Frontend sends to Backend
2. Backend scrapes target website → extracts structure
3. Backend sends goal + structure to Ollama (Mistral)
4. Mistral generates step-by-step guide → Backend returns to Frontend
5. Frontend displays steps in clean right-side panel

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16+) - [Download](https://nodejs.org)
- **Ollama** - [Download](https://ollama.com)
- **Git** - [Download](https://git-scm.com)

### Installation

**1. Clone repository**
```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd APEX-PROTOCAL_E103
```

**2. Install Ollama + Mistral** (one-time setup)
```bash
# Option A: GUI - Download Ollama, install, then in terminal:
ollama pull mistral

# Option B: Terminal - Direct setup
ollama pull mistral
ollama serve
```

**Keep Terminal 1 running with Ollama.**

**3. Backend setup** (Terminal 2)
```bash
cd web-agent
npm install
npm start
```

**See:** `🚀 Server running on http://localhost:5000`

**4. Frontend** (Browser)
```
Open: web-agent/frontend/index.html
Or visit: http://localhost:5000
```

---

## 💻 Usage

**Step 1:** Type what you need
```
"Help me login to Amrita portal"
```

**Step 2:** Specify the website
```
"aeee.amrita.edu"
```

**Step 3:** Follow the generated steps
```
Step 1: Click "Student Login" link at top right
Step 2: Enter your username in the first field
Step 3: Enter your password
Step 4: Click "Sign In" button
```

**Examples you can try:**
- "Book a hotel" → makemytrip.com
- "Find Python documentation" → python.org
- "Search for a GitHub repository" → github.com
- "Find admission info" → aeee.amrita.edu

---

## 📁 Project Structure

```
web-agent/
├── frontend/
│   └── index.html          # Single-page UI (HTML + CSS + JS)
├── backend/
│   ├── server.js           # Express server + routes
│   ├── controllers/
│   │   ├── scraperController.js    # Website scraping logic
│   │   └── agentController.js      # AI agent logic
│   ├── config/
│   │   └── ollama.js       # Ollama API caller
│   ├── package.json
│   └── .env               # Environment variables
└── README.md              # This file
```

---

## 🔌 API Endpoints

### POST `/api/scrape`
Scrapes a website and extracts its structure.

**Request:**
```json
{
  "website_url": "https://wikipedia.org"
}
```

**Response:**
```json
{
  "pages": [{
    "url": "https://wikipedia.org",
    "title": "Wikipedia",
    "links_count": 45,
    "headings_count": 12,
    "structure": {
      "links": ["Main page", "Contents", "Current events"],
      "headings": ["Welcome to Wikipedia"],
      "buttons": ["Search", "Go"],
      "forms": ["Search box"]
    }
  }],
  "links_count": 45,
  "headings_count": 12
}
```

### POST `/api/ask`
Generates step-by-step guide using Mistral model.

**Request:**
```json
{
  "query": "Help me book a hotel",
  "pages": [{ /* scraped page structure */ }]
}
```

**Response:**
```json
{
  "success": true,
  "query": "Help me book a hotel",
  "response": "Step 1: Click on Hotels tab...",
  "steps": [
    { "step": 1, "action": "Click on Hotels tab at top" },
    { "step": 2, "action": "Enter destination city" },
    { "step": 3, "action": "Select check-in date" }
  ],
  "timestamp": "2026-01-08T12:00:00Z"
}
```

---

## ⚙️ Configuration

### `.env` file (Backend)
```env
PORT=5000
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=mistral
OLLAMA_TIMEOUT=120000
```

### Ollama Config
- **Model:** Mistral 7B (default)
- **Local URL:** `http://localhost:11434`
- **Memory:** ~4GB RAM required
- **Alternative models:** `mistral-nemo`, `llama2`, `neural-chat`

**To use different model:**
```bash
ollama pull mistral-nemo
# Update .env: OLLAMA_MODEL=mistral-nemo
```

---

## 🚨 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `Cannot connect to localhost:11434` | Ollama not running | `ollama serve` in separate terminal |
| `Model mistral not found` | Model not pulled | `ollama pull mistral` |
| `npm start fails` | Dependencies not installed | `npm install` in web-agent folder |
| `Slow response (60+ seconds)` | First model load | Normal first time; subsequent runs are 5-15s |
| `Port 5000 already in use` | Another app using port | Change PORT in .env or kill process |
| `Cannot find path` | Wrong directory | `cd web-agent` first, then `npm start` |

**Debug commands:**
```bash
# Check Ollama status
ollama list

# Test Ollama API
curl http://localhost:11434/api/generate -d "{\"model\":\"mistral\",\"prompt\":\"test\"}"

# Check backend logs
npm start  # See all logs in real-time
```

---

## 🔒 How It Works (Technical)

1. **Scraper** (Puppeteer/Cheerio)
   - Opens target website
   - Parses HTML to extract clickable elements
   - Returns structured data (links, headings, buttons, forms)

2. **Prompt Builder**
   - Combines: User Goal + Website Structure
   - Example: "User wants: login. Page has: Login link, Username field, Password field"

3. **Mistral Model** (via Ollama)
   - Receives prompt
   - Uses training knowledge of website patterns
   - Generates step-by-step guide

4. **Step Parser**
   - Extracts numbered steps from model output
   - Formats as clean JSON: `[{ step: 1, action: "..." }, ...]`

5. **Frontend Display**
   - Shows steps in clean cards on right panel
   - No duplicates, only essential information

---

## 🌐 Deployment

### Frontend (GitHub Pages)
```bash
# Push code to GitHub
git add .
git commit -m "Deploy AI website navigator"
git push origin main

# In GitHub: Settings → Pages → Source = main
# Your frontend will be live at: https://<username>.github.io/<repo>/
```

### Backend (Render/Railway/VPS)
Since Ollama runs locally, backend should run on same machine as Ollama. For cloud deployment:
- Deploy backend to cloud service (Render, Railway, Heroku)
- Ensure Ollama runs on backend server
- Update frontend API URL in index.html

---

## 📊 Why This Approach?

✅ **Local AI** - Mistral runs on user's machine (privacy + free)  
✅ **Universal** - Works on any website (not hardcoded)  
✅ **Real-time** - Scrapes live website data  
✅ **Accurate** - AI sees actual page elements  
✅ **Fast** - After warmup, 5-15 second responses  
✅ **Solves Problem Statement** - "AI Agent for Company Websites" with contextual, actionable guidance

---

## 🎓 Learning Resources

- [Ollama Docs](https://github.com/ollama/ollama)
- [Express.js Guide](https://expressjs.com)
- [Web Scraping with Node](https://cheerio.js.org)
- [AI Agents & LLMs](https://arxiv.org/abs/2404.03648)

---

## 📝 License

MIT License - Feel free to use, modify, and distribute.

---

## 👥 Team

- **Developer:** Your Name
- **Project:** APEX Protocol - E103
- **Built:** January 2026

---

## 🤝 Contributing

Found a bug? Have ideas? 
1. Fork the repo
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open Pull Request

---

## 📞 Support

**Having issues?**
1. Check Troubleshooting section above
2. Verify Ollama is running: `ollama serve`
3. Check backend logs: `npm start`
4. Open an Issue on GitHub

---

**Ready to navigate any website with AI!** 🚀✨
