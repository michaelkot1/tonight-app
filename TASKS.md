# TASKS.md — Tonight

Active milestone: **Phase 1 — Data model & backend**

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

## Phase 1 — Data model & backend

- [x] Supabase schema + RLS (`profiles`, `follows`, `service_catalog`, `user_services`, `titles`, `ratings`, `invites`) — 7 migrations `phase1_*`
- [x] Auto-create profile on `auth.users` insert (trigger `handle_new_user`)
- [x] `titles` TMDB/OMDb cache with `providers` + `providers_fetched_at` TTL marker (US per Q4); client read-only, service-role ingestion
- [x] Two-way invite auto-connect via `accept_invite(code)` security-definer RPC
- [x] RLS verified; `get_advisors` (security + performance) clean of ERRORs/actionable WARNs
- [x] Generated TypeScript types → `src/lib/database.types.ts`, wired into typed client (`SupabaseClient<Database>`)
- [ ] Owner: seed/verify TMDB provider ids in `service_catalog` during ingestion phase

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
