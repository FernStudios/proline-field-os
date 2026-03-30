// api/invite-member.js — Vercel Edge Function
// Sends a team member invite using Supabase Admin auth
// The invite creates a Supabase user and sends them a magic link

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    return new Response(JSON.stringify({
      error: 'SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL not configured',
      fallback: true
    }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const { email, name, role, companyName, invitedByName } = body

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  try {
    // Use Supabase Admin API to send invite
    const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        email,
        email_confirm: false,
        user_metadata: {
          full_name: name || email,
          invited_role: role || 'crew',
          invited_by: invitedByName || 'Account owner',
          company: companyName || '',
        },
        send_email_hook: true,
      }),
    })

    const data = await resp.json()

    if (!resp.ok) {
      // If user already exists, send a magic link instead
      if (data.msg?.includes('already exists') || data.code === 'email_exists') {
        const magicResp = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ type: 'magiclink', email }),
        })
        const magicData = await magicResp.json()
        return new Response(JSON.stringify({
          success: true,
          method: 'magic_link',
          link: magicData.action_link,
          note: 'User already exists — magic link generated',
        }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ error: data.msg || data.message || 'Supabase invite error' }), {
        status: resp.status, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, method: 'invite', userId: data.id }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
}
