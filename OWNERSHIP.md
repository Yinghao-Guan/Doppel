# AthleteTwin — Ownership Map

**Rule of the hackathon:** if your name is on a folder, you are the only one who edits files inside it. Need to talk across the boundary? Use `types/index.ts` (the shared contract). Add fields there first, announce in chat, then implement.

---

## Person 1 — CV / Pose Pipeline

**You own:**
- `frontend/src/components/capture/PoseCamera.tsx`
- `frontend/src/components/capture/SkeletonOverlay.ts`
- `frontend/src/components/capture/CapturePanel.tsx`
- `frontend/src/components/capture/CameraError.tsx`
- `frontend/src/components/capture/FormPill.tsx`
- `frontend/src/lib/pose/*`

**You produce:** a `TrainingFingerprint` (see `types/index.ts`) emitted via `useAthleteStore.setFingerprint(...)` when the user finishes a set.

**You consume:** nothing — you are the input layer.

**MVP target (hour 6):** browser camera → MediaPipe pose landmarks → skeleton drawn on canvas → rep counter for squats works.

**Stretch (hour 10):** form score, asymmetry, fatigue trend.

---

## Person 2 — Prediction Engine + LLM Coach

**You own:**
- `frontend/src/lib/predict.ts` (frontend normalization)
- `frontend/src/lib/coach-prompts.ts`
- `frontend/src/lib/coach-client.ts`
- `frontend/src/lib/coach-types.ts`
- `frontend/src/lib/gemini.ts`
- `frontend/src/app/api/coach/what-if/route.ts`
- `frontend/src/app/api/coach/generate-plan/route.ts`
- `frontend/src/app/api/coach/compare-plans/route.ts`
- `frontend/src/app/api/predict/route.ts`
- `backend/` (FastAPI + ML predict.py)

**You produce:** a `Projection` and `CoachAdvice` from `(UserProfile, TrainingFingerprint, TrainingPlan)`.

**You consume:** `UserProfile` (from store), `TrainingFingerprint` (from store).

**MVP target (hour 6):** `simulate()` returns realistic-looking, input-dependent projections. No constants — every output must move when an input moves.

**Stretch (hour 10):** LLM coaching with cited rationale per number, ElevenLabs voice.

---

## Person 3 — Frontend / Dashboard / UX

**You own:**
- `frontend/src/app/page.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/app/proof/page.tsx`
- `frontend/src/app/what-if/page.tsx`
- `frontend/src/components/dashboard/*`
- `frontend/src/components/readiness/*`
- `frontend/src/components/hero/*`
- `frontend/src/components/twin/*`
- `frontend/src/components/Landing*.tsx`, `PageShell.tsx`, `TopNav.tsx`, `SplashScreen.tsx`, etc.

**You produce:** the polished UI everyone sees. You wire the camera component (Person 1) and the simulator component (Person 4) into the page layout. You build the profile form and projection cards.

**You consume:** the global store (`lib/store/useAthleteStore.ts`).

**MVP target (hour 8):** profile form → camera card → projection card → radar chart, all dark-mode polished using the Tailwind tokens.

**Stretch (hour 14):** smooth Framer Motion transitions, V0-generated component variants for micro-polish.

---

## Person 4 — Simulator / Plan Comparison

**You own:**
- `frontend/src/components/simulate/SimulatePanel.tsx`
- `frontend/src/components/whatif/WhatIfPanel.tsx`
- `frontend/src/components/proof/ProofPanel.tsx`

**You produce:** the "flight simulator" wow moment — A/B/C plan toggle, what-if sliders that re-trigger `simulate()` instantly, recharts growth curve.

**You consume:** `simulate()` from `lib/prediction/engine.ts` (Person 2's API). You only call the function — never reach inside its formulas.

**MVP target (hour 8):** three preset plans render side-by-side cards with deltas.

**Stretch (hour 12):** sliders + live re-simulation + curves chart.

---

## Shared (don't edit without team-wide agreement)

- `types/index.ts` (root) and `frontend/src/types/*` — data contracts
- `frontend/src/lib/athlete-store.ts` — global zustand store
- `frontend/src/lib/profile-store.tsx` — profile context
- `frontend/src/lib/utils.ts` — helpers
- `frontend/package.json`, `frontend/tsconfig.json`, `frontend/next.config.ts`, `tailwind.config.ts` — build config
- `frontend/src/middleware.ts` — request middleware (CSP, Origin checks)
- `solana/athlete-proof/programs/athlete-proof/src/lib.rs` — on-chain program

---

## Workflow rules

1. Branch per person: `git checkout -b p1-cv`, `p2-prediction`, `p3-ui`, `p4-sim`.
2. PR to `main` every 2 hours. Small, frequent merges > one giant merge at hour 22.
3. If you need to add a field to a shared type, message the team first.
4. Run `npm run typecheck` before pushing. Broken types break everyone.
