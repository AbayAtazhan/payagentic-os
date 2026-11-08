// Money rules. The AI only reports facts (which criteria are met, with evidence);
// this code - not the model - decides whether money moves.

import crypto from 'crypto';
import type { CriterionResult, Terms, Verdict } from './types';

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const POLICY = {
  /** AI may release payment on its own only up to this amount. Above it, the client confirms. */
  autoReleaseCap: num(process.env.AUTO_RELEASE_CAP, 500),
  /** Below this confidence the AI's pass goes to the client instead of releasing money. */
  minConfidence: num(process.env.MIN_CONFIDENCE, 80),
  /** ProofPay's cut, kept on the platform account; the rest is paid out to the freelancer. */
  feePercent: num(process.env.PLATFORM_FEE_PERCENT, 5),
};

export function decide(
  results: CriterionResult[],
  confidence: number,
  manipulationDetected: boolean,
  amount: number,
): Pick<Verdict, 'decision' | 'policy'> {
  const unmet = results.filter((r) => r.status === 'not_met').length;
  const unclear = results.filter((r) => r.status === 'unclear').length;

  if (manipulationDetected) {
    return {
      decision: 'review',
      policy: { autoRelease: false, reason: 'The delivery contains text aimed at the AI reviewer. A human must look at it.' },
    };
  }
  if (results.length === 0) {
    return { decision: 'review', policy: { autoRelease: false, reason: 'No criteria could be evaluated.' } };
  }
  if (unmet > 0) {
    return {
      decision: 'changes',
      policy: { autoRelease: false, reason: `${unmet} of ${results.length} criteria not met. Money stays on hold.` },
    };
  }
  if (unclear > 0) {
    return {
      decision: 'review',
      policy: { autoRelease: false, reason: `${unclear} criteria could not be confirmed from the delivery. Client decides.` },
    };
  }
  if (confidence < POLICY.minConfidence) {
    return {
      decision: 'review',
      policy: { autoRelease: false, reason: `AI confidence ${confidence}% is below the ${POLICY.minConfidence}% floor. Client decides.` },
    };
  }
  if (amount > POLICY.autoReleaseCap) {
    return {
      decision: 'approve',
      policy: {
        autoRelease: false,
        reason: `All criteria met, but $${amount.toFixed(2)} is above the $${POLICY.autoReleaseCap} auto-release cap. Client confirms with one click.`,
      },
    };
  }
  return {
    decision: 'approve',
    policy: { autoRelease: true, reason: `All criteria met with ${confidence}% confidence and under the $${POLICY.autoReleaseCap} cap. Released automatically.` },
  };
}

export function splitAmount(gross: string) {
  const grossCents = Math.round(Number(gross) * 100);
  const feeCents = Math.round((grossCents * POLICY.feePercent) / 100);
  const toStr = (c: number) => (c / 100).toFixed(2);
  return { grossAmount: toStr(grossCents), feeAmount: toStr(feeCents), payoutAmount: toStr(grossCents - feeCents) };
}

// --- Locked terms -----------------------------------------------------------------------------
// When the client funds a milestone the server signs (terms + PayPal authorization id).
// Every later step must present that signature, so nobody can quietly change the criteria,
// the amount or the payee after money is on hold.

function secret(): string {
  const s = process.env.PROOFPAY_SECRET || process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET;
  return s || 'proofpay-local-dev-secret';
}

function canonical(terms: Terms, authorizationId: string): string {
  return JSON.stringify([
    terms.milestoneId,
    terms.title,
    Number(terms.amount).toFixed(2),
    terms.currency,
    terms.criteria,
    terms.freelancerEmail.trim().toLowerCase(),
    authorizationId,
  ]);
}

export function signTerms(terms: Terms, authorizationId: string): string {
  return crypto.createHmac('sha256', secret()).update(canonical(terms, authorizationId)).digest('hex');
}

export function checkTerms(terms: Terms, authorizationId: string, token: string): boolean {
  const expected = Buffer.from(signTerms(terms, authorizationId), 'hex');
  const given = Buffer.from(String(token || ''), 'hex');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function parseTerms(input: unknown): Terms {
  const t = (input ?? {}) as Record<string, unknown>;
  const criteria = Array.isArray(t.criteria) ? t.criteria.map(String).filter(Boolean) : [];
  const amount = Number(t.amount);
  const email = String(t.freelancerEmail ?? '').trim();
  if (!t.milestoneId || !t.title) throw new Error('Milestone id and title are required');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error('Amount must be between 0 and 10,000');
  if (criteria.length === 0 || criteria.length > 8) throw new Error('A milestone needs 1 to 8 criteria');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid freelancer PayPal email is required');
  return {
    milestoneId: String(t.milestoneId),
    title: String(t.title).slice(0, 120),
    amount: amount.toFixed(2),
    currency: String(t.currency || 'USD'),
    criteria: criteria.map((c) => c.slice(0, 300)),
    freelancerEmail: email,
  };
}
