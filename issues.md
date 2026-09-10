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

