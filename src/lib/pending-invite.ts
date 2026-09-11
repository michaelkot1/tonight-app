import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

/** SecureStore / localStorage key for an invite deep-link code awaiting accept. */
export const PENDING_INVITE_CODE_KEY = 'tonight.pending_invite_code';

function webStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

/** Persist an invite code until a session can call `accept_invite`. */
export async function setPendingInviteCode(code: string): Promise<void> {
  const trimmed = code.trim();
  if (!trimmed) return;

  if (Platform.OS === 'web') {
    webStorage()?.setItem(PENDING_INVITE_CODE_KEY, trimmed);
    return;
  }
  await SecureStore.setItemAsync(PENDING_INVITE_CODE_KEY, trimmed);
}

export async function getPendingInviteCode(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webStorage()?.getItem(PENDING_INVITE_CODE_KEY) ?? null;
  }
  return SecureStore.getItemAsync(PENDING_INVITE_CODE_KEY);
}

export async function clearPendingInviteCode(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(PENDING_INVITE_CODE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PENDING_INVITE_CODE_KEY);
}

/**
 * Errors that mean the pending code should be dropped (retrying won't help).
 * Network / transient failures keep the code for a later flush.
 */
function isTerminalInviteError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('invite not found') ||
    lower.includes('invite expired') ||
    lower.includes('cannot accept your own invite') ||
    lower.includes('not authenticated')
  );
}

export interface FlushPendingInviteResult {
  accepted: boolean;
  inviterId: string | null;
  error: string | null;
}

/**
 * If a pending invite code is stored and the client has a session, call
 * `accept_invite`. Does not require handle / onboarded_at.
 */
export async function flushPendingInvite(): Promise<FlushPendingInviteResult> {
  const code = await getPendingInviteCode();
  if (!code) {
    return { accepted: false, inviterId: null, error: null };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { accepted: false, inviterId: null, error: 'Not configured' };
  }

  const { data, error } = await supabase.rpc('accept_invite', {
    invite_code: code,
  });

  if (error) {
    if (isTerminalInviteError(error.message)) {
      await clearPendingInviteCode();
    }
    return { accepted: false, inviterId: null, error: error.message };
  }

  await clearPendingInviteCode();
  return {
    accepted: true,
    inviterId: data ?? null,
    error: null,
  };
}
