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
