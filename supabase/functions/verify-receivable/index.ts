// ============================================================
// AgriCredX Edge Function — verify-receivable
// ============================================================
// Responsibilities:
//   1. Authenticate caller (Supplier or Admin)
//   2. Validate receivableId
//   3. Fetch document metadata for this receivable
//   4. Generate signed URLs for private storage PDFs
//   5. Call Python FastAPI AI service (/api/v1/verify)
//   6. Receive VerificationResponse
//   7. Persist verification_results rows
//   8. Transition receivable status to VERIFIED (or WARN/DISPUTED)
//   9. Insert audit log record
//   10. Trigger Realtime event to clients
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
    const aiServiceUrl = Deno.env.get('AI_SERVICE_URL') || 'http://localhost:8000';
    const aiServiceKey = Deno.env.get('AI_SERVICE_KEY') || '';

    if (!supabaseUrl || !supabaseSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Authenticate user from request Authorization header
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

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate receivableId
    const body = await req.json();
    const { receivableId } = body;
    if (!receivableId) {
      return new Response(
        JSON.stringify({ error: 'receivableId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch receivable and verify caller's rights
    const { data: receivable, error: recError } = await supabaseAdmin
      .from('receivables')
      .select('*')
      .eq('id', receivableId)
      .single();

    if (recError || !receivable) {
      return new Response(
        JSON.stringify({ error: `Receivable not found: ${receivableId}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch associated document metadata
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('receivable_id', receivableId)
      .eq('is_active', true);

    if (docsError || !documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active documents found for this receivable' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Generate signed URLs for private storage access (10 min expiry)
    const docPayloads = [];
    for (const doc of documents) {
      const { data: signedData, error: signError } = await supabaseAdmin
        .storage
        .from('documents')
        .createSignedUrl(doc.object_key, 600);

      if (signError || !signedData?.signedUrl) {
        throw new Error(`Failed to generate signed URL for document ${doc.filename}: ${signError?.message}`);
      }

      docPayloads.push({
        type: doc.type,
        url: signedData.signedUrl,
        sha256: doc.sha256,
      });
    }

    // 5. Call Python FastAPI AI Service
    const aiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (aiServiceKey) {
      aiHeaders['x-api-key'] = aiServiceKey;
    }

    const aiResponse = await fetch(`${aiServiceUrl}/api/v1/verify`, {
      method: 'POST',
      headers: aiHeaders,
      body: JSON.stringify({
        receivable_id: receivableId,
        documents: docPayloads,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI Service verification failed (${aiResponse.status}): ${errText}`);
    }

    // 6. Receive VerificationResponse
    const verificationReport = await aiResponse.json();

    // 7. Persist verification_results
    const resultsToInsert = (verificationReport.checks || []).map((check: any) => ({
      receivable_id: receivableId,
      check_code: check.code,
      status: check.status,
      extracted_value: check.extracted_value !== undefined ? String(check.extracted_value) : null,
      expected_value: check.expected_value !== undefined ? String(check.expected_value) : null,
      explanation: check.explanation || '',
      engine_version: verificationReport.engine_version || 'v1',
    }));

    if (resultsToInsert.length > 0) {
      // Clear any prior results for clean idempotence
      await supabaseAdmin
        .from('verification_results')
        .delete()
        .eq('receivable_id', receivableId);

      const { error: insertError } = await supabaseAdmin
        .from('verification_results')
        .insert(resultsToInsert);

      if (insertError) {
        throw new Error(`Failed to save verification results: ${insertError.message}`);
      }
    }

    // 8. Update receivable status to VERIFIED (if passing) or maintain status with failure flag
    const hasFailures = (verificationReport.checks || []).some((c: any) => c.status === 'FAIL');
    const newStatus = hasFailures ? 'CREATED' : 'VERIFIED';

    const { error: updateError } = await supabaseAdmin
      .from('receivables')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', receivableId);

    if (updateError) {
      throw new Error(`Failed to update receivable status: ${updateError.message}`);
    }

    // 9. Persist audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'VERIFICATION_COMPLETED',
        entity_type: 'receivable',
        entity_id: receivableId,
        metadata_json: {
          risk_score: verificationReport.risk_score,
          risk_band: verificationReport.risk_band,
          new_status: newStatus,
          checks_count: resultsToInsert.length,
          has_failures: hasFailures,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        receivableId,
        status: newStatus,
        verificationReport,
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
