import { NextResponse } from 'next/server';
import { EscrowError } from './escrow';
import { PayPalApiError } from './paypal';

/** Wraps a route handler: parses JSON, turns thrown errors into readable JSON responses. */
export function handler(fn: (body: Record<string, unknown>, req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      const body = req.method === 'GET' ? {} : ((await req.json().catch(() => ({}))) as Record<string, unknown>);
      return NextResponse.json(await fn(body, req));
    } catch (err) {
      const status = err instanceof EscrowError ? err.status : err instanceof PayPalApiError ? 502 : 400;
      console.error(`[${new URL(req.url).pathname}]`, (err as Error).message);
      return NextResponse.json({ error: (err as Error).message }, { status });
    }
  };
}

// Simple per-IP limit for the AI routes so a public demo can't run up the AI bill.
const hits = new Map<string, number[]>();
export function rateLimit(req: Request, max = 20, windowMs = 10 * 60_000) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw new EscrowError('Too many AI requests from this address. Try again in a few minutes.', 429);
  recent.push(now);
  hits.set(ip, recent);
}
