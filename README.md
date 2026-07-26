# Khiem's personal dimension

An interactive personal site — a robot companion, four themed hubs, and a deliberate 404
gag where a job page should be. Not a resume.

## Develop

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build && npm run preview
```

## Stack

Vite + vanilla HTML/CSS/JS, no framework. Deployed on Vercel.

## Layout

```
docs/CONCEPT.md     design intent — read this first
src/
  lib/              framework-free helpers (path interpolation, canvas lighting)
  styles/           design tokens + base styles
  main.js           entry point
index.html          persistent shell: robot / scene / narrator layers
vercel.json         SPA rewrite so deep links resolve
```

## Status

Ground-up rebuild in progress on `rebuild-vanilla`. Phase 0 (reset + shell) is done; Phase 1
builds the router, scene renderer, robot, and narrator. The `main` branch holds a snapshot
of the previous Next.js implementation, kept for reference.
