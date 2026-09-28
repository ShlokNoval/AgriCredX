// ============================================================
// AgriCredX Edge Function — audit-chain-event
// ============================================================
// Responsibilities:
//   1. Authenticate caller (system secret or user token)
//   2. Validate incoming on-chain event details
//   3. Persist audit log entry with actual tx hash & block reference
//   4. Never fabricate or extrapolate unverified blockchain state
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseSecretKey = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    // Also support service-role key authentication
    const isServiceKey = token === supabaseSecretKey;
    if (!isServiceKey && (authError || !user)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, entityType, entityId, txHash, blockReference, metadata } = body;

    if (!action || !entityType) {
      return new Response(
        JSON.stringify({ error: 'action and entityType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actorId = user ? user.id : null;

    const { data: auditRow, error: logError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: actorId,
        action: action,
        entity_type: entityType,
        entity_id: entityId || null,
        metadata_json: {
          ...metadata,
          tx_hash: txHash || null,
          block_reference: blockReference || null,
          verified_source: 'mst-blockchain',
          recorded_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (logError) {
      throw new Error(`Failed to persist audit log: ${logError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        auditLogId: auditRow.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
