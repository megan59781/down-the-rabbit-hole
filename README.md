# DOWN THE RABBIT HOLE 🐇

*Follow a thought. See where it might take you.*

An AI-powered playground for exploring a thought: mutate it, simulate it, question it, follow the spiral.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Zod

## Run locally

```bash
npm install
cp .env.example .env.local   # AI keys, needed from Gate 3 onwards
npm run dev                  # http://localhost:3000
```

Checks:

```bash
npm run lint
npm run build
```

## Structure

```text
app/                       routes, layout, global theme (globals.css), favicon (icon.svg)
app/explore/[sessionId]    the exploration screen (client-only; sessions live in localStorage)
components/branding        Logo, RabbitIcon, RabbitGuide (loader, ears, footprints)
components/landing         LandingPage, BeginJourney, ThoughtInput
components/exploration     ExploreView, DirectionSelector, MutationExplorer, QuestionExplorer, ModeToggle
components/simulations     SimulationRenderer + Timeline, BranchingPaths, DominoEffect
components/trail           TrailMap (YOUR TRAIL)
lib/types                  shared domain types
lib/session                session tree helpers + useExplorationSession hook
lib/storage                SessionStore abstraction (localStorage implementation)
lib/explore/client.ts      generation calls used by the UI (demo content until Gate 3)
lib/mock                   labelled demo content
lib/content                landing page example prompts
```

## Brand tokens

Defined in `app/globals.css` under `@theme` and usable as Tailwind classes:
`midnight`, `violet`, `lavender`, `ice` (Go Deeper), `pink` (Go Stranger), `soft`, `muted`.
Fonts: `font-display` (Space Grotesk), `font-sans` (Inter), `font-serif` (DM Serif Display).

## Build progress

- [x] Gate 1 — Project foundation
- [x] Gate 2 — Brand and frontend (mock data)
- [ ] Gate 3 — AI integration
- [ ] Gate 4 — Interactive simulation engine
- [ ] Gate 5 — Exploration spiral
- [ ] Gate 6 — Testing and polish
- [ ] Gate 7 — Deployment and handover
