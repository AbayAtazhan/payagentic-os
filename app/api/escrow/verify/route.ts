// Step 3: the freelancer submits a link. The AI checks it; if policy allows, money is released at once.
import { verifyWork } from '@/lib/agents';
import { collectEvidence } from '@/lib/evidence';
import { lockedTerms, releaseFunds } from '@/lib/escrow';
import { handler, rateLimit } from '@/lib/http';
import type { Release, Verdict } from '@/lib/types';

export const maxDuration = 90;

export const POST = handler(async (body, req): Promise<{ verdict: Verdict; release?: Release; releaseError?: string }> => {
  rateLimit(req);
  const { terms, authorizationId } = lockedTerms(body);
  const url = String(body.url ?? '').trim();
  if (!url) throw new Error('Paste the link to your delivered work');

  const evidence = await collectEvidence(url, new URL(req.url).origin);
  const verdict = await verifyWork(terms, evidence, String(body.note ?? ''));

  if (!verdict.policy.autoRelease) return { verdict };
  try {
    return { verdict, release: await releaseFunds(terms, authorizationId, 'ai') };
  } catch (err) {
    return { verdict, releaseError: (err as Error).message };
  }
});
