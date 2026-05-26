# Summitizer Portfolio AI Assistant — Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ GitHub Repository (summitize/sumeet_portfolio)                     │    │
│  │ ├─ Source Code (TypeScript/React)                                  │    │
│  │ ├─ Public Assets (portfolio HTML, CSS, images, PDF resume)        │    │
│  │ └─ Environment: .env (git-ignored), .env.example (reference)      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │ git push                                                         │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Vercel Deployment Platform (sumeet-portfolio project)              │    │
│  │ ├─ Build: npm install && npm run build                             │    │
│  │ ├─ Runtime: Node.js + Next.js 14.2.5                              │    │
│  │ ├─ Custom Domain: portfolio.summitize.in                           │    │
│  │ ├─ Environment Variables:                                          │    │
│  │ │   ├─ OPENAI_API_KEY (sk-...)                                    │    │
│  │ │   ├─ GEMINI_API_KEY (AIza...)                                   │    │
│  │ │   ├─ ASSISTANT_PROVIDER (auto|gemini|openai)                    │    │
│  │ │   ├─ RATE_LIMIT_MAX_REQUESTS (15)                              │    │
│  │ │   └─ ASSISTANT_MODEL (gpt-4o-mini)                             │    │
│  │ └─ Preview & Production domains                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │ https://portfolio.summitize.in                                   │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Browser / Client                                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER (Next.js)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ pages/index.tsx (HomePage)                                           │   │
│  │ ├─ getStaticProps: reads public/index.html at build time            │   │
│  │ ├─ Renders: Original portfolio HTML (injected via dangerously...)   │   │
│  │ ├─ Mounts: <AIChatWidget /> (floating, bottom-right)               │   │
│  │ └─ Loads: styles/globals.css, Google fonts, Swiper.js, script.js   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│           │                                                                  │
│           ├─ Static Portfolio Content                                        │
│           │  └─ public/index.html (hero, about, experience, skills, etc)   │
│           │                                                                  │
│           └─ AI Chat Widget                                                 │
│              └─ components/AIChatWidget.tsx                                │
│                 ├─ State: [messages, input, isStreaming, theme, error]    │
│                 ├─ UI: floating button + expandable panel                 │
│                 ├─ Features:                                              │
│                 │   ├─ Streaming chat with typing animation             │
│                 │   ├─ Session history (sessionStorage)                 │
│                 │   ├─ Dark/Light theme toggle                          │
│                 │   ├─ Quick action buttons (Download Resume, Contact)  │
│                 │   ├─ Suggested prompts                                │
│                 │   └─ Error messages & loading states                  │
│                 └─ Styling: AIChatWidget.module.css (dark/light themes) │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ styles/ & public/                                                    │   │
│  │ ├─ globals.css: root theme variables (--bg, --text, --accent, etc) │   │
│  │ ├─ styles.css: portfolio styling                                    │   │
│  │ ├─ public/index.html: original static portfolio                    │   │
│  │ ├─ public/styles.css: portfolio styles                            │   │
│  │ ├─ public/script.js: portfolio interactions                       │   │
│  │ ├─ public/profile.jpg: profile image                              │   │
│  │ └─ public/Sumeet Resume.pdf: downloadable resume                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    fetch POST /api/assistant                                  │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API LAYER (Next.js)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ pages/api/assistant.ts                                               │   │
│  │                                                                      │   │
│  │  Input Validation:                                                  │   │
│  │  ├─ Extract client IP (x-forwarded-for header)                     │   │
│  │  ├─ Enforce rate limit (15 req/min per IP)                         │   │
│  │  ├─ Validate prompt (string, non-empty)                            │   │
│  │  └─ Validate chatHistory (array of messages)                       │   │
│  │                                                                      │   │
│  │  Context Building:                                                  │   │
│  │  ├─ Import lib/assistant.ts                                        │   │
│  │  ├─ Build system messages from profile-data.json                   │   │
│  │  ├─ Combine with chat history + current prompt                     │   │
│  │  └─ Result: messages array for LLM                                 │   │
│  │                                                                      │   │
│  │  Provider Selection (Fallback Chain):                               │   │
│  │  ├─ Read ASSISTANT_PROVIDER env var (auto|gemini|openai)           │   │
│  │  ├─ If auto: try Gemini first, fallback to OpenAI                  │   │
│  │  ├─ If gemini: use Gemini API, fallback to OpenAI                  │   │
│  │  ├─ If openai: use OpenAI API only                                 │   │
│  │  └─ Log: which provider succeeded                                  │   │
│  │                                                                      │   │
│  │  Streaming Response:                                                │   │
│  │  ├─ Set headers: text/event-stream, no-cache                       │   │
│  │  ├─ Pipe LLM stream to HTTP response                               │   │
│  │  ├─ Format: SSE (data: {...}\n\n for each token)                   │   │
│  │  └─ Signal: [DONE] when stream ends                                │   │
│  │                                                                      │   │
│  │  Error Handling:                                                    │   │
│  │  ├─ 400: missing prompt, invalid input                             │   │
│  │  ├─ 429: rate limit exceeded (Retry-After header)                  │   │
│  │  ├─ 500: LLM API failure, missing keys, stream unavailable        │   │
│  │  └─ Log: detailed error messages to console                        │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│           ┌────────────────────────┼────────────────────────┐                │
│           ▼                        ▼                        ▼                │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐        │
│  │ Try Gemini API   │   │ Try OpenAI API   │   │ Fallback Logic   │        │
│  │                  │   │                  │   │                  │        │
│  │ (Primary)        │   │ (Secondary)      │   │ If Gemini fails, │        │
│  │                  │   │                  │   │ try OpenAI       │        │
│  │ google-ai/lib/.. │   │ openai client    │   │ If both fail:    │        │
│  │                  │   │ gpt-4o-mini      │   │ return 500       │        │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘        │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│    Google Gemini API             │   │       OpenAI API                 │
├──────────────────────────────────┤   ├──────────────────────────────────┤
│ https://generativelanguage.g...  │   │ https://api.openai.com/v1/...   │
│                                  │   │                                  │
│ Endpoint:                        │   │ Endpoint:                        │
│ /v1beta/openai/chat/completions │   │ /chat/completions               │
│                                  │   │                                  │
│ Auth:                            │   │ Auth:                            │
│ x-goog-api-key: GEMINI_API_KEY  │   │ Authorization: Bearer ...        │
│                                  │   │                                  │
│ Model:                           │   │ Model:                           │
│ gemini-2.0-flash (default)       │   │ gpt-4o-mini                      │
│                                  │   │ (or ASSISTANT_MODEL env var)     │
│                                  │   │                                  │
│ Streaming:                       │   │ Streaming:                       │
│ Server-Sent Events (SSE)         │   │ Server-Sent Events (SSE)         │
│                                  │   │                                  │
│ Response Format:                 │   │ Response Format:                 │
│ data: {"choices": [...]}         │   │ data: {"choices": [...]}         │
│ ... repeated per token           │   │ ... repeated per token           │
│ data: [DONE]                     │   │ data: [DONE]                     │
│                                  │   │                                  │
└──────────────────────────────────┘   └──────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  lib/assistant.ts (Prompt Engineering):                                     │
│  ├─ buildAssistantMessages(chatHistory, prompt)                            │
│  ├─ Returns: [system_msg_1, system_msg_2, ...history, user_prompt]         │
│  ├─ System messages:                                                        │
│  │   1. "You are Summitizer, answer from profile data only"               │
│  │   2. Profile summary (extracted from profile-data.json)                 │
│  └─ Prevents hallucination by providing resume context                     │
│                                                                               │
│  data/profile-data.json (Single Source of Truth):                           │
│  ├─ name, headline, summary                                                │
│  ├─ contact: email, phone, LinkedIn                                        │
│  ├─ domains: [banking, healthcare, retail, ...]                            │
│  ├─ certifications: [PMP®, SAFe, ...]                                      │
│  ├─ education: [degree, institution, year]                                 │
│  ├─ patent: {title, number, jurisdiction}                                  │
│  ├─ highlights: [key achievements]                                         │
│  ├─ experience: [company, title, period, responsibilities, accounts]       │
│  └─ quickActions: {downloadResume, contact}                                │
│                                                                               │
│  public/index.html (Static Portfolio):                                      │
│  ├─ Preloader & animations                                                 │
│  ├─ Header & navigation                                                    │
│  ├─ Hero section                                                           │
│  ├─ About section                                                          │
│  ├─ Experience timeline                                                    │
│  ├─ Client logos                                                           │
│  ├─ Skills & competencies                                                  │
│  ├─ Education                                                              │
│  ├─ Certifications & patent                                                │
│  ├─ Interests & contact                                                    │
│  └─ Powered by: styles.css, script.js, swiper.js                           │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### Frontend Flow
1. **User opens portfolio**: `portfolio.summitize.in`
2. **Page loads**:
   - Next.js serves `pages/index.tsx`
   - `getStaticProps` injects portfolio HTML from `public/index.html`
   - Styles loaded from `globals.css`, `styles.css`
   - `AIChatWidget` mounted (client-side, no SSR)
