// Step 2: the client approved in PayPal. Place the hold and lock the terms.
import { EscrowError } from '@/lib/escrow';
import { handler } from '@/lib/http';
import { authorizeOrder } from '@/lib/paypal';
import { parseTerms, signTerms } from '@/lib/policy';

export const POST = handler(async (body) => {
  const terms = parseTerms(body.terms);
  const orderId = String(body.orderId ?? '');
  if (!orderId) throw new Error('orderId is required');

  const auth = await authorizeOrder(orderId);
  if (Number(auth.amount.value).toFixed(2) !== terms.amount) {
    throw new EscrowError(`PayPal authorized ${auth.amount.value}, but the milestone is ${terms.amount}`, 409);
  }
  return {
    authorizationId: auth.id,
    status: auth.status,
    expiresAt: auth.expiration_time ?? null,
    termsToken: signTerms(terms, auth.id),
  };
});
