# PitchProof

> **Intelligent Multi-Agent Venture Intelligence Platform to Evaluate, Stress-Test & Score Startup Ideas**

PitchProof is an AI-powered startup validation engine built with **FastAPI**, **LangGraph**, **MongoDB**, and a modern **React 19 / TanStack Start** frontend. It evaluates early-stage startup concepts through real-time market data, competitor intelligence, automated SWOT & feasibility analysis, a lean MVP roadmap, and an objective 0–100 viability scorecard.

---

## 🏛️ System Architecture

PitchProof is organized into two decoupled tiers connected via REST and Server-Sent Events (SSE):

```
Ai-startup-idea-validator/
├── backend/                       # FastAPI + LangGraph 6-Agent Engine
│   ├── src/                       # Complete backend application source code
│   │   ├── app/                   # FastAPI application & MongoDB integration
│   │   │   ├── auth/              # JWT authentication & bcrypt security
│   │   │   ├── config.py          # App settings & environment loading
│   │   │   ├── database.py        # MongoDB connection & collection helpers
│   │   │   └── main.py            # Server entrypoint & SSE streaming routes
│   │   ├── agents/                # Specialized 6-Agent Research Squad
│   │   │   ├── idea_agent.py      # Entity Extraction & Problem Formulation
│   │   │   ├── trends_agent.py    # Google Trends & News Sentiment
│   │   │   ├── competitor_agent.py# Tavily & SerpAPI Incumbent Discovery
│   │   │   ├── swot_agent.py      # 4-Quadrant SWOT & Risk Analysis
│   │   │   ├── recommendation_agent.py # Lean MVP Roadmap (MoSCoW Framework)
│   │   │   └── report_agent.py    # Viability Scoring & Decision Synthesis
│   │   ├── graph/                 # LangGraph StateGraph workflow orchestration
│   │   │   └── workflow.py        # 6-Agent state machine & transition graph
│   │   ├── state/                 # Pydantic schemas & GraphState TypedDict
│   │   │   └── schema.py
│   │   └── utils/                 # Shared utilities, LLM factory, guardrails & research tools
│   │       ├── guardrails.py      # Two-tier input validation & spam guardrails
│   │       ├── llm.py             # Multi-provider LLM factory (Gemini, Claude, Ollama)
│   │       ├── logger.py          # Colorized structured logging middleware
│   │       ├── search_tool.py     # Competitor search integrations (Tavily, SerpAPI, DDG)
│   │       ├── trends_tool.py     # 12-month Google Trends analyzer
│   │       └── news_tool.py       # Live market headlines (NewsData, NewsAPI)
│   └── tests/                     # Asynchronous pytest integration test suite
├── frontend/                      # React 19 + TanStack Start Modern Web App
│   ├── src/
│   │   ├── components/            # UI components (Header, Forms, Feedback Modal, etc.)
│   │   ├── routes/                # TanStack Router file-based routes (/, /validate, /report, etc.)
│   │   └── lib/                   # API client, auth state, formatting helpers
│   ├── public/                    # PitchProof assets, favicons, robots.txt
│   └── vite.config.ts             # Vite + Tailwind v4 + TanStack Start configuration
├── FUTURE_SCOPE.md                # Prioritized roadmap & upcoming capabilities
├── setup.sh                       # Single unified full-stack setup & launch script
└── README.md                      # Comprehensive project documentation
```

---

## 🛡️ Input Guardrail & Gemini 3.8 Architecture

PitchProof is powered by **Google Gemini 3.8 Flash** (`gemini-3.8-flash`) as its default reasoning engine, paired with an aggressive two-tier input validation gatekeeper to protect external API quotas, prevent hallucinations on non-business inputs, and ensure only legitimate startup concepts reach the research squad.