3. **Widget interactions**:
   - User clicks "Summitizer" button → panel opens
   - User types question → `handlePrompt()` triggered
   - Frontend calls `POST /api/assistant` with prompt + history
   - Backend returns streaming response (SSE)
   - Widget displays streamed tokens with typing animation

### Backend Flow
1. **Request arrives**: `pages/api/assistant.ts`
2. **Validation**:
   - Check IP, enforce rate limit
   - Validate prompt and chat history
3. **Context building**: `lib/assistant.ts` creates message array with:
   - 2 system messages (instructions + profile resume context)
   - Chat history (prior messages)
   - Current user prompt
4. **Provider selection**:
   - Check `ASSISTANT_PROVIDER` env var
   - Try primary provider (Gemini or OpenAI)
   - On failure, try secondary provider
5. **Streaming**:
   - Open SSE connection
   - Pipe LLM stream to HTTP response
   - Frontend parses `data:` chunks and renders tokens

### Data Flow
- **Profile data**: `profile-data.json` is the single authoritative source
- **System messages** are built from profile data to prevent hallucination
- **Chat history** stored client-side in `sessionStorage` (per-session)
- **LLM selection** configurable via `ASSISTANT_PROVIDER` (auto/gemini/openai)

## Environment Variables

### Required (Vercel Project Settings)
```
OPENAI_API_KEY=sk-...           # OpenAI API key (if using OpenAI)
GEMINI_API_KEY=AIza...          # Google Gemini API key (if using Gemini)
```

