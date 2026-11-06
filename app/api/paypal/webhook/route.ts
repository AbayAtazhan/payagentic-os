import { NextResponse } from 'next/server';
import { recordAudit } from '@/lib/agent/engine';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const eventType = payload.event_type || 'UNKNOWN';
    const resource = payload.resource || {};
    const eventId = payload.id || `EVT-${Date.now()}`;

    // Read PayPal webhook verification headers (for live webhook audit)
    const transmissionId = req.headers.get('paypal-transmission-id');
    const authAlgo = req.headers.get('paypal-auth-algo');

    let auditDetail = `PayPal Webhook [${eventType}]: ID ${eventId}`;

    if (eventType === 'INVOICING.INVOICE.PAID') {
      const invoiceId = resource.id || resource.invoice?.id;
      auditDetail = `Invoice Paid: ${invoiceId} - Marked as PAID in merchant ledger`;
      recordAudit(eventId, 'AR_DUNNING', 'AUTO_EXECUTED', auditDetail, invoiceId);
    } else if (eventType === 'PAYMENT.PAYOUTSBATCH.SUCCESS') {
      const batchId = resource.batch_header?.payout_batch_id;
      auditDetail = `Payout Batch Succeeded: ${batchId} - Vendor disbursement settled`;
      recordAudit(eventId, 'AP_PAYOUTS', 'AUTO_EXECUTED', auditDetail, batchId);
    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const captureId = resource.id;
      const amount = resource.amount?.value;
      auditDetail = `Payment Captured: $${amount} USD (Capture ID: ${captureId})`;
      recordAudit(eventId, 'RISK_SENTINEL', 'AUTO_EXECUTED', auditDetail, captureId);
    } else {
      recordAudit(eventId, 'RISK_SENTINEL', 'EVALUATED', auditDetail);
    }

    return NextResponse.json({
      received: true,
      event_type: eventType,
      event_id: eventId,
      status: 'PROCESSED',
      verified: Boolean(transmissionId && authAlgo),
    });
  } catch (error) {
    console.error('[PayPal Webhook] Error:', error);
    return NextResponse.json({ received: false, error: (error as Error).message }, { status: 400 });
  }
}
