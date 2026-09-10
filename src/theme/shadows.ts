export const shadows = {
  fab: '0 10px 30px rgba(255,92,73,0.45)',
  card: '0 1px 2px rgba(0, 0, 0, 0.05)',
  raised: '0 4px 12px rgba(0, 0, 0, 0.10)',
} as const;

export type ShadowToken = keyof typeof shadows;
