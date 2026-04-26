# Doppel

> **Train smarter by testing your future first.**

A digital twin of your athletic performance. Point your camera at 5–10 reps — dopplegang captures your movement fingerprint, runs it through a machine-learning model, and predicts how you'll perform two weeks from now. Then A/B test three different training plans before you commit to any of them.

Built for **BroncoHacks 2026**.

**Track:** Sports & Fitness  
**Prize:** Best Use of AI/ML  
**MLH:** Best Use of Gemma 4 · Best Use of Solana

---

## How it works

```
Camera → MediaPipe Pose → Training Fingerprint
                                  ↓
              User Profile + CV signals → RandomForest ML Model
                                  ↓
        Readiness · Strength · Endurance · Injury Risk scores
                                  ↓
              Simulate Plan A/B/C → 14-day growth curves
                                  ↓
        Submit on-chain proof → Earn NFT badge (Solana devnet)
```

1. **Capture** — MediaPipe tracks 33 body landmarks in real time. The rep counter watches knee angle for squat depth; form score is derived from joint-angle variance. After your set, the app has your training fingerprint: reps, form, range of motion, tempo, asymmetry, fatigue trend, and injury-risk flags.

2. **Predict** — A multi-output `RandomForestRegressor` (200 trees, trained on real athlete data augmented with synthetic CV features) outputs four scores — readiness, strength potential, endurance potential, and injury risk — as 0–100 percentiles.

3. **Simulate** — Adjust frequency, intensity, and cardio ratio with sliders. The model reruns instantly for Plan A (strength-heavy), Plan B (balanced), and Plan C (cardio-heavy), overlaid as 14-day growth curves.

4. **Prove & Earn** — Connect Phantom wallet, sign in with your Ed25519 key, and submit an on-chain training proof (SHA-256 hash of your workout). Hit milestones → claim an NFT badge minted live on Solana devnet.

---

## Quick start

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.11+
- (Optional) Rust + Anchor CLI — only needed to redeploy the Solana program

### 1. Install dependencies

```bash
# Root + frontend
npm install
pnpm --dir frontend install

# Backend
cd backend && pip install -r requirements.txt && cd ..
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local               # root / frontend API keys
cp frontend/.env.local.example frontend/.env.local
# backend/.env is tracked with placeholder values — fill in your keys
```

Key variables:

| Variable | Where | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | `frontend/.env.local` | Gemma 4 — live coaching |
| `ELEVENLABS_API_KEY` | `frontend/.env.local` | ElevenLabs TTS — voice coach |
| `ELEVENLABS_VOICE_ID` | `frontend/.env.local` | Voice ID (e.g. `21m00Tcm4TlvDq8ikWAM` for Rachel) |
| `BADGE_MINTER_SECRET_KEY` | `backend/.env` | 64-byte Solana keypair array for NFT minting |
| `BADGE_BASE_URL` | `backend/.env` | Base URL served for NFT metadata (default `http://localhost:8000`) |
| `NEXT_PUBLIC_BACKEND_URL` | `backend/.env` | Backend URL visible to the browser (default `http://localhost:8000`) |

### 3. Run services

```bash
# Terminal 1 — frontend (http://localhost:3000)
npm run dev

# Terminal 2 — backend (http://localhost:8000)
cd backend && uvicorn main:app --reload
```

Open `http://localhost:3000`. The hero page walks you through the flow.  
Add `?demo=1` to the URL to skip the camera and auto-generate a sample fingerprint.

---

## Architecture

