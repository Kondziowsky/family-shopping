import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { groupId, email } = await req.json();

    if (!groupId || !email) {
      return json({ error: 'Missing groupId or email' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const appUrl = Deno.env.get('APP_URL')!;
    const emailFrom = Deno.env.get('EMAIL_FROM')!;

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Invalid user' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: membership, error: membershipError } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      return json({ error: membershipError.message }, 500);
    }

    if (!membership) {
      return json({ error: 'You are not a member of this group' }, 403);
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: inviteError } = await adminClient.from('group_invites').insert({
      group_id: groupId,
      email,
      token,
      expires_at: expiresAt,
    });

    if (inviteError) {
      return json({ error: inviteError.message }, 500);
    }

    const inviteUrl = `${appUrl}/invite/${token}`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: 'Zaproszenie do Family Shopping',
        html: `
          <p>Cześć!</p>
          <p>Masz zaproszenie do wspólnej listy zakupów.</p>
          <p><a href="${inviteUrl}">Kliknij tutaj, aby dołączyć</a></p>
          <p>Link jest ważny 7 dni.</p>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      return json({ error: resendError }, 500);
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}