### 1. Tier 1: Instant Heuristics Filter (0ms Latency, 0 Tokens)
Runs locally before any external LLM is contacted:
- **Environment & Secret Dumps**: Automatically detects `.env` configurations, `KEY=VALUE` pairs, API key exports, and database connection strings.
- **Source Code & Markup**: Disqualifies code snippets (Python, JS, C, Go), SQL queries, HTML/XML syntax, and terminal stack traces.
- **Keyboard Mash & Low Entropy**: Screens out character mashing (`asdfghjkl`, `qwertyuiop`), repeated letters (`aaaaa`), and token spam (`crypto crypto crypto`).
- **Data Dumps & Word Threshold**: Blocks raw JSON/YAML objects and inputs containing fewer than 3 descriptive words.

### 2. Tier 2: Gemini 3.8 Semantic Intent Guardrail
If the pitch passes the heuristic filter, a rapid semantic check is evaluated via **Gemini 3.8 Flash**:
- **Intent Verification**: Confirms the submission describes a genuine startup idea, product proposal, commercial service, or market problem.
- **Non-Business Query Rejection**: Filters out off-topic chit-chat, cooking recipes, trivia, jokes, homework questions, and prompt injection attempts.
- **Clean Failure Contract**: Instantly returns `HTTP 400 Bad Request` with an exact explanation, preventing downstream search and analysis calls.

---

## 🤖 The 6-Agent LangGraph Research Pipeline

Each submission triggers a deterministic, stateful workflow orchestrated via **LangGraph**:

1. **Idea Extraction Agent** (`agents/idea_agent.py`):  
   Normalizes raw founder input into structured entities: target customer persona, problem statement, value proposition, industry sector, and technical/budgetary constraints.
2. **Market Trends & Demand Agent** (`agents/trends_agent.py`):  
   Pulls historical 12-month quantitative Google search volume curves via live `SerpAPI` / `pytrends` and queries real-time industry articles via `NewsData.io` to gauge sentiment and momentum.
3. **Competitor Intelligence Agent** (`agents/competitor_agent.py`):  
   Executes live market reconnaissance via `Tavily Search API` and `SerpAPI`. Identifies direct incumbents, indirect substitutes, feature gaps, and pricing benchmarks with source URLs.
4. **SWOT & Risk Feasibility Agent** (`agents/swot_agent.py`):  
   Performs a rigorous 4-quadrant SWOT matrix (Strengths, Weaknesses, Opportunities, Threats) and rates regulatory, operational, timing, and execution risks with mitigation plans.
5. **The Lean MVP Roadmap Agent** (`agents/recommendation_agent.py`):  
   Formulates a phased product execution plan prioritized into **Must-Have**, **Nice-to-Have**, and **Future Scope** features, paired with key validation milestones.
