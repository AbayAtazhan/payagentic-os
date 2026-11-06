import { NextResponse } from 'next/server';
import { createInvoice, createOrder, createPayout, sendInvoice } from '@/lib/paypal';
import { recordAudit } from '@/lib/agent/engine';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAmount(val: unknown): { valid: boolean; amount?: number; error?: string } {
  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Amount must be a positive number greater than 0' };
  }
  if (num > 1_000_000) {
    return { valid: false, error: 'Amount exceeds maximum supported single-transaction ceiling ($1,000,000)' };
  }
  return { valid: true, amount: num };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { operation, data } = body;

    const startTime = Date.now();

    if (operation === 'create_and_send_invoice') {
      if (!data?.recipientEmail || !EMAIL_REGEX.test(data.recipientEmail)) {
        return NextResponse.json({ success: false, error: 'Invalid recipient email format' }, { status: 400 });
      }

      const amtCheck = validateAmount(data.amount);
      if (!amtCheck.valid) {
        return NextResponse.json({ success: false, error: amtCheck.error }, { status: 400 });
      }

      const invoice = await createInvoice({
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName || 'Valued Customer',
        businessName: data.businessName || data.recipientName,
        items: [
          {
            name: data.itemName || 'Enterprise Agentic Commerce Service',
            quantity: String(data.quantity || '1'),
            unitPrice: String(amtCheck.amount?.toFixed(2)),
          },
        ],
        termType: data.termType || 'NET_15',
      });

      const sendResult = await sendInvoice(invoice.id);

      recordAudit(
        invoice.id,
        'AR_DUNNING',
        'MANUALLY_APPROVED',
        `Interactive Operator created & sent invoice to ${data.recipientEmail} ($${data.amount})`,
        invoice.id,
      );

      return NextResponse.json({
        success: true,
        latencyMs: Date.now() - startTime,
        endpoint: 'POST /v2/invoicing/invoices + POST /v2/invoicing/send',
        result: {
          invoiceId: invoice.id,
          status: 'SENT',
          dueAmount: invoice.due_amount,
          recipient: data.recipientEmail,
          sendResult,
        },
      });
    }

    if (operation === 'disburse_payout') {
      if (!data?.recipientEmail || !EMAIL_REGEX.test(data.recipientEmail)) {
        return NextResponse.json({ success: false, error: 'Invalid contractor email format' }, { status: 400 });
      }

      const amtCheck = validateAmount(data.amount);
      if (!amtCheck.valid) {
        return NextResponse.json({ success: false, error: amtCheck.error }, { status: 400 });
      }

      const payout = await createPayout(
        [
          {
            recipientEmail: data.recipientEmail,
            amount: String(amtCheck.amount?.toFixed(2)),
            note: data.note || 'Milestone verified payout',
          },
        ],
        data.subject || 'Autonomous Milestone Disbursement',
        `IDEMP-OP-${Date.now()}`,
      );

      const batchId = payout.batch_header.payout_batch_id;
      recordAudit(
        batchId,
        'AP_PAYOUTS',
        'MANUALLY_APPROVED',
        `Interactive Operator dispatched Payout to ${data.recipientEmail} ($${data.amount})`,
        batchId,
      );

      return NextResponse.json({
        success: true,
        latencyMs: Date.now() - startTime,
        endpoint: 'POST /v1/payments/payouts',
        result: payout,
      });
    }

    if (operation === 'create_order') {
      const amtCheck = validateAmount(data.amount);
      if (!amtCheck.valid) {
        return NextResponse.json({ success: false, error: amtCheck.error }, { status: 400 });
      }

      const order = await createOrder({
        amount: String(amtCheck.amount?.toFixed(2)),
        description: data.description || 'Agentic Checkout Order',
      });

      return NextResponse.json({
        success: true,
        latencyMs: Date.now() - startTime,
        endpoint: 'POST /v2/checkout/orders',
        result: order,
      });
    }

    if (operation === 'simulate_webhook') {
      const eventType = data?.eventType || 'INVOICING.INVOICE.PAID';
      const eventId = `WH-SIM-${Date.now().toString(36).toUpperCase()}`;

      recordAudit(
        eventId,
        'RISK_SENTINEL',
        'AUTO_EXECUTED',
        `Simulated PayPal Webhook Received: ${eventType}`,
        eventId,
      );

      return NextResponse.json({
        success: true,
        latencyMs: Date.now() - startTime,
        endpoint: 'POST /api/paypal/webhook',
        result: {
          eventId,
          event_type: eventType,
          status: 'PROCESSED_INTO_AUDIT_LEDGER',
        },
      });
    }

    return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    console.error('[Operations API] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
