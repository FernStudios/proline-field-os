// api/send-email.js — Vercel Edge Function
// Sends emails via Brevo (formerly Sendinblue) API
// Used for: portal link delivery, team member invites

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) {
    return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured in Vercel env vars' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const { type, to, toName, subject, html, text, fromName, fromEmail } = body

  if (!to || !subject || (!html && !text)) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html or text' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }

  const brevoPayload = {
    sender: {
      name: fromName || 'Proline Field OS',
      email: fromEmail || 'noreply@prolinefieldos.com',
    },
    to: [{ email: to, name: toName || to }],
    subject,
    htmlContent: html || `<pre style="font-family:sans-serif">${text}</pre>`,
  }

  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify(brevoPayload),
    })

    const data = await resp.json()

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Brevo API error', code: data.code }), {
        status: resp.status, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, messageId: data.messageId }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
}
