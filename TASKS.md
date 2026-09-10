# TASKS.md — Tonight

Active milestone: **Phase 0 — Foundations & scaffolding**

Work on feature branches (`cursor/...`), never directly on `main`. Companion docs: `plan.md`, `spec.md`, `design.md`.

## Phase 0 — Foundations

- [x] Scaffold Expo TypeScript app with Expo Router (`src/app/`)
- [x] Install core deps (`expo-router`, Supabase, Secure Store, TanStack Query, Linking, Image, fonts)
- [x] Encode `design.md` tokens into `src/theme/`
- [x] Load Bricolage Grotesque + Inter via Expo Google Fonts
- [x] Env plumbing: `.gitignore`, `.env.example`, typed `src/lib/env.ts`
- [x] Nav shell: JS Tabs + Decider FAB (Home / Decider / Profile placeholders)
- [x] Root `QueryClientProvider` + env-gated Supabase stub
- [x] Housekeeping: `AGENTS.md`, deferred R3F note, `TASKS.md`
- [ ] Owner: fill local `.env` with Supabase URL/anon (never commit)
- [ ] Owner: smoke-test on device / Expo Go

## Phase 1 — Data model & backend (stub)

- [ ] Supabase schema + RLS
- [ ] TMDB cache strategy
- [ ] Generated TypeScript types

## Phase 2 — Auth & onboarding (stub)

- [ ] Apple / Google OAuth via Supabase
- [ ] Profile + streaming services

## Phase 3 — Home & title surfaces (stub)

- [ ] Home rails / Tonight's pick
- [ ] Title detail + ratings

## Phase 4 — Friends & invites (stub)

- [ ] Invites, follows, social graph

## Phase 5 — Decider (stub)

- [ ] Ranking model + Top 3 UX

## Phase 6 — Polish & release (stub)

- [ ] Ambient polish (R3F vs Skia decision)
- [ ] EAS / TestFlight
