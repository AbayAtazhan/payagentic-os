// Step 1: the client clicks the PayPal button to fund a milestone.
import { handler } from '@/lib/http';
import { createAuthorizeOrder } from '@/lib/paypal';
import { parseTerms } from '@/lib/policy';

export const POST = handler(async (body) => {
  const terms = parseTerms(body.terms);
  const order = await createAuthorizeOrder({
    milestoneId: terms.milestoneId,
    title: terms.title,
    amount: terms.amount,
    currency: terms.currency,
  });
  return { orderId: order.id };
});
