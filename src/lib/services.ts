import type { Enums } from '@/lib/database.types';

export type StreamingService = Enums<'streaming_service'>;

export interface ServiceCatalogEntry {
  service: StreamingService;
  displayName: string;
}

/**
 * The 8 supported streaming services, mirroring the seeded `service_catalog` table.
 * Kept static (the enum + display names are fixed) so onboarding can render without
 * a round-trip. Logo assets aren't available yet — tiles leave a spot for an icon.
 */
export const SERVICE_CATALOG: ServiceCatalogEntry[] = [
  { service: 'netflix', displayName: 'Netflix' },
  { service: 'max', displayName: 'Max' },
  { service: 'disney_plus', displayName: 'Disney+' },
  { service: 'prime_video', displayName: 'Prime Video' },
  { service: 'hulu', displayName: 'Hulu' },
  { service: 'apple_tv_plus', displayName: 'Apple TV+' },
  { service: 'peacock', displayName: 'Peacock' },
  { service: 'paramount_plus', displayName: 'Paramount+' },
];
