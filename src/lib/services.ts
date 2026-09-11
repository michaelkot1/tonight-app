import type { ImageSource } from 'expo-image';

import type { Enums } from '@/lib/database.types';

export type StreamingService = Enums<'streaming_service'>;

export interface ServiceCatalogEntry {
  service: StreamingService;
  displayName: string;
  logo: ImageSource;
}

/**
 * The 8 supported streaming services, mirroring the seeded `service_catalog` table.
 * Kept static (the enum + display names are fixed) so onboarding can render without
 * a round-trip. Logos live under `assets/images/streaming/` keyed by service id.
 */
export const SERVICE_CATALOG: ServiceCatalogEntry[] = [
  {
    service: 'netflix',
    displayName: 'Netflix',
    logo: require('@/assets/images/streaming/netflix.png'),
  },
  {
    service: 'max',
    displayName: 'Max',
    logo: require('@/assets/images/streaming/max.jpg'),
  },
  {
    service: 'disney_plus',
    displayName: 'Disney+',
    logo: require('@/assets/images/streaming/disney_plus.png'),
  },
  {
    service: 'prime_video',
    displayName: 'Prime Video',
    logo: require('@/assets/images/streaming/prime_video.png'),
  },
  {
    service: 'hulu',
    displayName: 'Hulu',
    logo: require('@/assets/images/streaming/hulu.png'),
  },
  {
    service: 'apple_tv_plus',
    displayName: 'Apple TV+',
    logo: require('@/assets/images/streaming/apple_tv_plus.png'),
  },
  {
    service: 'peacock',
    displayName: 'Peacock',
    logo: require('@/assets/images/streaming/peacock.png'),
  },
  {
    service: 'paramount_plus',
    displayName: 'Paramount+',
    logo: require('@/assets/images/streaming/paramount_plus.jpg'),
  },
];

/** Human display name for a service enum value. */
const SERVICE_DISPLAY_NAMES = new Map<StreamingService, string>(
  SERVICE_CATALOG.map(({ service, displayName }) => [service, displayName]),
);

export function serviceDisplayName(service: StreamingService): string {
  return SERVICE_DISPLAY_NAMES.get(service) ?? service;
}

/**
 * Lowercase substrings that identify each service inside a TMDB `provider_name`.
 * TMDB names drift (e.g. "Amazon Prime Video", "Apple TV Plus", "Disney Plus"),
 * so we match on stable keywords rather than exact strings. This lets us map a
 * title's parsed providers back to the user's selected `StreamingService`s
 * without seeding TMDB provider ids into the catalog yet.
 */
const SERVICE_PROVIDER_KEYWORDS: Record<StreamingService, string[]> = {
  netflix: ['netflix'],
  max: ['max', 'hbo'],
  disney_plus: ['disney'],
  prime_video: ['amazon prime video', 'prime video'],
  hulu: ['hulu'],
  apple_tv_plus: ['apple tv+', 'apple tv plus'],
  peacock: ['peacock'],
  paramount_plus: ['paramount+', 'paramount plus'],
};

/** True when a TMDB provider name matches the given service by keyword. */
export function providerNameMatchesService(
  providerName: string,
  service: StreamingService,
): boolean {
  const name = providerName.toLowerCase();
  return SERVICE_PROVIDER_KEYWORDS[service].some((keyword) => name.includes(keyword));
}

/** The user's selected services that a set of provider names covers. */
export function matchServices(
  providerNames: string[],
  selected: StreamingService[],
): StreamingService[] {
  return selected.filter((service) =>
    providerNames.some((name) => providerNameMatchesService(name, service)),
  );
}
