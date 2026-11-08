// Minimal client for any OpenAI-compatible chat API. Defaults to DeepSeek;
// set AI_BASE_URL / AI_MODEL to use another provider (OpenAI, Groq, a local server...).

export function aiConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, ''),
    model: process.env.AI_MODEL || 'deepseek-flash',
  };
}

export const aiEnabled = () => Boolean(aiConfig().apiKey);

function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : content).trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error('The AI did not return valid JSON');
  }
}

export async function chatJson<T>(system: string, user: string, temperature = 0.1): Promise<{ data: T; model: string }> {
  const { apiKey, baseUrl, model } = aiConfig();
  if (!apiKey) throw new Error('AI is not configured: set DEEPSEEK_API_KEY');

  const request = async (jsonMode: boolean) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: 12000,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
      cache: 'no-store',
    });

  let res = await request(true);
  // Some providers reject response_format; the prompt already asks for JSON, so retry without it.
  if (res.status === 400) res = await request(false);
  if (!res.ok) throw new Error(`AI provider returned ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const body = (await res.json()) as { model?: string; choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content ?? '';
  return { data: extractJson(content) as T, model: body.model || model };
}
