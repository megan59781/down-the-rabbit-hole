# DOWN THE RABBIT HOLE 🐇

*Follow a thought. See where it might take you.*

Ask a question, then fall. Instead of answers, new questions rise out of the dark as you tumble down the rabbit hole. Grab one and you fall into it. Flip gravity between Deeper and Stranger and the whole tunnel twists around you.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Zod · Anthropic Claude

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your AI_API_KEY
npm run dev                  # http://localhost:3000
```

Checks:

```bash
npm run lint
npm run build
```

## How it works

1. **Ask** a question on the landing page, and you start falling.
2. **Questions rise** out of the hole: four at a time, each with a one-line whisper of why it's interesting.
3. **Grab one** (tap or click) to fall into it: the others rush past and new questions rise from it.
4. **Flip gravity** with the header toggle:
   - **↓ Deeper**: straight down a cold blue tunnel. Assumptions, causes, what's underneath.
   - **✦ Stranger**: the tunnel twists into a pink spiral and tips sideways. Other worlds, odd angles.
5. **Scroll or swipe** to fall faster; stop and you slow to a hover.
6. **↑ Look up** pauses the fall and shows the path you took, with the questions you passed beside it. Tap any to fall back into it.
7. **↻ Let others rise** swaps in a fresh set.

The tunnel is a canvas animation; reduced-motion users get a slow, gentle version. Falls are saved in the browser (localStorage), so a refresh keeps everything.

## AI

All model calls happen server-side; the browser never sees the key.

| Route | In | Out |
|---|---|---|
| `POST /api/questions` | question, path, mode (deeper / stranger), exclude | 4 questions, each with a whisper |

| Variable | Meaning |
|---|---|
| `AI_PROVIDER` | `anthropic` (the provider layer in `lib/ai/provider.ts` is swappable) |
| `AI_API_KEY` | Anthropic API key |
| `AI_MODEL` | model id, or shorthand `opus` / `sonnet` / `haiku`; defaults to `claude-opus-5-5` |

- Responses use structured outputs (Zod), then pass a second, stricter validation. Nothing model-generated is executed.
- Requests run at low effort for responsiveness, with Anthropic's server-side refusal fallback enabled.

## Structure

```text
app/                       routes, layout, global theme (globals.css), favicon (icon.svg)
app/api/questions          question → questions
app/explore/[sessionId]    the fall (client-only; falls live in localStorage)
components/branding        Logo, RabbitIcon, RabbitGuide (loader, ears, footprints)
components/landing         LandingPage, BeginJourney, ThoughtInput
components/fall            FallView, Tunnel (canvas), GravityToggle, LookUp
lib/ai                     provider abstraction, prompts, generators (server-only)
lib/schemas                Zod schemas for requests, model output and responses
lib/session                question tree helpers + useExplorationSession hook
lib/storage                SessionStore abstraction (localStorage implementation)
lib/explore/client.ts      browser-side calls to the API routes
lib/content                landing page example prompts
```

## Brand tokens

Defined in `app/globals.css` under `@theme` and usable as Tailwind classes:
`midnight`, `violet`, `lavender`, `ice` (Go Deeper), `pink` (Go Stranger), `soft`, `muted`.
Fonts: `font-display` (Space Grotesk), `font-sans` (Inter), `font-serif` (DM Serif Display).
