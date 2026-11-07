import { NextResponse } from 'next/server';
import {
  executeApprovedAction,
  rejectAction,
  runAgentScan,
  updateAgentConfig,
} from '@/lib/agent/engine';
import { isPayPalConfigured, isSimulationMode } from '@/lib/paypal';

export async function GET() {
  try {
    const data = await runAgentScan(false);
    return NextResponse.json({
      success: true,
      actions: data.actions,
      logs: data.logs,
      config: data.config,
      balances: data.balances,
      environment: {
        isPayPalConfigured: isPayPalConfigured(),
        isSimulationMode: isSimulationMode(),
      },
    });
  } catch (error) {
    console.error('[Agent API] scan error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, actionId, config, reason } = body;

    if (action === 'approve') {
      if (!actionId) return NextResponse.json({ error: 'Missing actionId' }, { status: 400 });
      const result = await executeApprovedAction(actionId);
      if (!result.success) {
        return NextResponse.json(result, { status: 404 });
      }
      return NextResponse.json(result);
    }

    if (action === 'reject') {
      if (!actionId) return NextResponse.json({ error: 'Missing actionId' }, { status: 400 });
      const ok = await rejectAction(actionId, reason);
      return NextResponse.json({ success: ok });
    }

    if (action === 'update_config') {
      const updated = updateAgentConfig(config);
      return NextResponse.json({ success: true, config: updated });
    }

    if (action === 'rescan') {
      const data = await runAgentScan(true);
      return NextResponse.json({ success: true, ...data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Agent API] mutation error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