6. **Validation & Scoring Report Agent** (`agents/report_agent.py`):  
   Calculates an objective **0–100 PitchProof Viability Score** across four core pillars (Market Demand, Feasibility, Competition Barrier, Business Viability) and issues a decisive Launch Readiness Verdict:
   - 🟢 `Ready to Launch` (Score $\ge 75$)
   - 🟡 `Requires Refinement` (Score $50 - 74$)
   - 🔴 `High Risk / Pivot Advised` (Score $< 50$)

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Python 3.12, [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/)
- **Orchestration**: [LangGraph](https://github.com/langchain-ai/langgraph), [LangChain](https://python.langchain.com/)
- **Supported LLMs**: Google Gemini (`gemini-3.8-flash`), Anthropic Claude (`claude-3-5-sonnet-20241022`), Ollama Cloud (`llama3.3`)
- **Database**: [MongoDB](https://www.mongodb.com/) (Async Motor Driver)
- **Auth**: JWT (`PyJWT`) + `bcrypt`
- **Data & APIs**: Google Trends (`SerpAPI` / `pytrends`), Tavily Search API, NewsData.io
- **Package Manager**: [`uv`](https://github.com/astral-sh/uv) or `pip`

### Frontend
- **Framework**: [React 19](https://react.dev/), [TanStack Start](https://tanstack.com/start), [TanStack Router](https://tanstack.com/router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Visuals**: [Recharts](https://recharts.org/), [Framer Motion](https://motion.dev/), [GSAP](https://gsap.com/)
- **Tooling**: [Bun](https://bun.sh/) or Node.js 20+, [Vite 8](https://vitejs.dev/)

---

## 📋 System Prerequisites

Ensure the following tools are installed on your machine before running:

1. **Python 3.11+** (Python 3.12 recommended)
2. **Node.js 20+** or **Bun** (`curl -fsSL https://bun.sh/install | bash`)
3. **MongoDB** service running locally at `mongodb://localhost:27017` (or MongoDB Atlas URI)
4. **API Keys**:
   - `GEMINI_API_KEY`: Required for LLM reasoning and agent generation (obtainable free from [Google AI Studio](https://aistudio.google.com/)).
   - `SERPAPI_API_KEY`: For live Google Trends time-series search data (from [SerpAPI](https://serpapi.com/)).
   - `TAVILY_API_KEY`: For competitor and alternative discovery (from [Tavily](https://tavily.com/)).
   - `NEWSDATA_API_KEY`: For real-time domain news headlines (from [NewsData.io](https://newsdata.io/)).

---

## 🚀 Getting Started

### Option 1: One-Command Launch (Linux, macOS & Git Bash)

Run the unified setup script from the project root:

```bash
chmod +x setup.sh
./setup.sh
```

**What `setup.sh` handles automatically:**
1. Verifies system prerequisites (Python 3, uv/pip, Bun/npm, MongoDB).
2. Generates `backend/.env` and `frontend/.env` templates if not already present.
3. Installs backend dependencies in `.venv` and sets up MongoDB indexes.
4. Installs frontend dependencies using Bun or npm.
5. Launches both backend (`http://localhost:8000`) and frontend (`http://localhost:5173`) concurrently.

---

### Option 2: Windows Manual Setup (PowerShell / Command Prompt)

Open two separate terminals:

#### 🟦 Terminal 1 — Backend:
```powershell
cd backend
copy .env.example .env
python -m venv .venv

# PowerShell:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1

# Install & Launch:
pip install -r requirements.txt
python -m uvicorn app.main:app --app-dir src --reload-dir src --host 0.0.0.0 --port 8000 --reload
```

#### 🟧 Terminal 2 — Frontend:
```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status and list of registered pipeline agents |
| `POST` | `/api/auth/register` | Create a new founder account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT bearer token |
| `GET` | `/api/auth/me` | Fetch currently authenticated user profile |
| `POST` | `/api/validate` | Execute synchronous validation pipeline on an idea |
| `POST` | `/api/validate/stream` | Stream real-time agent execution logs via Server-Sent Events (SSE) |
| `GET` | `/api/ideas` | Retrieve past idea evaluations for authenticated user |
| `GET` | `/api/ideas/{id}` | Fetch specific validation dossier |
| `DELETE` | `/api/ideas/{id}` | Delete a saved validation from database |
| `GET` | `/api/trends?keyword={query}` | Query 12-month Google Trends search interest (requires auth) |
| `GET` | `/api/admin/overview` | Platform analytics and recent validations (admin only) |
| `GET` | `/api/admin/users` | Search user accounts and activity (admin only) |
| `GET` | `/api/admin/validations` | Search all idea analyses (admin only) |

---

## 🛡️ Administrator Accounts & Console

Accounts created through the signup form always receive the `user` role. Signup requests do not accept a role, and administrator access is checked against the stored MongoDB role on every admin API request. Existing accounts without a role are backfilled as `user` during backend startup. The admin console at `/admin` includes platform usage charts, founder account activity, and searchable idea analysis records.

Create a developer-managed administrator from the `backend` directory. The script prompts for the account details and password, then creates the account or promotes the matching email to `admin`:

```bash
cd backend
python scripts/create_admin.py
```

The account can also be provisioned directly in MongoDB by setting a trusted account's `role` to `"admin"` and storing a bcrypt password hash in `password_hash`. Do not set an admin role from the public signup flow.

---

## 📄 License

MIT License. Designed and engineered for founders, venture scouts, and product builders.
