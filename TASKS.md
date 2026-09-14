# TASKS.md — Tonight

Active milestone: **Phase 5 — Decider** on `cursor/phase-5-decider` (base: `cursor/phase-4-friends-invites`)

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
- [x] **Moved to Phase 4:** `expo-contacts` match + real per-user invite codes (Wave 1–2)
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
- [x] Search screen pushed from Home header / Browse (debounced query → open detail); root Stack route `search` (above `(tabs)`, so Back returns to the opener)
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
- [x] Contacts match Edge Function (`match-contacts`) + service-role RPC `match_profiles_by_emails` + `expo-contacts` (permission copy) on Friends + optional onboarding invite
- [x] Home/detail: friend piles / social lines from followed ratings (`FriendPile`, Loved-first copy)
- [ ] Optional: clipboard copy-link polish — **skipped** (Share already works; timeboxed)
- [x] Verify: `tsc`, `expo lint`, `expo export --platform ios` clean; Edge Function deployed via Supabase MCP
- [ ] **Owner smoke-test:** contacts match → Follow; Home/detail ambient piles with two accounts

## Phase 5 — Decider

### Wave 1 — ranking Edge + Setup → Results UX
- [x] Edge Function `decider-rank` (`verify_jwt`): group taste profile, eligibility (unwatched + services union + media/genre), score weights from plan.md, Top N for shuffle; batch-enrich / popular ingest when pool thin
- [x] Client `src/lib/decider.ts` (types + invoke) + `useDeciderRank` mutation hook
- [x] Replace `DeciderScreen`: strip Phase 4 friend-admin chrome; Setup (Tonight/Decide hero, avatar multi-select self+following, Movie/TV/Both + genre chips, Decide CTA) → Results (#1 HeroCard + #2/#3 PosterCards, why-picked, IMDb/RT, service badges, FriendPile, Shuffle, title deep-link)
- [x] Setup UX: wrap genre chips (no horizontal scroll); pin “Find tonight's picks” above tab bar (`spacing.navContent` footer)
- [x] Service labels via `service_catalog.tmdb_provider_id` (keyword `matchServices` fallback on Edge)
- [x] Update `plan.md` Phase 5 status note (Wave 1 on branch; pending smoke-test) — do **not** mark Phase 5 complete until exit criteria met
- [x] Verify: `tsc`, `expo lint`, `expo export --platform ios`
- [ ] **Owner smoke-test:** solo + with friend; filters; shuffle; empty cold-start copy; confirm Edge secrets TMDB/OMDb if enrich path needed
- [ ] **Exit criteria (pending):** correct on-service Top 3 for real friend/rating data with why-picked + ratings + service label

## Browse tab (UI shell)

- [x] Visible Search tab (`Home → Decide FAB → Search`; route still `browse`; Saved/Profile/Friends hidden): search → `routes.search`, genre chips (local select), 2×2 category cards — on `cursor/browse-tab` (carried on `cursor/saved-tab`)
- [ ] Wire genre filter + category destinations to real feeds/APIs

## Saved tab

- [x] Visible Saved tab shell (`bookmark-outline`, empty-state copy) — on `cursor/saved-tab`
- [x] Persist saves + wire list / title save affordances — on `cursor/bookmarks-saved` (`saves` table self-only RLS; `useMySaves` / `useToggleSave`; bookmark on detail + posters/hero/search/decider; Movies | TV list)

## Phase 6 — Polish & release (stub)

- [ ] Ambient polish (R3F vs Skia decision)
- [ ] Notifications triggers + OS permission (from Phase 2 deferral)
- [ ] EAS / TestFlight
