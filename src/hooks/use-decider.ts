import { useMutation } from '@tanstack/react-query';

import {
  invokeDeciderRank,
  type DeciderRankRequest,
  type DeciderRankResponse,
} from '@/lib/decider';

/**
 * Mutation wrapper around `decider-rank`.
 * Keyed by selection at call time (member_ids + media + genre + offset).
 */
export function useDeciderRank() {
  return useMutation({
    mutationFn: async (request: DeciderRankRequest): Promise<DeciderRankResponse> => {
      const data = await invokeDeciderRank(request);
      if (data?.error) {
        throw new Error(data.error);
      }
      return data;
    },
  });
}
