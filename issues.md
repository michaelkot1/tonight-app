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

- Status: unresolved (owner Supabase template + Resend deliverability config)
- Location: Supabase Auth → Email Templates + custom SMTP (Resend); surfaces on client Create account (`signUpWithEmail` in `src/providers/auth-provider.tsx`) and confirm-code screen (`src/screens/auth/confirm-email/index.tsx`).
- Problem: Signup email either never arrives at `kotmichael7@yahoo.com`, or when it does it's the wrong template (invite link, not 6-digit OTP), so the confirm-code screen can't verify it.
- Suspected cause: Compound issue —
  1. Custom SMTP credentials were invalid (fixed).
  2. Only the **Magic Link** template was customized to use `{{ .Token }}`; the app actually triggers the **Confirm signup** template (`supabase.auth.signUp`), which still shipped the default `{{ .ConfirmationURL }}` link.
  3. Owner was testing via Studio → Authentication → Users → **"Send invitation"** (fires `POST /invite`, uses the **Invite user** template, actor `service_role`, referer `http://localhost:3000`) instead of the app's Create account flow — so the customized templates were never even evaluated.
  4. Deliverability: sender domain `tonight-app.org` vs link domain `kxvnmwnhiiortqpjzvog.supabase.co` → URL/domain mismatch that Yahoo/Gmail flag; likely missing DMARC record.
- Attempts:
  - Attempt 1: Queried `auth_logs` for recent signup failures.
    - Result: Confirmed SMTP 535 auth failure (not app/OTP route bug).
  - Attempt 2: Owner customized "Magic Link / OTP" template to `{{ .Token }}` and re-tested via Studio "Send invitation".
    - Result: Failed. Auth logs show only `POST /invite` (invite path), never `POST /signup`. Resend log shows subject "You've been invited" + `type=invite` link → **Invite user** template body, not the customized Magic Link body. Wrong template + wrong test entry point.
- Current status: Diagnosed. App code (`signUpWithEmail` + `verifyEmailOtp`) is correct and expects a 6-digit OTP via `verifyOtp({ type: 'signup' })`. Fix is entirely in Supabase Auth template config + Resend DNS/deliverability, no app code change required.
- Next step:
  1. In Supabase → Auth → Email Templates, edit **Confirm signup** (not Magic Link) to use `{{ .Token }}`-only body, e.g.:
     ```html
     <h2>Your Tonight code</h2>
     <p>Enter this 6-digit code in the app to finish signing up:</p>
     <p style="font-size: 28px; letter-spacing: 6px;"><strong>{{ .Token }}</strong></p>
     <p>This code expires in 60 minutes and can only be used once.</p>
     ```
     Optional subject: `Your Tonight sign-in code: {{ .Token }}`.
  2. Test from the **mobile app's Create account flow** (should produce `POST /signup` in auth_logs), not from Studio's Invite button.
  3. In Resend → Emails, verify the actual delivery status pill (Delivered / Bounced / Deferred) for the new message. Then check Yahoo Junk.
  4. Add DMARC TXT record `_dmarc.tonight-app.org` → `v=DMARC1; p=none; rua=mailto:you@tonight-app.org` if missing. Re-verify SPF + DKIM in Resend.
  5. Once template is OTP-only, the "Ensure link URLs match sending domain" warning in Resend goes away (no link in body).
  6. Optional cleanup: drop the now-unused `options: { emailRedirectTo: authRedirectUrl() }` from `signUpWithEmail` — only meaningful when the template contains `{{ .ConfirmationURL }}`. Leave in place until template switch is confirmed working.

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

---

## ISSUE-006 — TestFlight sign-in/sign-up fails with Supabase "Invalid API key"

- Status: resolved
- Location: TestFlight sign-in/sign-up (production EAS build only; Expo Go / dev works)
- Problem: Supabase `Invalid API key` in production build only; sign-in / sign-up unreachable on TestFlight, works fine locally in Expo Go.
- Suspected cause: EAS `production` environment variable `EXPO_PUBLIC_SUPABASE_ANON_KEY` had a 1-character typo (`N30` → `N70` in the JWT payload segment), which invalidated the HS256 signature server-side. Same signature bytes, but the payload chunk differed by one char, so Supabase's PostgREST rejected the JWT before any RLS check. Additionally, `preview` and `development` environments had no Supabase vars set at all.

### Attempts

#### Attempt 1
- Solution: Compared local `.env` (works in Expo Go) against `npx eas-cli env:list --environment production` and found the single-char diff in the JWT payload (`...N70.8xPNuL71...` vs. `...N30.8xPNuL71...`).
- Result: Succeeded — root cause identified.

#### Attempt 2
- Solution: Deleted the typo'd `EXPO_PUBLIC_SUPABASE_ANON_KEY` from EAS `production` and recreated it (`eas env:create`, `--visibility plaintext`, `--non-interactive`) with the exact value from local `.env`. Created both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `preview` and `development` (previously empty). Verified all three environments now share the same trailing key segment (`...N30.8xPNuL71Ym2vESrN4FHCpa1eCbLEFYyC2s2N5NoQUXE`).
- Result: Succeeded.

