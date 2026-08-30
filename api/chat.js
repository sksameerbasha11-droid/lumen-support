/**
 * POST /api/chat  (Hugging Face Inference API — free tier)
 * Body: { system: string, messages: [{ role: 'user'|'assistant', text: string, image?: {mediaType,data} }] }
 * Returns: { text }
 *
 * Uses Hugging Face's OpenAI-compatible chat-completions route. Needs a free
 * HF_TOKEN (huggingface.co -> Settings -> Access Tokens -> "Read" is enough).
 *
 * Note: the default free-tier model here is text-only. If a message has an
 * attached screenshot, we can't actually show it to the model — we tell the
 * model a screenshot was attached so it can ask the user to describe it
 * instead of pretending to have seen it.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { HF_TOKEN } = process.env;
  const HF_MODEL = process.env.HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct:hf-inference';
  if (!HF_TOKEN) {
    res.status(500).json({ error: 'Server is missing HF_TOKEN' });
    return;
  }

  const { system, messages } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages must be an array' });
    return;
  }

  const hfMessages = [
    { role: 'system', content: system || 'You are a helpful support assistant.' },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: (m.text || '') + (m.hasImage ? '\n\n[The user attached a screenshot. This model cannot view images — ask them to briefly describe what it shows: any error message, amount, or screen name.]' : ''),
    })),
  ];

  try {
    const text = await callHuggingFace(HF_MODEL, HF_TOKEN, hfMessages);
    res.status(200).json({ text });
  } catch (err) {
    console.error('chat error', err);
    res.status(502).json({ error: err.message || 'Failed to reach Hugging Face' });
  }
};

async function callHuggingFace(model, token, messages, isRetry) {
  const upstream = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.3 }),
  });

  const data = await upstream.json().catch(() => ({}));

  // Free-tier models sometimes need to "cold start" — HF returns 503 with an
  // estimated_time. Wait that long once, then retry, instead of failing outright.
  if (upstream.status === 503 && data?.estimated_time && !isRetry) {
    const waitMs = Math.min(Math.ceil(data.estimated_time * 1000), 15000);
    await new Promise((r) => setTimeout(r, waitMs));
    return callHuggingFace(model, token, messages, true);
  }

  if (!upstream.ok) {
    const errMsg = typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error || data);
    throw new Error(errMsg || `Hugging Face returned ${upstream.status}`);
  }

  return data?.choices?.[0]?.message?.content?.trim() || '';
}
