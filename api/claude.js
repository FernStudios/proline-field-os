// api/claude.js — Vercel Edge Function
// Calls Gemini API for AI template generation

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
    return new Response(JSON.stringify({
      content: [{ type: 'text', text: '' }],
      error: 'GEMINI_API_KEY not configured in Vercel env vars'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    const body = await req.json()
    const userMessage = body.messages?.[0]?.content || ''

    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: body.max_tokens || 3000,
        temperature: 0.3,
      },
    }

    // Try models in order — gemini-1.5-flash first, then fallbacks
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro']
    let geminiData = null
    let lastError = null

    for (const model of models) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        }
      )

      const data = await resp.json()

      if (resp.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        geminiData = data
        break
      }

      lastError = { model, status: resp.status, error: data.error?.message || JSON.stringify(data) }
    }

    if (!geminiData) {
      // All models failed — return the error so frontend can show it
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: '' }],
        error: lastError?.error || 'All Gemini models failed',
        debug: lastError,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const text = geminiData.candidates[0].content.parts[0].text

    return new Response(JSON.stringify({
      content: [{ type: 'text', text }],
      usage: { input_tokens: 0, output_tokens: 0 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    return new Response(JSON.stringify({
      content: [{ type: 'text', text: '' }],
      error: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
