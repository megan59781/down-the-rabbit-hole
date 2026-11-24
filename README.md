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
app/                 routes, layout, global theme (globals.css), favicon (icon.svg)
components/branding  Logo, RabbitIcon
components/landing   LandingPage, ThoughtInput
lib/types            shared domain types (sessions, mutations, simulations, questions)
```

## Brand tokens

Defined in `app/globals.css` under `@theme` and usable as Tailwind classes:
`midnight`, `violet`, `lavender`, `ice` (Go Deeper), `pink` (Go Stranger), `soft`, `muted`.
Fonts: `font-display` (Space Grotesk), `font-sans` (Inter), `font-serif` (DM Serif Display).

## Build progress

- [x] Gate 1 — Project foundation
- [ ] Gate 2 — Brand and frontend (mock data)
- [ ] Gate 3 — AI integration
- [ ] Gate 4 — Interactive simulation engine
- [ ] Gate 5 — Exploration spiral
- [ ] Gate 6 — Testing and polish
- [ ] Gate 7 — Deployment and handover