```
BroncoHacks/
├── frontend/                    # Next.js 16 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing → Capture → Twin flow
│   │   │   └── api/
│   │   │       ├── coach/       # Server route: Gemma 4 coaching LLM
│   │   │       └── voice/       # Server route: ElevenLabs TTS
│   │   ├── components/
│   │   │   ├── capture/         # PoseCamera, SkeletonOverlay, CoachCaption
│   │   │   ├── readiness/       # ScoreQuadrant, SignalRadar, SummaryCard
│   │   │   ├── simulate/        # PlanCards, GrowthCurve, sliders
│   │   │   ├── proof/           # ProofPanel, badge display
│   │   │   └── hero/            # Three.js rim-lit orb (HeroScene, TwinOrb)
│   │   └── lib/
│   │       ├── pose/            # MediaPipe analyzer, landmark types, constants
│   │       ├── athlete-store.ts # Zustand: fingerprint state (persisted)
│   │       ├── profile-store.ts # Zustand: user profile (persisted)
│   │       ├── predict.ts       # API client → backend /predict
│   │       ├── gemini.ts        # Gemma 4 SDK wrapper
│   │       ├── voice-client.ts  # ElevenLabs TTS
│   │       └── solana.ts        # Anchor IDL client, RPC config
│   └── scripts/
│       └── mint-badge.mjs       # Node.js NFT minter (Solana devnet)
│
├── backend/                     # FastAPI + SQLite + ML
│   ├── main.py                  # App entry point, all routes
│   ├── db.py                    # SQLite helpers (athlete.db)
│   ├── badges.py                # Milestone rules + eligibility logic
│   ├── proof.py                 # SHA-256 proof hashing
│   └── ml/
│       ├── predict.py           # Inference engine (loads .pkl, normalizes input)
│       ├── train_model.py       # RandomForest training script
│       ├── generate_labels.py   # Synthetic target generation
│       └── generate_cv_features.py
│
├── solana/athlete-proof/        # Anchor program (Rust)
│   └── programs/athlete-proof/
│       └── src/lib.rs           # 4 instructions, 4 PDA account types
│
├── types/index.ts               # Shared TypeScript contracts (team-wide)
├── OWNERSHIP.md                 # Who owns what + branching strategy
└── render.yaml                  # Render.com backend deployment config
```

---

## Tech stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4, custom glass utilities |
| State | Zustand (localStorage-persisted) |
| 3D / FX | Three.js, @react-three/fiber, GSAP, anime.js |
| Charts | Recharts (radar, line) |
| Pose detection | MediaPipe Tasks Vision — pose_landmarker_lite |
| LLM coaching | Gemma 4 |
| Voice coach | ElevenLabs TTS |
| Wallet | Phantom via @solana/wallet-adapter |
| Blockchain client | @coral-xyz/anchor, @solana/web3.js, @solana/spl-token |
| Icons | Lucide React |
| Fonts | Space Grotesk · Manrope · JetBrains Mono |

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111+ |
| Server | Uvicorn (ASGI) |
| Database | SQLite 3 (`athlete.db`) |
| ML | scikit-learn — `RandomForestRegressor` (multi-output, 200 trees) |
| Auth / Crypto | PyNaCl (Ed25519 verification), base58 |
| Serialization | Pickle (model), JSON (feature schema) |

### Blockchain

| Layer | Technology |
|---|---|
| Network | Solana Devnet |
| Program | Rust + Anchor 0.32.1 |
| Token standard | SPL Token (NFT-grade: decimals = 0) |
| Program ID | `A6KXpSqEwEUJyQwFcgM2fSptHjmXHUMyijb2ihAc2hjd` |

---

## API reference

Base URL: `http://localhost:8000`

