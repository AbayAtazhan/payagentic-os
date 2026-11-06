import { NextResponse } from 'next/server';
import { isPayPalConfigured, isSimulationMode } from '@/lib/paypal';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PayAgentic OS',
    version: '1.0.0',
    environment: {
      isPayPalConfigured: isPayPalConfigured(),
      isSimulationMode: isSimulationMode(),
      nodeVersion: process.version,
    },
  });
}
