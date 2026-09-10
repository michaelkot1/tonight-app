# Tonight — Design Notes

> Practical tokens from Figma (`Untitled` / node `100:30`) for the social what-to-watch app. Dark, poster-forward, decisive — matches the product brief’s “decide in 60 seconds” energy.

**Source:** [Figma — Social Discovery App](https://www.figma.com/design/zb02Cj0rhFdroeBpVwDp1z/Untitled?node-id=100-30) https://www.figma.com/design/zb02Cj0rhFdroeBpVwDp1z/Untitled?node-id=103-683&m=dev
@https://www.figma.com/design/zb02Cj0rhFdroeBpVwDp1z/Untitled?node-id=103-1392&m=dev

---

## Mood / direction

- **Dark-only** cinematic canvas (near-black, not pure OLED void). Soft ambient color blurs sit behind the shell; content stays monochrome + one coral accent.
- Posters and stills do the visual work. Chrome is quiet; accent is reserved for “Tonight’s pick,” the Decider FAB, and active states.
- Social proof is ambient (friend avatar piles + short “loved this” copy), never essay-heavy.

---

## Fonts

| Role | Family | Weight | Size / tracking |
|---|---|---|---|
| Screen title (`For You`) | **Bricolage Grotesque** | Bold | 24px, −0.6px |
| Hero title (on pick card) | **Bricolage Grotesque** | ExtraBold (opsz 96) | 36px, −0.9px |
| Section rails | **Bricolage Grotesque** | SemiBold | 18px, −0.45px |
| Card title | **Inter** | Medium | 16px |
| Body / metadata | **Inter** | Regular | 14px |
| Caption / social line | **Inter** | Regular | 12px |
| Pill / CTA label | **Inter** | SemiBold | 12–14px |
| Tab label | **Inter** | Medium | 10px |

---

## Colors

| Token | Hex / value | Use |
|---|---|---|
| `--bg` | `#050506` | 
| `--shell` | `#0C0C0F` |
| `--surface` | `#16161B` |
| `--border` | `#22222A`|
| `--text-primary` | `#F4F4F6` | 
| `--text-muted` | `#8C8C98` | 
| `--accent` | `#FF5C49` | 
| `--rating` | `#F5C95B` |
| `--cta-fill` | `#FFFFFF` | 
| `--cta-text` | `#050506` | 
| `--badge-bg` | `rgba(5,5,6,0.7)` |
| `--scrim` | `#050506` 
| Ambient (optional) | `#2FBF71` blur, `rgba(79,57,246,0.1)` blur | Soft background blooms |

---

## Cards

### Hero — “Tonight’s pick”
- **Size:** ~362×452, full-bleed artwork
- **Radius:** 24px
- **Well:** `#16161B`, overflow clip
- **Scrim:** vertical gradient (`#050506` → transparent) for type legibility
- **Padding (overlay):** 24px
- **Chip:** coral pill (`#FF5C49`), 12×4 padding, spark icon + “Tonight’s pick”
- **Type on card:** ExtraBold 36 title; Inter 14 metadata; white Watch CTA; friend pile (28px avatars, 2px `#0C0C0F` ring) + 12px muted social line
- **Elevation:** none beyond image; depth from scrim + ambient blurs

### Poster rail cards
- **Size:** 160×240 image + title/meta below
- **Radius:** 16px on image well
- **Gap:** 12px between cards; rail title → cards 12px; section top ~28px
- **Title:** Inter Medium 16 / `#F4F4F6`, 8px below image
- **Meta:** Inter Regular 14 / `#8C8C98` (`Genre · Genre`)
- **Rating badge:** top-right, pill, blur + dark fill, gold score
- **Optional:** overlapping friend avatars bottom-left on artwork (same 28px + dark ring)

---

## Buttons & chrome

| Element | Spec |
|---|---|
| **Watch (primary)** | White pill, 20×10 padding, play icon + Inter SemiBold 14 / `#050506` |
| **Tonight’s pick chip** | Coral pill, not a full-width button |
| **Decider FAB** | 64px circle, `#FF5C49`, 4px `#0C0C0F` ring, glow `0 10 30 rgba(255,92,73,0.45)` — center tab “Decide with friends” |
| **Bottom nav** | Frosted `#0C0C0F` @ 90%, top hairline border; icons ~24px; active = white, idle = `#8C8C98` |
| **Profile avatar** | 40px circle, 2px `#22222A` ring |

---

## Spacing rhythm

- **Page inset:** 20px horizontal
- **Header top:** 24px
- **Hero top:** 20px under header
- **Rail gap:** 28px between sections
- **Card gap:** 12px
- **Nav safe area:** ~112px bottom content padding; nav `pt 8 / pb 20 / px 12`

---

## Implementation notes

- Keep accent usage scarce so the Decider FAB and “Tonight’s pick” stay the decision moment.
- Prefer scrims over heavy borders; borders stay hairline / low-opacity `#22222A`.
- Friend piles are first-class — same ring treatment everywhere (`#0C0C0F` on media, `#22222A` on header avatar).
