# PLAN.md — Tonight (phased build plan)

> Working proposal from the orchestrator. Companion docs: [`spec.md`](spec.md), [`design.md`](design.md), [`AGENTS.md`](AGENTS.md).
> Status: **Phase 2 auth & onboarding client foundation complete on `cursor/phase-2-auth-onboarding` (email auth, route guard, full onboarding UI + persistence, profile sign-out/delete). Apple/Google OAuth + notifications OS prompt + contacts deferred by owner until credentials/dev client. Phase 1 backend + Phase 0 foundations done.**

This plan is intentionally phased and top-down. Each phase produces reviewable, mergeable work on a feature branch (never `main`). Exploration → `scout`, implementation → `implementer`, review → orchestrator (main agent).

---

## Decisions (locked by owner)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Ranking algorithm for the Decider | **Netflix-style content-based recommender over the group's taste** — see "Decider ranking model" below. |
| Q2 | Auth methods for MVP | Apple + Google (OAuth via Supabase). Email/password as fallback. **Defer Phone** unless required. |
| Q3 | Streaming services in scope | Netflix, Max, Disney+, Prime Video, Hulu, Apple TV+, Peacock, Paramount+ (US). |
| Q4 | Region | US only for availability + provider data (`watch/providers?region=US`). |
| Q5 | Source of IMDb + RT scores | **Confirmed: use OMDb API** (keyed by TMDB's IMDb ID) alongside TMDB, cached in Supabase. Fall back to TMDB rating where OMDb data is missing. |
| Q6 | Deep-link strategy | **Deferred (post-MVP).** MVP shows *which service* a title is on (from TMDB providers) but does **not** deep-link into the app. No per-service scheme map for now. |
| Q7 | Friend visibility / privacy | Followers can see who they follow's ratings. No blocking in MVP. Revisit before launch. |

---

## Decider ranking model (Q1)

The Decider recommends like a streaming service's "for this group tonight" row: it builds a **combined taste profile** from everyone watching, then scores every eligible unwatched title by how similar it is to what the group has loved — genre first, then favorite actors, then other metadata.

**Inputs**
- Selected members' ratings (Loved / Liked / Meh) with weights: **Loved = +3, Liked = +1, Meh = −2**.
- TMDB metadata per title: genres, top cast, director/creator, keywords, popularity, TMDB rating.
- OMDb: IMDb + RT scores (quality signal).
- Eligibility filter: title is **unwatched by the whole group**, matches the Movie/TV/genre filter, and is on ≥1 present member's services.

**Step 1 — Build the group taste profile** (from rated titles across all selected members)
- `genreAffinity[g]` = sum of rating weights for titles carrying genre `g`, normalized.
- `actorAffinity[a]` = sum of rating weights for titles featuring actor `a` (favors actors they've watched most and loved).
- `keywordAffinity`, `directorAffinity` = same idea, lower weight.

**Step 2 — Score each eligible candidate title**
```
score =  w_genre   * genreMatch(title, groupProfile)      // primary signal
       + w_actor   * actorMatch(title, groupProfile)       // favorite-actor overlap
       + w_meta    * metadataMatch(title, groupProfile)    // keywords/director/similar-to
       + w_quality * qualityScore(imdb, rt, tmdb)          // OMDb/TMDB normalized 0–1
       + w_pop      * popularityPrior(tmdb)                 // small cold-start nudge
```
- Suggested starting weights: `w_genre 0.40, w_actor 0.25, w_meta 0.15, w_quality 0.15, w_pop 0.05` (tunable).
- `genreMatch` favors titles whose genres are **common across the deciders** (intersection-weighted), per owner intent.

**Step 3 — Return Top 3** by score, each with a why-it-was-picked line derived from the dominant term (e.g. "Because you both loved thrillers with Denzel Washington"), friend ratings, and IMDb + RT. **Shuffle** re-rolls to the next-ranked candidates.

**Cold start:** if the group has few ratings, lean on `w_quality` + `w_pop` and the required streaming-services filter until affinity data accrues.

*MVP simplification:* pure content-based scoring (above). Collaborative filtering across the whole user base is a post-MVP enhancement.

---

## Phase 0 — Foundations & scaffolding

**Goal:** A running Expo app skeleton with tooling, tokens, and CI-friendly structure. No features yet.

- Scaffold Expo (TypeScript, Expo Router) per `expo-project-structure` skill; strict `tsconfig`.
- Install core deps: `expo-router`, `@supabase/supabase-js`, `expo-secure-store`, TanStack Query, `expo-linking`, `expo-image`.
- Design tokens: encode `design.md` colors/fonts/spacing into a typed theme; load Bricolage Grotesque + Inter.
- Env plumbing: `.env` keys for Supabase URL/anon, TMDB, OMDb; typed config module (no secrets committed).
- Base navigation shell: bottom nav (Home / Decider FAB / Profile) with placeholder screens.
- Housekeeping: fix `AGENTS.md` (RN not Swift; correct `.cursor/scout.md` + `.cursor/implementer.md` paths); seed `TASKS.md`; clarify/remove stale `React_Three_Fiber_Rules.md` + "workout" references.

**Exit:** App builds and runs on iOS simulator; theme + nav render; lint/typecheck pass.

## Phase 1 — Data model & backend

**Goal:** Supabase schema + RLS backing all MVP features.

- Tables (via `apply_migration`): `profiles` (handle, name, avatar), `user_services`, `titles` (TMDB cache + IMDb/RT scores), `ratings` (user × title × loved/liked/meh), `follows` (directional), `invites`.
- RLS policies: users edit own rows; ratings readable by followers per Q7.
- TMDB ingestion strategy: on-demand fetch + cache into `titles`; provider availability cached with TTL.
- Generate TypeScript types (`generate_typescript_types`) into the client.

**Exit:** Schema migrated, RLS verified, types generated, advisors clean. ✅ **Done** — 7 `phase1_*` migrations; RLS on all 7 tables; `accept_invite` RPC for two-way connect; `is_following` helper for follower visibility; types in `src/lib/database.types.ts`. Only remaining advisor items: intentional `accept_invite` SECURITY DEFINER RPC (by design) and empty-DB unused-index INFOs.

## Phase 2 — Auth & onboarding

**Goal:** Full onboarding flow from `spec.md` §2.

- Supabase Auth: Apple + Google (+ email fallback) per Q2.
- Onboarding steps: streaming services (required) → taste seed (skippable) → username/@handle (required for social) → watch-with → invite → notifications ask → Home.
- Persist onboarding answers to `profiles` / `user_services`.
- Profile screen: Sign out + Delete account (full remote deletion — App Store requirement).

**Exit:** New user completes onboarding end-to-end; data persisted; delete-account wipes remote data.

**Status (2026-09-10):** ✅ **Client foundation done** on `cursor/phase-2-auth-onboarding` (uncommitted pending owner smoke-test / merge). Owner locked: email-first auth; defer notifications OS prompt + contacts; taste-seed = skip placeholder until Phase 3.
- Done: `AuthProvider` + SecureStore session; email sign-in/up; `(auth)`/`(onboarding)`/`(tabs)` groups + `onboarded_at` guard; token-driven Button/TextInput/Chip/ServiceGrid/OnboardingScaffold; full 6-step onboarding UI; persist to `profiles`/`user_services`; Profile Sign out + Delete via deployed `delete-account` Edge Function; `tsc` + `expo lint` + `expo export --platform ios` clean.
- Deferred: Apple/Google OAuth (needs credentials + likely dev client); `expo-notifications` OS ask; `expo-contacts`; real TMDB taste-seed (Phase 3); real per-user invite codes (Phase 4).

## Phase 3 — Titles, rating gesture & Home

**Goal:** The logging loop + Home feed.

- Search/browse titles (TMDB) and rate with Loved / Liked / Meh.
- Home: "For You" hero ("Tonight's pick"), poster rails, rating badges, ambient friend piles — matching `design.md` hero + rail specs.
- Poster rail + hero card components built to token spec (radii, scrims, sizes).

**Exit:** User can find, rate, and see titles; Home renders per design.

## Phase 4 — Friends & invites

**Goal:** Build the social graph.

- Invite link (two-way auto-connect), contacts match, @username search.
- Follow (one-way) management; friends surface in feed + Decider.

**Exit:** Two accounts can connect via each path; follows drive visibility.

## Phase 5 — The Decider (core feature)

**Goal:** The headline experience.

- Decider FAB → pick who's watching (solo/multi) → filter Movie/TV/Both + genre/All.
- Implement the **Decider ranking model** (Q1): build the group taste profile, score eligible unwatched titles, return **Top 3** with why-picked lines, friend ratings, and IMDb + RT (OMDb/TMDB).
- Show which **service** each pick is on (from TMDB providers). **No deep link in MVP** (Q6 deferred) — display the service badge/label only.
- Shuffle re-roll to next-ranked candidates.

**Exit:** Decider returns a correct, on-a-present-member's-service Top 3 for real friend/rating data, with why-picked + ratings + service label.

## Phase 6 — Polish, notifications & release prep

**Goal:** Ship-ready.

- Ambient background blooms / motion polish (evaluate R3F vs. Skia/gradients here — deferred notes in `docs/React_Three_Fiber_Rules.DEFERRED.md`).
- Notifications triggers (post-MVP candidate).
- Performance pass (FlashList, memoization per RN best-practices skill), empty/error/loading states.
- **Post-MVP enhancements:** streaming deep links (Q6), collaborative filtering across the user base (extends Q1 model).
- EAS build + TestFlight via `eas-app-stores` skill.

**Exit:** Internal TestFlight build; core loop demoable in <60s.

---

## Working agreement
- Each phase: `scout` explores → orchestrator drafts task → `implementer` builds on a feature branch → orchestrator reviews diff + tests before merge.
- `TASKS.md` tracks the active milestone's task list (created in Phase 0).
- Update this plan as open questions get answered.