### Optional (Vercel Project Settings)
```
ASSISTANT_PROVIDER=auto         # auto (try Gemini first), gemini, or openai
ASSISTANT_MODEL=gpt-4o-mini     # OpenAI model (if ASSISTANT_PROVIDER includes openai)
ASSISTANT_TEMPERATURE=0.0       # Temperature for LLM (0-1, default 0 = deterministic)
RATE_LIMIT_MAX_REQUESTS=15      # Requests per minute per IP
```

## Deployment Checklist

- [ ] Push code to GitHub
- [ ] Vercel detects push and auto-deploys
- [ ] Set `OPENAI_API_KEY` in Vercel Environment Variables (Production)
- [ ] Set `GEMINI_API_KEY` in Vercel Environment Variables (Production) — optional
- [ ] Redeploy to apply env vars
- [ ] Test `https://portfolio.summitize.in`
- [ ] Verify assistant works by sending test prompt
- [ ] Check browser console for errors
- [ ] Monitor Vercel logs for backend issues

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | CSS Modules, Global CSS |
| **Hosting** | Vercel |
| **Domain** | portfolio.summitize.in (custom domain) |
| **LLM Providers** | Google Gemini, OpenAI |
| **Build** | npm, TypeScript compiler |
| **Version Control** | GitHub |

## Security & Rate Limiting

- **Rate Limiting**: 15 requests per minute per client IP
- **API Key Storage**: Environment variables only (not in code)
- **Prompt Injection Protection**: System messages enforce resume-only context
- **CORS**: Frontend and backend on same origin (Vercel domain)
- **Sensitive Data**: `sessionStorage` for chat history (cleared on session end)

## Future Enhancements

- [ ] Persistent user accounts + login
- [ ] Multi-turn conversation history (database)
- [ ] Admin panel to update profile data
- [ ] Analytics: track popular questions
- [ ] Support for additional LLM providers (Claude, etc.)
- [ ] Voice input/output
- [ ] PDF report generation from conversation
