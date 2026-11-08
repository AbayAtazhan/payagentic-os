// The client confirms a release the AI could not do alone (over the cap, or needs review).
import { lockedTerms, releaseFunds } from '@/lib/escrow';
import { handler } from '@/lib/http';

export const POST = handler(async (body) => {
  const { terms, authorizationId } = lockedTerms(body);
  return { release: await releaseFunds(terms, authorizationId, 'client') };
});
