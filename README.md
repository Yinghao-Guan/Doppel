# 🏆 AthleteTwin

> **Train smarter by testing your future first.**

A digital twin of your athletic performance. Your camera captures how you train today; your AI twin predicts how you'll perform two weeks from now — and lets you A/B test training plans before doing them.

Built for **BroncoHacks 2026** — Sports & Fitness track.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in API keys
npm run dev
```

Open <http://localhost:3000>.

## Stack

- Next.js 15 (App Router) + React 19
- MediaPipe Tasks Vision (in-browser pose detection)
- Recharts (radar + growth curves)
- Tailwind + Framer Motion
- Zustand (global state)
- Anthropic Claude / Google Gemini (coaching LLM)
- ElevenLabs (voice coaching)

## Team workflow

See [OWNERSHIP.md](./OWNERSHIP.md) — who owns which folder, what each person produces, and the shared type contracts in [`types/index.ts`](./types/index.ts).

## Devpost categories

- **Track:** Sports & Fitness
- **Prize:** Best Use of AI/ML
- **Sponsor:** Best Use of Vercel V0
