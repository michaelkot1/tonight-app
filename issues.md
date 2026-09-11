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

