# Portfolio AI Chat Assistant

This folder contains a production-ready React/Next.js-compatible AI assistant widget for `portfolio.summitize.in`.

## What is included

- `components/AIChatWidget.tsx` — floating chat widget UI with suggested prompts, resume download, contact quick actions, chat history, and streaming typing animation.
- `pages/api/assistant.ts` — backend API endpoint that proxies OpenAI `gpt-4o-mini` streaming responses.
- `lib/assistant.ts` — prompt engineering and profile-context builder to enforce answers only from the resume/profile JSON.
- `data/profile-data.json` — structured profile/resume data source used by the assistant.
- `.env.example` — environment variable guidance for OpenAI and rate limiting.
- `pages/index.tsx` — sample integration page showing the widget in a portfolio context.
- `styles/globals.css` and `components/AIChatWidget.module.css` — premium corporate UI styling.

## Environment variables

Create a `.env.local` file in the project root with:

```env
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RATE_LIMIT_MAX_REQUESTS=15
ASSISTANT_MODEL=gpt-4o-mini
ASSISTANT_TEMPERATURE=0.0
```

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000`.

## Deployment to Vercel

1. Push the repository to GitHub.
2. Create a new Vercel project and connect the repository.
3. Set the following environment variable in Vercel:
   - `OPENAI_API_KEY`
   - `RATE_LIMIT_MAX_REQUESTS` (optional)
   - `ASSISTANT_MODEL` (optional, default: `gpt-4o-mini`)
   - `ASSISTANT_TEMPERATURE` (optional, default: `0.0`)
4. Use the default Vercel build command:

```bash
npm install
npm run build
```

5. Set the production branch and deploy.

## Notes for integration

- The assistant is designed to answer only from `data/profile-data.json`.
- If the user asks something outside the resume data, it gently replies that the answer is unavailable.
- Streaming is implemented through the OpenAI `chat.completions` SSE stream, and the frontend parses the stream to display typed content.
- The resume quick action button is linked to `profileData.quickActions.downloadResume`. Move `Sumeet Resume.pdf` into the `public/` folder or update the path before production.

## Production readiness

- Rate limiting is enforced at the API route using in-memory request tracking.
- The UI is fully responsive and adapts to dark/light theme preferences.
- Chat history persists for the session using `sessionStorage`.
- Error and loading states are included for robust behavior.

## Extending the assistant

- Add new fields to `data/profile-data.json` to expand knowledge coverage.
- Update `promptSuggestions` in `components/AIChatWidget.tsx` for additional guided queries.
- If you want stronger hallucination protection, keep `ASSISTANT_TEMPERATURE=0.0` and increase prompt specificity in `lib/assistant.ts`.
