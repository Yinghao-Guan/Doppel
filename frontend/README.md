# Doppel — Frontend

> Train smarter by testing your future first.

The web client for **Doppel**, a digital-twin athletic performance app.
Doppel uses real-time pose CV + ML simulation to predict how you'll perform 14 days from now — before you train.

This package is the user-facing webapp. The ML / CV / API services live in sibling worktrees owned by the rest of the team.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — theme + glass utilities in `src/app/globals.css`
- **react-three-fiber** + drei + postprocessing — hero scene with custom GLSL shader
- **GSAP** — master timeline for hero text reveal
- **anime.js** — small ambient effects (status dots)
- **Space Grotesk** (display) + **Manrope** (body) + **JetBrains Mono** (eyebrow / data)

Aesthetic vibe: rim-lit shader hero (inspired by [qtzx06/darwin](https://github.com/qtzx06/darwin)) layered with glassmorphic UI (inspired by [Safkatul-Islam/noRot](https://github.com/Safkatul-Islam/noRot)) — violet → cyan accents on a near-black surface.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm lint
```

## Layout

```
src/
├── app/
│   ├── layout.tsx        ← fonts, root html
│   ├── page.tsx          ← landing route
│   └── globals.css       ← theme + .glass utilities
├── components/
│   ├── HeroOverlay.tsx   ← text + CTAs (GSAP + anime.js)
│   └── hero/
│       ├── HeroScene.tsx ← R3F <Canvas> + lights + bloom + vignette
│       └── TwinOrb.tsx   ← displaced icosahedron + custom GLSL
└── lib/
    └── utils.ts          ← cn() helper
```

## Worktree

This folder lives on the `doppel-frontend` branch in a sibling worktree of the main repo:

```
BroncoHacks/                       ← main worktree (main branch)
BroncoHacks-doppel-frontend/       ← this worktree (doppel-frontend branch)
└── frontend/
```

Teammates create their own worktrees with:

```bash
# from the main BroncoHacks repo
git worktree add -b <branch-name> ../BroncoHacks-<feature> main
```

## Project spec

See `~/Downloads/message.txt` (root spec — originally titled "AthleteTwin").
