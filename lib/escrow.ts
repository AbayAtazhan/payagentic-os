import { captureAuthorization, createPayout, getAuthorization, voidAuthorization } from './paypal';
import { checkTerms, parseTerms, splitAmount } from './policy';
import type { Release, Terms } from './types';

export class EscrowError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Reads { terms, authorizationId, termsToken } from a request body and checks the signature. */
export function lockedTerms(body: Record<string, unknown>): { terms: Terms; authorizationId: string } {
  const terms = parseTerms(body.terms);
  const authorizationId = String(body.authorizationId ?? '');
  if (!authorizationId) throw new EscrowError('This milestone is not funded yet');
  if (!checkTerms(terms, authorizationId, String(body.termsToken ?? ''))) {
    throw new EscrowError('These terms do not match what was locked when the milestone was funded', 409);
  }
  return { terms, authorizationId };
}

/** PayPal is the source of truth: the hold must still exist and match the agreed amount. */
async function assertHoldMatches(terms: Terms, authorizationId: string) {
  const auth = await getAuthorization(authorizationId);
  if (auth.status !== 'CREATED' && auth.status !== 'PENDING') {
    throw new EscrowError(`PayPal reports this hold as ${auth.status}; nothing to release`, 409);
  }
  if (Number(auth.amount.value).toFixed(2) !== terms.amount || auth.amount.currency_code !== terms.currency) {
    throw new EscrowError(
      `PayPal hold is ${auth.amount.value} ${auth.amount.currency_code}, terms say ${terms.amount} ${terms.currency}`,
      409,
    );
  }
}

/** Capture the held money and pay the freelancer their share. */
export async function releaseFunds(terms: Terms, authorizationId: string, releasedBy: Release['releasedBy']): Promise<Release> {
  await assertHoldMatches(terms, authorizationId);
  const split = splitAmount(terms.amount);

  const capture = await captureAuthorization(authorizationId, `ProofPay released "${terms.title}" after verification`);
  const release: Release = { captureId: capture.id, ...split, releasedBy };

  try {
    const payout = await createPayout({
      milestoneId: terms.milestoneId,
      authorizationId,
      receiverEmail: terms.freelancerEmail,
      amount: split.payoutAmount,
      currency: terms.currency,
      note: `Payment for "${terms.title}" - work verified by ProofPay.`,
    });
    release.payoutBatchId = payout.batch_header.payout_batch_id;
  } catch (err) {
    // The client's money is already captured; report the payout problem instead of hiding it.
    release.payoutError = (err as Error).message;
  }
  return release;
}

export async function refundHold(terms: Terms, authorizationId: string): Promise<void> {
  await assertHoldMatches(terms, authorizationId);
  await voidAuthorization(authorizationId);
}
