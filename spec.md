# SPEC.md 

# Product spec for Tonight
> Companion docs: [`design.md`](design.md) (visual system), [`AGENTS.md`](AGENTS.md) (ground rules).

---

## 1. Product Overview

Tonight is a social “what to watch” app that turns your friends’ real ratings into a shortlist you can actually stream tonight. Friends log movies and TV with a fast loved / liked / meh, and when you’re stuck you pick who you’re watching with, filter by type and genre, and get three titles on your shared services — ranked by friend taste and backed by IMDb and Rotten Tomatoes. One tap deep-links into Netflix, Max, and the rest so you decide in under a minute instead of scrolling for forty.


### 1.2 Platform & integrations

- **Client:** React Native, Expo.
- **Backend:** Supabase (auth, Postgres, storage) — user data, Movies, Tv Shows. MCP is connected under `supabase-tonight`
- **Api's** TMDB "https://developer.themoviedb.org/reference/getting-started"
---

## 1.3 Accounts & Authentication

- Users create an account to Supabase. **Sign In With Google or Sign in with Apple** is the primary method; email + password as a fallback. Auth happens via Supabase Auth.
- Onboarding answers are then associated with the user's account 
- Profile supports **Sign out** and **Delete account** (full remote data deletion — App Store requirement).
---

## 2. Onboarding

### 2.1 Flow

- Auth — Continue with Apple / Google / Phone so taste, friends, and pushes can save. No long account wall.
- Streaming services (required) — “Which of these do you pay for?” Multi-select logo grid (Netflix, Max, etc.). Only non-skippable setup step — the Decider only suggests what you can actually stream.
- Taste seed (skippable, nudged) — Rate a few popular movies/TV you’ve seen with ❤️ Loved / 👍 Liked / 😐 Meh. Fixes cold start and teaches the core gesture.
- Username — Pick an **@handle** so friends can find you. Auto-suggest from auth name; editable. Required before invite / search-for-friends paths.
- Watch-with *(skippable)* — Partner / Roommates / Friends / Solo chips. Primes defaults and invite copy.
- Invite (skippable) — Invite from contacts or share a link so the social graph (and Decider) isn’t empty.
- Notifications (skippable) — Value-framed ask first (“when something great lands on your services”), then the OS permission prompt.
- Land at Home page


## 3. Core Features
---

### 3. Watch Tonight Decider
- Pick who’s watching (solo or multi-select friends).
- Filter: **Movie / TV / Both**, then **genre or All**.
- Returns a **Top 3** shortlist with why-it-was-picked, friend ratings, IMDb + RT, and a **Watch on [service]** deep link.
- **Shuffle** re-rolls if the group isn’t feeling the three.

### 4. Friends & invites
- Follow via invite link, contacts match, **@username** search.
- Invite-link join auto-connects both ways; otherwise follow is one-way (no request friction for MVP).
- Friends are selectable in the Decider and appear in the feed.

### 5. Streaming services profile
- User marks which services they pay for (Netflix, Max, etc.).
- Decider only suggests titles available on at least one present member’s services.
- Services can be edited later in settings.

