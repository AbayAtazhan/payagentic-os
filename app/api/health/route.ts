import { NextResponse } from 'next/server';
import { aiEnabled } from '@/lib/ai';
import { paypalMode } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ProofPay',
    paypal: paypalMode(),
    ai: aiEnabled() ? 'enabled' : 'missing key',
    time: new Date().toISOString(),
  });
}
