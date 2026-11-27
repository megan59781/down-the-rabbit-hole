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

1. **Ask** a question on the landing page (the **?** in the corner explains the idea in four lines): the rabbit hops into a portal, your question drops in after it, and you plunge into the tunnel.
2. **Questions rise** out of the hole: four at a time, each with a one-line whisper of why it's interesting.
3. **Grab one** (tap or click) to fall into it: the others rush past and new questions rise from it.
4. **Flip gravity** with the header toggle:
   - **↓ Deeper**: straight down a cold blue tunnel. Assumptions, causes, what's underneath.
   - **✦ Stranger**: the tunnel twists into a pink spiral and tips sideways. Other worlds, odd angles.
   - **⇝ Astray**: the anti-algorithm. The hole leads you away from your own habits (see below).
5. **Scroll or swipe** to fall faster; stop and you slow to a hover.
6. **↑ Look up** pauses the fall. Two pages: **Your fall** (the way down, with the questions you passed beside each step; tap any to fall back into it) and **About you** (what the rabbit has learnt about your taste).
7. **↻ Let others rise** swaps in a fresh set.
8. **Steer**: tilt your phone (or move the mouse on desktop) to lean the hole; the questions drift the other way.
9. **Depth**: every level down is darker and slower, and the rabbit flashes past more often.
10. **Catch the rabbit** (tap it, or press R while it's there) and it asks *you* something (see below).
11. **🔊 Sound** (off until you switch it on, then remembered): wind that follows your falling speed, a cold hum for Deeper, a warbling shimmer for Stranger, an unsettled, wandering drone for Astray, and bells when you grab a question or new ones rise. All synthesised live with the Web Audio API.
12. **? How it works**: a short, skippable spotlight tour of the fall (seven steps; arrow keys and Escape work). Offered at the start of each new fall (on the first question only) until you've taken it, and always one tap away in the header.
13. **Climb out**: **+ New question** (or the logo) runs the tunnel in reverse and lifts you out of the hole before the landing page.

The tunnel is a canvas animation; reduced-motion users get a slow, gentle version. Falls are saved in the browser (localStorage), so a refresh keeps everything.

## A soft feed, and its opposite

Deeper and Stranger behave like a gentle feed: once the hole has seen you choose a few times, the AI is told your taste and leans two of every four questions towards it (the other two stay open), and the next level is grown first for the questions you're most likely to grab, so your kind of question opens instantly. Astray does the opposite.

## Catch the rabbit: the AI asks, you answer

Every so often the rabbit flashes past. Catch it and the fall holds still while it asks you a question only you can answer, growing from the one you're holding.

1. **Write** (`lib/ai/rabbit.ts`): one call writes three candidate questions from your own life, senses, memories, home or people. Light, never intrusive, never asking for anything identifying.
2. **Test**: a second call tries to answer each one for a stranger and judges whether its attempt is knowledge or a guess. Only a question the AI *failed* on is asked; if it could answer all three, it writes more personal ones. You watch this happen: each candidate, the rabbit's guess, and the one it couldn't answer.
3. **Answer** in a sentence, or "Not this one". It never replies: your answer becomes the thing you're holding, and new questions grow out of your own words. In Look up it appears as a rabbit step.
4. **Care**: the rabbit leaves you be if anything in the fall sounds like real distress, and answers get the same care check as questions. Answers stay in this browser.

## Astray: the anti-algorithm

A feed learns what you like and gives you more of it. Astray learns what you like and leads you away from it, and shows you that it's doing so.

1. **Learning**: the AI tags every question with a territory (science, history, art, money…) and a style on four axes: playful/serious, small/vast, concrete/abstract, personal/worldly. Every grab, in any direction, updates a habit model: the topics and kinds of question you choose, the ones you pass over, with older choices fading. Stored only in this browser.
2. **A wide field, written against you**: in Astray the AI writes 10 candidates instead of 4, with a brief of your habits: your style lean (and the opposite to write), your favourite territories, and a handful of recent picks ("nothing like these") and skips ("lean towards these").
3. **Meaning, on device**: a small sentence-embedding model (all-MiniLM-L6-v2 via transformers.js) runs in a Web Worker and places each question in a space of meaning. It downloads the first time you go Astray (about 45 MB, then cached; skipped on data-saver connections). Question text never leaves the device for this.
4. **The inverted recommender** (`lib/astray/select.ts`): each candidate gets a familiarity score: how crowded your recent picks are around it in meaning-space, how much it matches your usual style and topics, and how close it is to the fall so far, minus a pull towards the things you skip. It keeps the 4 least familiar that still (loosely) grow from the held question, using maximal-marginal-relevance so they also differ from each other. Without the model, it steers by territory alone.
5. **Made visible**: the candidates hover faintly while they stream in; the six turned down are struck through, marked "too you" and flung into the walls on their territory's side. The tunnel dents inwards on the side of your strongest habit and bends away from it, harder the more set in your ways you are. The rabbit names the habits it's working against.
6. **Honest**: ↑ Look up shows what the rabbit has learnt about you (topics and style), how it's steering, and a button to forget it all.

## AI

All model calls happen server-side; the browser never sees the key.

| Route | In | Out |
|---|---|---|
| `POST /api/questions` | question, path, mode (deeper / stranger), exclude | a stream (NDJSON) of up to 4 questions, each with a whisper, plus a `care` flag when needed |

| Variable | Meaning |
|---|---|
| `AI_PROVIDER` | `anthropic` (the provider layer in `lib/ai/provider.ts` is swappable) |
| `AI_API_KEY` | Anthropic API key |
| `AI_MODEL` | model id, or shorthand `opus` / `sonnet` / `haiku`; defaults to `claude-opus-5-5` |
| `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_PER_HOUR` | per-visitor limits (default 40 / 300) |
| `AI_DAILY_CAP` | total AI calls per day across everyone, a spending cap (default 3000) |
| `NEXT_PUBLIC_SITE_URL` | the public address, shown on share cards and in share captions (defaults to wherever the site is open) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | optional: share rate limits and the daily cap across server instances |

- **Fast:** questions stream in one by one as the model writes them (first one in about a second). Once they've risen, the next level is quietly grown for each (two at a time), so diving is usually instant.
- **Safe by default:** every streamed line is validated on the server and again in the browser. Nothing model-generated is executed.
- **Care first:** questions that sound like real distress (a keyword check, plus the model's own flag) get gentle, grounded questions whatever the mode, and a calm support note with Samaritans and findahelpline.com.
- **Abuse and cost controls:** same-origin check, per-visitor rate limits, a daily cap, and a small output token cap. With `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set, the limits and the daily cap are shared across every server instance (Upstash Redis, over its REST API); without them they are kept in memory per instance. If Redis is unreachable, requests are let through and a warning is logged.
- **Privacy:** questions go to the AI to grow new ones and are never stored or logged on the server; falls and habits live in the browser's localStorage. Once you've chosen a few times, your style lean and a few recent picks and skips are sent along with the question, so the AI can lean towards your taste (Deeper, Stranger) or write against it (Astray). Astray's embedding library and model weights come from jsDelivr and Hugging Face; no question text is sent to either.
- Requests run at low effort for responsiveness, with Anthropic's server-side refusal fallback enabled.

## Testing

| Command | What it checks |
|---|---|
| `npm run lint` | ESLint (Next.js core web vitals and TypeScript rules) |
| `npm run typecheck` | TypeScript, including the tests |
| `npm test` | Jest: the logic (AI stream parsing, the rabbit's self-test, the anti-recommender, habits, safety, rate limits, the question tree, validation) in Node, and the components (tour, share sheet, Look up, controls, landing page) in jsdom with React Testing Library |
| `npm run test:e2e` | Playwright: real browser journeys on desktop and phone, against a production build on port 3100. The AI is mocked in the browser, so no API key and no cost. Run `npx playwright install chromium` once first. |

CI (`.github/workflows/ci.yml`) runs all four plus a production build on every push to `main` and every pull request, and uploads the Playwright report when an end-to-end test fails.

## Structure

```text
app/
├── api/
│   ├── questions/          # Streams questions (or answers) as NDJSON
│   └── rabbit/             # Streams the rabbit's self-test: a question only you can answer
├── explore/
│   └── [sessionId]/        # Client-only exploration route; falls persist in localStorage
├── globals.css             # Global styles and theme
├── icon.svg                # App favicon
└── layout.tsx              # Root layout

components/
├── branding/               # Logo, RabbitIcon, RabbitGuide (loader, ears, footprints)
├── landing/                # LandingPage, BeginJourney, ThoughtInput, JumpIn
└── fall/                   # Core exploration experience
    ├── FallView
    ├── Tunnel               # Canvas-based tunnel
    ├── GravityToggle
    ├── LookUp
    ├── HabitMirror
    ├── AstrayGhosts
    ├── RabbitAsks
    ├── Tour
    ├── CareNote
    └── useSteer

lib/
├── astray/                 # Territories, habit model, on-device embedder,
│                           # and the inverted recommender
├── audio/                  # FallAudio (Web Audio synth) and useFallAudio
├── ai/                     # Provider abstraction, prompts, generators (server-only)
├── schemas/                # Zod schemas for requests and streamed events
├── session/                # Question tree helpers and useExplorationSession hook
├── storage/                # SessionStore abstraction (localStorage implementation)
├── explore/
│   └── client.ts            # Browser-side API calls
└── content/                # Landing page example prompts

public/
└── astray/                 # Embedding Web Worker
```

## Brand tokens

Defined in `app/globals.css` under `@theme` and usable as Tailwind classes:
`midnight`, `violet`, `lavender`, `ice` (Go Deeper), `pink` (Go Stranger), `lavender` (Go Astray), `soft`, `muted`.
Fonts: `font-display` (Space Grotesk), `font-sans` (Inter), `font-serif` (DM Serif Display).
