// api/claude.js — Vercel Edge Function
export const config = { runtime: 'edge' }

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
]

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return new Response(JSON.stringify({
      content: [{ type: 'text', text: '' }],
      error: 'GEMINI_API_KEY not set in Vercel environment variables'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ content: [{ type: 'text', text: '' }], error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Diagnostic: list available models
  if (body._listModels) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`)
      const d = await r.json()
      const names = (d.models || []).map(m => m.name).filter(n => n.includes('gemini'))
      return new Response(JSON.stringify({ models: names, error: d.error?.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  const userMessage = body.messages?.[0]?.content || ''
  const geminiBody = {
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: body.max_tokens || 8000, temperature: 0.3 },
  }

  const errors = []

  for (const model of MODELS_TO_TRY) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
      )
      const data = await resp.json()

      if (resp.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text
        return new Response(JSON.stringify({
          content: [{ type: 'text', text }],
          model_used: model,
          usage: { input_tokens: 0, output_tokens: 0 },
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      errors.push({ model, status: resp.status, msg: data.error?.message || 'no candidates' })
    } catch (e) {
      errors.push({ model, status: 'throw', msg: e.message })
    }
  }

  return new Response(JSON.stringify({
    content: [{ type: 'text', text: '' }],
    error: `All Gemini models failed. First error: ${errors[0]?.msg}`,
    errors,
  }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
