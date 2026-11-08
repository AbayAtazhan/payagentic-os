import { aiConfig, aiEnabled } from '@/lib/ai';
import { handler } from '@/lib/http';
import { paypalMode, publicClientId } from '@/lib/paypal';
import { POLICY } from '@/lib/policy';
import type { AppConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const GET = handler(
  async (): Promise<AppConfig> => ({
    paypalMode: paypalMode(),
    paypalClientId: publicClientId(),
    aiEnabled: aiEnabled(),
    aiModel: aiConfig().model,
    demoFreelancerEmail: process.env.DEMO_FREELANCER_EMAIL || 'alex.rivera.dev@example.com',
    policy: POLICY,
  }),
);
