# Issues

## ISSUE-001 — Map annotation not responding to taps

- Status: unresolved
- Location: `Views/MapView.swift`
- Problem: Map annotations appear correctly but tapping them does not trigger the expected action.
- Suspected cause: The annotation interaction may be conflicting with the current MapKit configuration.

### Attempts

#### Attempt 1
- Solution: Added a tap gesture directly to the annotation.
- Result: Failed.
- Reason: Gesture was not being triggered.

#### Attempt 2
- Solution: Changed the annotation implementation to use `MapAnnotation`.
- Result: Failed.
- Reason: Annotation displayed correctly but interaction still did not work.

### Current Understanding

The problem appears to be related to how the annotation interaction is configured rather than the annotation data itself.

### Next Step

Investigate whether the current MapKit API requires a different interaction mechanism.

---

## ISSUE-002 — Own handle blocked as "taken" on onboarding revisit

- Status: resolved
- Location: `src/screens/onboarding/handle/index.tsx`; RPC `public.is_handle_available`
- Problem: After saving a handle, navigating back to the handle step left Continue disabled ("taken").
- Suspected cause: `is_handle_available` checks `not exists` on `profiles.handle` with no `auth.uid()` exclusion.

### Attempts

#### Attempt 1
- Solution: Client-side treat `handle === profile.handle` as available (`isOwnHandle`) so Continue stays enabled without changing the RPC.
- Result: Succeeded.
- Reason: First-pass onboarding is unaffected; revisit/back navigation works. RPC can be hardened later if needed.

### Current Understanding

Client gate is sufficient for Phase 2. Optional follow-up: update the RPC to `where lower(handle) = lower(candidate) and id <> auth.uid()`.

### Next Step

None required for Phase 2. Consider RPC hardening when wiring handle edits from Profile.

---

## ISSUE-004 — Title meta shows genre IDs (e.g. `2026 · Movie · 27 · 53`)

- Status: resolved
- Location: `supabase/functions/decider-rank/index.ts` popular ingest; surfaces on title detail meta + PosterCard genre line
- Problem: Meta line showed raw TMDB genre ids (`27`, `53`) instead of names (`Horror`, `Thriller`).
- Suspected cause: `decider-rank` lightweight popular ingest stored `genres: genre_ids.map(id => ({ id, name: String(id) }))`. `tmdb-popular` / `tmdb-search` already map ids → names; Decider path did not.
- Attempts:
  - Attempt 1: Map genres via shared TMDB id→name tables in `decider-rank`; resolve numeric names in Edge + client `parseGenres` / `formatGenreMeta`; SQL repair rows where `name ~ '^[0-9]+$'`; redeploy `decider-rank`.
    - Result: Succeeded. Obsession → Horror · Thriller; zero remaining digit-name genre rows.
- Current status: resolved
- Next step: None. Reload title detail to pick up repaired cache.

---

## ISSUE-003 — Signup fails: "Error sending confirmation email"

- Status: unresolved (owner SMTP config)
- Location: Supabase Auth → custom SMTP; surfaces on client Create account (`signUpWithEmail`)
- Problem: After Create account, API returns error sending confirmation email; confirm-code screen never opens.
- Suspected cause: Custom SMTP credentials are invalid. Auth logs show `535 "Authentication credentials invalid"` on `POST /signup` (`user_confirmation_requested`, status 500). Successful earlier sends used default `noreply@mail.app.supabase.io`; failures started after custom SMTP was enabled.
- Attempts:
  - Attempt 1: Queried `auth_logs` for recent signup failures.
    - Result: Confirmed SMTP 535 auth failure (not app/OTP route bug).
- Current status: SMTP auth fixed (Resend accepts mail). New issue: message appears in Resend but not in Yahoo inbox (`kotmichael7@yahoo.com`) — deliverability / spam filtering, not app code. OTP template content is correct.
- Next step: In Resend check that email’s status (Delivered / Bounced / Delayed). Check Yahoo Spam/Junk. Confirm SPF + DKIM + DMARC all verified for `tonight-app.org` in Resend. Test delivery to Gmail. App can accept the 6-digit code even if mail is only visible in Resend for now.

---

## ISSUE-005 — Decider Shuffle dies after ~3–4 presses (~12 titles) + same titles on re-Find

- Status: resolved in code (client hard-exclude follow-up; pending owner smoke-test)
- Location: `src/screens/decider/index.tsx` (`ensureBuffer` / `handleShuffle` / `runDecide` / `backToSetup`); `supabase/functions/decider-rank/index.ts` (MIN_POOL gate — already redeployed)
- Problem:
  1. Shuffle hard-stops after ~4 pages even when more titles should exist. Prefetch often added 0 rows → permanent `exhausted`; buffer stayed at `DECIDER_FETCH_LIMIT` (12).
  2. **Follow-up:** Movie + Comedy + Me + 1 friend → Find → Shuffle → New setup / re-Find kept returning the **exact same suggestions**. Soft `demote_ids` (×0.35) was too weak on a thin eligible pool.
- Suspected cause:
  1. Client early-returned on Shuffle while `prefetchingRef` was set, then marked exhausted when no local next page.
  2. Client treated first `added === 0` / soft errors as exhausted and ignored response `total`.
  3. Edge ran enrich/ingest only when pre-service `candidates.length < MIN_POOL`; after exclude, post-service eligible could be thin while candidates stayed ≥ 12, so prefetch returned no new rows.
  4. **Follow-up:** `runDecide` cleared session seen and sent `exclude_ids: []`, only soft-demoting prior shown IDs — demoted titles still won Top-N.

### Attempts

#### Attempt 1
- Solution: Client awaits in-flight prefetch via `prefetchPromiseRef`; exhaust only when `total === 0` or two consecutive empty adds; soft errors stay retryable. Edge drives MIN_POOL enrich/ingest off post-service eligible (after `exclude_ids`), skipping excluded ids in enrich targets.
- Result: Succeeded for shuffle exhaustion. **`decider-rank` redeployed** to `tonight-app-db` (`kxvnmwnhiiortqpjzvog`) via `supabase functions deploy decider-rank --use-api`. Re-Find still repeated the same Top-N (soft demote).

#### Attempt 2
- Solution: Persist `sessionSeenIdsRef` for titles shown this Decider visit; on Find pass them as **`exclude_ids`** (hard-skip). Do not clear session seen on Find or New setup — clear only on Decider unmount. Prefetch exclude = buffer ∪ sessionSeen. Soft demote unused for shown IDs. No edge redeploy (contract unchanged).
- Result: Succeeded in code review / typecheck+lint. Runtime confirmation still needs owner smoke-test. Thin Movie+Comedy pool locking after ~4 shuffles is expected if eligible ≈12 (no wrap).

### Current Understanding

Shuffle race/exhaustion + edge under-expand after exclude were required for prefetch depth. Re-Find / New setup identity repeats needed **hard exclude of session-seen**, not soft demote. Edge `exclude_ids` already works.

### Next Step

Owner smoke-test: Movie + Comedy + Me + 1 friend → Find → Shuffle distinct pages until hint (~4 OK if pool ~12); New setup → Find again must not return any title shown earlier that Decider session; no silent wrap.

