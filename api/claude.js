// api/claude.js — Vercel Edge Function
// ANTHROPIC_API_KEY lives only in Vercel env vars, never in the browser bundle

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    // Convert Anthropic-style request to Gemini format
    const userMessage = body.messages?.[0]?.content || ''
    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: body.max_tokens || 3000, temperature: 0.3 },
    }
    const model = 'gemini-1.5-flash'
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    )

    const geminiData = await resp.json()
    // Convert Gemini response to Anthropic-compatible format
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const anthropicCompat = {
      content: [{ type: 'text', text }],
      usage: { input_tokens: 0, output_tokens: 0 },
    }
    return new Response(JSON.stringify(anthropicCompat), {
      status: resp.ok ? 200 : resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
