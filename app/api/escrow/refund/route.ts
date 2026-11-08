// The client cancels a funded milestone: the PayPal hold is voided and nothing is charged.
import { lockedTerms, refundHold } from '@/lib/escrow';
import { handler } from '@/lib/http';

export const POST = handler(async (body) => {
  const { terms, authorizationId } = lockedTerms(body);
  await refundHold(terms, authorizationId);
  return { voided: true };
});
