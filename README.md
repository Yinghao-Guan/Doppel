# doppel

train smarter by testing your future first

doppel builds an AI digital twin of your athletic performance. real-time pose detection plus predictive modeling shows how you'll perform 14 days from now, before you train.

## tech stack

- next.js 16 with react 19
- three.js for 3d visualization
- tailwind css + postcss
- typescript
- pose detection via computer vision
- predictive ml models

## getting started

### setup

```bash
pnpm install
```

### development

```bash
pnpm dev
```

runs the dev server at http://localhost:3000

### build

```bash
pnpm build
pnpm start
```

### lint

```bash
pnpm lint
```

## project structure

```
frontend/
  src/
    app/           - next.js app router and layouts
    components/    - react components (hero, capture, ui)
    lib/           - utilities and state management
    types/         - typescript type definitions
```

## features

- landing page with 3d animations and hero overlay
- accent color customization
- persistent backdrop state management
- pose capture and analysis
- performance prediction
- athlete profile system

## requirements

- node 18+
- pnpm