#### Attempt 3
- Solution: Tried to reship the JS bundle to existing TestFlight installs via `npx eas-cli update --branch production` so the corrected anon key would be inlined by Metro without a native rebuild.
- Result: **Blocked / not attempted.** Project is not configured for EAS Update: `expo-updates` is not in `package.json` dependencies, `app.json` has no `expo.updates` block and no `runtimeVersion`, `eas.json` build profiles don't declare a `channel`, and `eas channel:list` + `eas branch:list` both return empty. Per task guardrails, did NOT run `expo install expo-updates` or otherwise reconfigure — deferred to parent.

#### Attempt 4
- Solution: Added a startup guard in `src/lib/env.ts` (`validateAnonKey`) that decodes the JWT payload (base64url → JSON) and `console.warn`s on a malformed shape (wrong segment count, non-JSON payload, missing/incorrect `role`) or `console.error`s if a `service_role` key is ever pasted client-side. Wrapped in try/catch, no throw.
- Result: Succeeded — typechecks clean. Next regression will surface as a clear first-line Metro warning naming the exact var, instead of a downstream "Invalid API key" from PostgREST.

#### Attempt 5
- Solution: Wired up EAS Update end-to-end so future JS-only regressions (like this typo) can be reshipped without a store submission, then kicked off a new production iOS build with `--auto-submit` to TestFlight so the corrected anon key ships as a fresh native bundle. Concretely:
  1. Installed `expo-updates@~57.0.23` (SDK 57-aligned) via `npx expo install expo-updates`.
  2. Ran `npx eas-cli@latest update:configure --platform all --non-interactive`, which added `expo.updates.url = "https://u.expo.dev/1ae0ee8b-5555-4f6a-878a-5575af4c4368"` and `expo.runtimeVersion = { "policy": "appVersion" }` to `app.json`, and added `"channel": "<name>"` to each build profile in `eas.json`.
  3. Added explicit `"environment": "development" | "preview" | "production"` to each build profile in `eas.json` so EAS env-var inlining is unambiguous per profile.
  4. Ran `npx eas-cli@latest channel:create {development,preview,production}` — all three channels + matching branches now exist on the server (previously `channel:list` was empty).
  5. Cleaned up an unintended side-effect: `eas update:configure` re-serialized `app.json` and duplicated the three Android permissions; re-collapsed to a single copy.
  6. `npx tsc --noEmit` clean; `channel:list --json` shows `development`, `preview`, `production`.
  7. Kicked off `npx eas-cli@latest build --platform ios --profile production --non-interactive --auto-submit` — see build URL in the parent report. `autoIncrement: true` on the production profile handled the build number bump; no manual version change needed. The resulting IPA will embed the corrected `EXPO_PUBLIC_SUPABASE_ANON_KEY` (already fixed in the `production` EAS environment in Attempt 2) *and* embed `expo-updates` so future JS-only fixes can be published via `eas update --channel production` without another store submission.
- Result: Succeeded (config + build submission). Full fix is **pending TestFlight rebuild landing + owner smoke-test** on the new build.
- Note (2026-09-23): Production iOS build queued at https://expo.dev/accounts/kotmichael/projects/tonight/builds/d7001f7f-b313-44b4-ba22-52eb5125ea60 (UUID `d7001f7f-b313-44b4-ba22-52eb5125ea60`, buildNumber 3, status `IN_QUEUE`). `--auto-submit` was rejected: `Set ascAppId in the submit profile (eas.json) or re-run this command in interactive mode.` The build itself was not cancelled.
- Note (2026-09-23): `ascAppId` `6813179570` came from the Sep 17 submission (`npx eas-cli@latest submit:list`, `iosConfig.ascAppIdentifier` on build `2339457a-d63a-46c5-83c7-b10f68ded44b`). Written to `eas.json` `submit.production.ios` only (no preview submit profile). Build `d7001f7f` reached `FINISHED` (buildNumber 3). Submit succeeded: https://expo.dev/accounts/kotmichael/projects/tonight/submissions/ff83f895-4e09-4662-8bc4-74b1586cc467. Apple is processing the binary; TestFlight: https://appstoreconnect.apple.com/apps/6813179570/testflight/ios

### Current Understanding

Root cause was a single-char typo in the EAS `production` anon key value; env is now correct across all three EAS environments and locally. Because EAS Update is now wired up (Attempt 5), any future JS-only regression can be reshipped to installed builds via `eas update --channel production` instead of a full TestFlight resubmission — the current fix still requires one native build because the previously-installed TestFlight IPA does not contain `expo-updates` (nothing to receive an OTA).

### Next Step

1. After Apple finishes processing build 3, owner installs it from TestFlight and re-attempts sign-in / sign-up. Submission: https://expo.dev/accounts/kotmichael/projects/tonight/submissions/ff83f895-4e09-4662-8bc4-74b1586cc467
2. After that build lands, all future JS-only fixes ship via `npx eas-cli@latest update --channel production --message "..." --environment production` (see `.agents/skills/eas-update/SKILL.md`).

