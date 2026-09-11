# TASKS.md — Tonight

Active milestone: **Phase 4 — Friends & invites** on `cursor/phase-4-friends-invites` (base: `cursor/phase-3-titles-home`)

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

## Phase 2 — Auth & onboarding

- [x] `AuthProvider` + session persistence (SecureStore) + email/password sign-in/up
- [x] Route groups `(auth)` / `(onboarding)` / `(tabs)` + 3-way redirect guard (`onboarded_at`)
- [x] Reusable token-driven components: Button, TextInput, Chip, ServiceGrid, OnboardingScaffold
- [x] Onboarding flow (ordered): services (required) → taste-seed (placeholder/skip) → @handle (required + availability) → watch-with → invite (share link) → notifications (value-framed, no OS prompt) → stamp `onboarded_at` → Home
- [x] Persist to `profiles` / `user_services`; handle format `{3,20}[a-z0-9_]` + `is_handle_available`
- [x] Profile: Sign out + Delete account (`delete-account` Edge Function → signOut)
- [x] Env placeholders for future Google client IDs (optional)
- [ ] **Deferred (owner):** Apple + Google OAuth wiring (credentials + likely dev client)
- [ ] **Deferred (owner):** `expo-notifications` OS permission ask
- [ ] **Deferred (owner):** `expo-contacts` match; real per-user invite codes (Phase 4)
- [ ] **Deferred:** real TMDB taste-seed ratings (Phase 3)
- [ ] Owner: smoke-test email auth + onboarding end-to-end in Expo Go
- [ ] Owner: provide Apple/Google OAuth credentials when ready to wire

## Phase 3 — Titles, rating gesture & Home

### Wave 1 — ingest + data layer + primitives
- [x] Edge Function `tmdb-search` (auth JWT): proxy TMDB multi-search, upsert lightweight `titles`, return UUID + poster fields
- [x] Edge Function `tmdb-title` (auth JWT): ensure/enrich one title (details + US providers + OMDb IMDb/RT), upsert full cache row
- [x] Typed JSON helpers for `genres` / `providers` / `top_cast` / `keywords`
- [x] Hooks: `useTitleSearch`, `useTitle`, `useRateTitle`, `useMyRatings` (TanStack Query; mirror `use-profile` patterns)
- [x] `RatingGesture` / verdict control (Loved / Liked / Meh) using theme tokens + `verdict` enum
- [x] `PosterCard` + `PosterRail` (160×240, r16) and `HeroCard` (Tonight’s pick, 362×452, r24) per `design.md`

### Wave 2 — screens + Home + taste-seed
- [x] Edge Function `tmdb-popular` (auth JWT): TMDB trending (movie + tv), upsert lightweight `titles`; hook `usePopularTitles`
- [x] Search screen pushed from Home header (debounced query → open detail); hidden `(tabs)/search` route
- [x] Title detail route (`title/[id]`, hidden tab) with metadata, IMDb/RT/TMDB scores, US providers, rating control
- [x] Home: For You + search affordance + Tonight’s pick hero + Popular / Your ratings / More to explore rails (interim pick heuristic)
- [x] Onboarding taste-seed: real TMDB popular titles + rating gesture (replace Phase 2 placeholder)
- [x] Verify: `tsc`, `expo lint`, `expo export --platform ios` clean; Edge Functions deployed via Supabase MCP
- [ ] **Owner (secrets):** set Supabase Edge Function secrets `TMDB_READ_ACCESS_TOKEN` (or `TMDB_API_KEY`) + `OMDB_API_KEY` so `tmdb-*` return live data

## Phase 4 — Friends & invites

### Wave 1 — invite path + graph + Profile friends
- [x] Migration RPC `create_or_get_my_invite()` (durable reusable code per user; `expires_at` null)
- [x] Regenerate / update `src/lib/database.types.ts` for new RPC
- [x] Hooks: `useMyInvite`, `useAcceptInvite`, `useFollow` / `useUnfollow`, `useFollowing`, `useSearchProfiles` (TanStack; mirror `use-profile` / `use-titles`)
- [x] Pending invite code in SecureStore + flush `accept_invite` once session exists
- [x] Deep-link route `invite/[code]` + `routes.invite` / `routes.friends`
- [x] Replace onboarding invite placeholder with real `useMyInvite` + Share URL
- [x] Friends screen (from Profile): share invite, @handle search → follow, Following list → unfollow
- [x] Profile entry point → Friends
- [x] Verify: `tsc`, `expo lint`, `expo export --platform ios` clean

### Wave 2 — contacts + ambient feed (after Wave 1)
- [ ] Contacts match Edge Function + `expo-contacts` (permission copy) — deferred identity match vs `auth.users`
- [ ] Home/detail: friend piles / social lines from followed ratings
- [ ] Optional: clipboard copy-link polish

## Phase 5 — Decider (stub)

- [ ] Ranking model + Top 3 UX

## Phase 6 — Polish & release (stub)

- [ ] Ambient polish (R3F vs Skia decision)
- [ ] Notifications triggers + OS permission (from Phase 2 deferral)
- [ ] EAS / TestFlight
