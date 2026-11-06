import { NextResponse } from 'next/server';
import {
  getActiveCredentials,
  isPayPalConfigured,
  isSimulationMode,
  setRuntimeCredentials,
  validateCredentials,
} from '@/lib/paypal';

export async function GET() {
  const { clientId } = getActiveCredentials();
  return NextResponse.json({
    configured: isPayPalConfigured(),
    simulationMode: isSimulationMode(),
    maskedClientId: clientId ? `${clientId.slice(0, 8)}...${clientId.slice(-4)}` : null,
  });
}

export async function POST(req: Request) {
  try {
    const { action, clientId, secret } = await req.json();

    if (action === 'reset_simulation') {
      setRuntimeCredentials(null, null);
      return NextResponse.json({
        success: true,
        mode: 'SIMULATION',
        message: 'Reverted to high-fidelity merchant simulation mode.',
      });
    }

    if (action === 'connect_sandbox') {
      if (!clientId || !secret) {
        return NextResponse.json(
          { success: false, error: 'Both Client ID and Secret are required' },
          { status: 400 },
        );
      }

      // Validate directly with PayPal Sandbox OAuth endpoint
      const validation = await validateCredentials(clientId, secret);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: `PayPal Sandbox rejected credentials: ${validation.error}` },
          { status: 401 },
        );
      }

      setRuntimeCredentials(clientId, secret);
      return NextResponse.json({
        success: true,
        mode: 'LIVE_SANDBOX',
        message: 'Successfully authenticated with PayPal Sandbox REST API!',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
