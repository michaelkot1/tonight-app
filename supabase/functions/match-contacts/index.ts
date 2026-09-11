// Tonight — match-contacts edge function.
// Accepts a list of contact emails from an authenticated caller, looks them up
// against auth.users with the service role, and returns only matching profile
// summaries. Unmatched emails are never echoed back (privacy).
//
// verify_jwt is enabled at the gateway; we re-derive the caller from their JWT
// (mirrors delete-account / tmdb-search).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_EMAILS = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeEmails(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const email = value.trim().toLowerCase();
    if (!email || !email.includes('@') || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
    if (out.length >= MAX_EMAILS) break;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'missing_authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'unauthorized' }, 401);
  }
  const callerId = userData.user.id;

  let body: { emails?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const emails = normalizeEmails(body.emails);
  if (emails.length === 0) {
    return json({ matches: [] });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Service-role-only RPC: matches auth.users.email → profiles (no unmatched PII).
  const { data, error } = await adminClient.rpc('match_profiles_by_emails', {
    p_emails: emails,
  });

  if (error) {
    return json({ error: 'match_failed', detail: error.message }, 500);
  }

  const matches = (data ?? [])
    .filter((row: { id: string }) => row.id !== callerId)
    .map(
      (row: {
        id: string;
        handle: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }) => ({
        id: row.id,
        handle: row.handle,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      }),
    );

  return json({ matches });
});
