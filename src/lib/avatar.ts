/** DiceBear glass + fun-emoji PNG avatars — no SVG / react-native-svg required. */

const DICEBEAR_GLASS_PNG = 'https://api.dicebear.com/10.x/glass/png';
const DICEBEAR_FUN_EMOJI_PNG = 'https://api.dicebear.com/10.x/fun-emoji/png';

export const GLASS_AVATAR_OPTION_COUNT = 5;
export const EMOJI_AVATAR_OPTION_COUNT = 5;

/** First letter for monogram fallback (handle or display name). */
export function avatarInitial(source: string | null | undefined): string {
  const raw = (source ?? '').replace(/^@/, '').trim();
  const ch = raw.charAt(0);
  return (ch || '?').toUpperCase();
}

/** Build a DiceBear glass PNG URL for a seed. */
export function dicebearGlassUrl(seed: string, size = 128): string {
  const params = new URLSearchParams({
    seed,
    size: String(size),
  });
  return `${DICEBEAR_GLASS_PNG}?${params.toString()}`;
}

/** Build a DiceBear fun-emoji PNG URL for a seed. */
export function dicebearFunEmojiUrl(seed: string, size = 128): string {
  const params = new URLSearchParams({
    seed,
    size: String(size),
  });
  return `${DICEBEAR_FUN_EMOJI_PNG}?${params.toString()}`;
}

/**
 * Deterministic glass variant seeds derived from the handle.
 * Letter monogram is a separate UI option — these seeds are glass-only.
 */
export function glassAvatarSeeds(
  handle: string,
  count = GLASS_AVATAR_OPTION_COUNT,
): string[] {
  const base = handle.trim() || 'tonight';
  const letter = avatarInitial(base).toLowerCase();
  const seeds: string[] = [letter, base];
  for (let i = 2; seeds.length < count; i += 1) {
    seeds.push(`${base}-${i}`);
  }
  return seeds.slice(0, count);
}

/**
 * Deterministic fun-emoji variant seeds derived from the handle.
 * Mirrors the glass seed logic but namespaced so previews stay distinct.
 */
export function funEmojiAvatarSeeds(
  handle: string,
  count = EMOJI_AVATAR_OPTION_COUNT,
): string[] {
  const base = handle.trim() || 'tonight';
  const seeds: string[] = [`${base}-emoji`, base];
  for (let i = 2; seeds.length < count; i += 1) {
    seeds.push(`${base}-emoji-${i}`);
  }
  return seeds.slice(0, count);
}

/**
 * Picker selection: letter default clears DB (`avatar_url` null);
 * glass / emoji indexes map through their seed lists so previews live-update.
 */
export type AvatarSelection =
  | { kind: 'letter' }
  | { kind: 'glass'; index: number }
  | { kind: 'emoji'; index: number };

export function avatarUrlForSelection(
  selection: AvatarSelection,
  handle: string,
  size = 128,
): string | null {
  if (selection.kind === 'letter') return null;
  if (selection.kind === 'emoji') {
    const seeds = funEmojiAvatarSeeds(handle);
    const seed = seeds[selection.index] ?? seeds[0];
    if (!seed) return null;
    return dicebearFunEmojiUrl(seed, size);
  }
  const seeds = glassAvatarSeeds(handle);
  const seed = seeds[selection.index] ?? seeds[0];
  if (!seed) return null;
  return dicebearGlassUrl(seed, size);
}

/**
 * Map a stored `avatar_url` back to a picker selection for the given handle.
 * Non-DiceBear / unmatched URLs fall back to letter (clearing on save).
 */
export function selectionFromAvatarUrl(
  avatarUrl: string | null | undefined,
  handle: string,
): AvatarSelection {
  if (!avatarUrl) return { kind: 'letter' };

  let seed: string | null = null;
  let style: 'glass' | 'emoji' | null = null;
  try {
    const parsed = new URL(avatarUrl);
    if (!parsed.hostname.includes('dicebear.com')) return { kind: 'letter' };
    if (parsed.pathname.includes('/glass/')) {
      style = 'glass';
    } else if (parsed.pathname.includes('/fun-emoji/')) {
      style = 'emoji';
    } else {
      return { kind: 'letter' };
    }
    seed = parsed.searchParams.get('seed');
  } catch {
    return { kind: 'letter' };
  }

  if (!seed) return { kind: 'letter' };
  if (style === 'emoji') {
    const index = funEmojiAvatarSeeds(handle).indexOf(seed);
    if (index < 0) return { kind: 'letter' };
    return { kind: 'emoji', index };
  }
  const index = glassAvatarSeeds(handle).indexOf(seed);
  if (index < 0) return { kind: 'letter' };
  return { kind: 'glass', index };
}

/**
 * True only for DiceBear **glass** URLs — those are abstract gradients that get
 * the user's initial overlaid on top. Fun-emoji / photos / anything else: false.
 */
export function avatarHasLetterOverlay(uri?: string | null): boolean {
  if (!uri) return false;
  try {
    const parsed = new URL(uri);
    return (
      parsed.hostname.includes('dicebear.com') &&
      parsed.pathname.includes('/glass/')
    );
  } catch {
    return false;
  }
}
