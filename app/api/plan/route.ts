import { planDeal } from '@/lib/agents';
import { handler, rateLimit } from '@/lib/http';

export const maxDuration = 60;

export const POST = handler(async (body, req) => {
  rateLimit(req);
  const description = String(body.description ?? '').trim();
  const budget = Number(body.budget);
  if (description.length < 20) throw new Error('Describe the job in a few sentences (at least 20 characters)');
  if (!Number.isFinite(budget) || budget < 1 || budget > 10000) throw new Error('Budget must be between 1 and 10,000');
  return planDeal(description.slice(0, 4000), budget, String(body.currency || 'USD'));
});