### Auth (wallet sign-in)

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/nonce` | Request a login nonce for a wallet |
| `POST` | `/auth/verify` | Verify Ed25519 signature → session token |

### Prediction

| Method | Path | Description |
|---|---|---|
| `POST` | `/predict` | Run ML model; returns 4 scores + signals + coaching copy |

**Input** — user profile fields + CV fingerprint fields (flexible aliasing, missing fields filled with healthy defaults).  
**Output** — `{ readiness_score, injury_risk_score, strength_potential_score, endurance_potential_score, signals, summary, explanations, recommendations }`

### Training records

| Method | Path | Description |
|---|---|---|
| `POST` | `/training/save` | Save workout + compute SHA-256 proof hash |
| `GET` | `/training/records/{wallet}` | Fetch all records for a wallet |

### Badges

| Method | Path | Description |
|---|---|---|
| `GET` | `/badges/catalog` | List all badge definitions |
| `GET` | `/badges/{wallet}` | User badge status (eligible, claimed, progress) |
| `POST` | `/badges/claim` | Claim badge → triggers on-chain NFT mint |
| `GET` | `/badge-metadata/{badge_id}.json` | OpenSea-standard NFT metadata |
| `GET` | `/badge-art/{badge_id}.svg` | Dynamic SVG badge artwork |

---

## Machine learning

**Model:** `RandomForestRegressor` — 200 estimators, max depth 10, multi-output.

**Training pipeline:**
1. Real athlete profiles from `data/raw/fitness.csv`
2. Synthetic CV features generated by `generate_cv_features.py` (form, depth, tempo, fatigue, asymmetry, risk signals)
3. Target labels computed by `generate_labels.py` (hand-written domain formulas)
4. `DictVectorizer` handles one-hot encoding of categoricals (Gender, Workout_Type, Experience_Level)

**Input features (23):** Age, Gender, Height, Weight, BMI, BPM metrics (max/avg/resting), session duration, calories, workout type, fat %, water intake, frequency, experience level + 8 CV movement signals.

**Outputs:**

| Score | Meaning |
|---|---|
| `readiness_score` | Energy/recovery readiness today (0–100) |
| `injury_risk_score` | Relative injury risk (0–100, lower is better) |
| `strength_potential_score` | Strength gain potential over 14 days (0–100) |
| `endurance_potential_score` | Endurance gain potential over 14 days (0–100) |

To retrain: `cd backend && python ml/train_model.py`

---

## Blockchain / badge system

The Solana smart contract (`solana/athlete-proof/`) is written in Rust using the Anchor framework and deployed on Solana Devnet. It handles on-chain athlete profiles, immutable training proofs, and badge NFT claims — all gated by PDA-based access control.

### On-chain accounts (PDAs)

| Account | Seeds | Stores |
|---|---|---|
| `AthleteProfile` | `["profile", user_pubkey]` | Total workouts, best form score, created_at |
| `TrainingProof` | `["proof", user_pubkey, workout_count]` | Exercise, reps, form, proof hash, timestamp |
| `BadgeConfig` | `["badge-config"]` | Singleton authority for badge claims |
| `BadgeAccount` | `["badge", user_pubkey, badge_id]` | Badge ID, mint address, metadata URI, claimed_at |

### Badge milestones

| Badge | Rule |
|---|---|
| Proof Starter | Submit your first verified workout |
| Consistency 10 | Accumulate 10 total proof submissions |
| Form Elite | 3+ workouts with ≥ 90 form score |
| Streak 7 | 7 consecutive days of workouts |

Each badge generates a dynamic SVG, OpenSea-compatible metadata, and an SPL token NFT on devnet.

### Auth flow

```
Browser                          Backend
  │── POST /auth/nonce ─────────────▶ generate 32-byte nonce (5 min TTL)
  │◀─────────────────── { nonce } ───┤
  │   (user signs nonce in Phantom)  │
  │── POST /auth/verify ─────────────▶ PyNaCl Ed25519 verify
  │◀───────────── { token, wallet } ─┤
```

---

## Database schema

SQLite file: `backend/athlete.db`

```sql
-- Workout history + on-chain proofs
CREATE TABLE training_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  exercise TEXT NOT NULL,          -- "squat" | "pushup" | "deadlift"
  reps INTEGER NOT NULL,
  form_score INTEGER NOT NULL,     -- 0–100
  fatigue_score INTEGER NOT NULL,
  strength_delta INTEGER NOT NULL,
  endurance_delta INTEGER NOT NULL,
  injury_risk_delta INTEGER NOT NULL,
  proof_hash TEXT NOT NULL,        -- SHA-256 of canonical JSON
  timestamp INTEGER NOT NULL
);

-- NFT badge claims
CREATE TABLE badge_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  badge_account TEXT NOT NULL DEFAULT '',  -- PDA address
  mint_address TEXT NOT NULL,
  tx_signature TEXT NOT NULL,
  metadata_uri TEXT NOT NULL,
  claimed_at INTEGER NOT NULL,
  UNIQUE(wallet, badge_id)
);

-- Nonce store for wallet auth
CREATE TABLE nonces (
  wallet TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

---

## Live demo

Deployed at **https://bronco-hacks-delta.vercel.app/**
