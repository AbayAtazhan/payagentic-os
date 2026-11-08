// PayPal REST client for the ProofPay escrow flow (sandbox):
//   1. createAuthorizeOrder  - client funds a milestone (Orders v2, intent AUTHORIZE)
//   2. authorizeOrder        - money is held on the client's account, not taken yet
//   3. captureAuthorization  - AI-verified work: take the held money
//   4. createPayout          - send the freelancer their share (Payouts v1)
//   5. voidAuthorization     - work rejected: release the hold back to the client
// Without sandbox keys every call is simulated, so the app still runs end to end.

import crypto from 'crypto';

const BASE_URL = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

export class PayPalApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: string,
  ) {
    super(describePayPalError(status, path, body));
    this.name = 'PayPalApiError';
  }
}

function describePayPalError(status: number, path: string, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      name?: string;
      message?: string;
      details?: { issue?: string; description?: string }[];
      debug_id?: string;
    };
    const detail = parsed.details?.[0];
    const issue = detail ? `${detail.issue}: ${detail.description}` : parsed.message;
    return `PayPal ${status} ${parsed.name ?? ''} on ${path} - ${issue ?? 'unknown error'}${
      parsed.debug_id ? ` (debug_id ${parsed.debug_id})` : ''
    }`;
  } catch {
    return `PayPal ${status} on ${path}: ${body.slice(0, 300)}`;
  }
}

function credentials() {
  return {
    clientId: process.env.PAYPAL_CLIENT_ID,
    secret: process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET,
  };
}

export function isPayPalConfigured(): boolean {
  const { clientId, secret } = credentials();
  return Boolean(clientId && secret);
}

export function paypalMode(): 'sandbox' | 'simulated' {
  return isPayPalConfigured() ? 'sandbox' : 'simulated';
}

export function publicClientId(): string | null {
  return isPayPalConfigured() ? (credentials().clientId as string) : null;
}

let cachedToken: { value: string; expiresAt: number } | undefined;

async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const { clientId, secret } = credentials();
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) throw new PayPalApiError(res.status, '/v1/oauth2/token', await res.text());
  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown, requestId?: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    // PayPal-Request-Id makes retries safe: PayPal returns the first result instead of moving money twice.
    if (requestId) headers['PayPal-Request-Id'] = requestId;

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    if (res.ok) {
      if (res.status === 204) return {} as T;
      const text = await res.text();
      return (text ? JSON.parse(text) : {}) as T;
    }
    if (res.status === 401 && attempt === 1) {
      cachedToken = undefined;
      continue;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      continue;
    }
    throw new PayPalApiError(res.status, path, await res.text());
  }
}

// ---------------------------------------------------------------------------------------------
// Types

export type Money = { currency_code: string; value: string };

export type AuthorizationStatus =
  | 'CREATED'
  | 'CAPTURED'
  | 'DENIED'
  | 'PARTIALLY_CAPTURED'
  | 'VOIDED'
  | 'PENDING'
  | 'EXPIRED';

export type Authorization = {
  id: string;
  status: AuthorizationStatus;
  amount: Money;
  expiration_time?: string;
  custom_id?: string;
};

export type Capture = { id: string; status: string; amount?: Money };

export type PayoutBatch = {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header?: { sender_batch_id: string };
  };
};

// In simulated mode the "PayPal" state lives here (per server instance).
const simAuthorizations = new Map<string, Authorization>();
const simOrders = new Map<string, { amount: Money; customId: string }>();
const simId = (prefix: string) => `${prefix}-SIM-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

// ---------------------------------------------------------------------------------------------
// 1. Create an order the client approves in the PayPal popup

export async function createAuthorizeOrder(params: {
  milestoneId: string;
  title: string;
  amount: string;
  currency?: string;
}): Promise<{ id: string }> {
  const amount: Money = { currency_code: params.currency || 'USD', value: params.amount };
  if (paypalMode() === 'simulated') {
    const id = simId('ORDER');
    simOrders.set(id, { amount, customId: params.milestoneId });
    return { id };
  }
  const order = await call<{ id: string }>(
    'POST',
    '/v2/checkout/orders',
    {
      intent: 'AUTHORIZE',
      purchase_units: [
        {
          reference_id: params.milestoneId.slice(0, 256),
          custom_id: params.milestoneId.slice(0, 127),
          description: `ProofPay escrow: ${params.title}`.slice(0, 127),
          soft_descriptor: 'PROOFPAY',
          amount,
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'ProofPay',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'CONTINUE',
          },
        },
      },
    },
    `order-${params.milestoneId}-${crypto.randomUUID()}`,
  );
  return { id: order.id };
}

// 2. After approval: place the hold

export async function authorizeOrder(orderId: string): Promise<Authorization> {
  if (paypalMode() === 'simulated') {
    const order = simOrders.get(orderId);
    if (!order) throw new Error(`Unknown simulated order ${orderId}`);
    const auth: Authorization = {
      id: simId('AUTH'),
      status: 'CREATED',
      amount: order.amount,
      custom_id: order.customId,
      expiration_time: new Date(Date.now() + 29 * 86_400_000).toISOString(),
    };
    simAuthorizations.set(auth.id, auth);
    return auth;
  }
  const res = await call<{
    purchase_units: { payments?: { authorizations?: Authorization[] } }[];
  }>('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`, {}, `authorize-${orderId}`);
  const auth = res.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth) throw new Error('PayPal did not return an authorization for this order');
  return auth;
}

// The live state of a hold, straight from PayPal. Used before moving any money.

export async function getAuthorization(authorizationId: string): Promise<Authorization> {
  if (paypalMode() === 'simulated') {
    const auth = simAuthorizations.get(authorizationId);
    if (!auth) throw new Error(`Unknown simulated authorization ${authorizationId}`);
    return auth;
  }
  return call<Authorization>('GET', `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}`);
}

// 3. Take the held money

export async function captureAuthorization(authorizationId: string, note: string): Promise<Capture> {
  if (paypalMode() === 'simulated') {
    const auth = simAuthorizations.get(authorizationId);
    if (auth) auth.status = 'CAPTURED';
    return { id: simId('CAPTURE'), status: 'COMPLETED', amount: auth?.amount };
  }
  return call<Capture>(
    'POST',
    `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`,
    { final_capture: true, note_to_payer: note.slice(0, 255) },
    `capture-${authorizationId}`,
  );
}

// 5. Give the hold back to the client

export async function voidAuthorization(authorizationId: string): Promise<void> {
  if (paypalMode() === 'simulated') {
    const auth = simAuthorizations.get(authorizationId);
    if (auth) auth.status = 'VOIDED';
    return;
  }
  await call('POST', `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`, {}, `void-${authorizationId}`);
}

// 4. Pay the freelancer

export async function createPayout(params: {
  milestoneId: string;
  authorizationId: string;
  receiverEmail: string;
  amount: string;
  currency: string;
  note: string;
}): Promise<PayoutBatch> {
  // One payout per authorization, ever: the batch id doubles as the idempotency key.
  const senderBatchId = `PP-${params.authorizationId}`.slice(0, 127);
  if (paypalMode() === 'simulated') {
    return {
      batch_header: {
        payout_batch_id: simId('PAYOUT'),
        batch_status: 'SUCCESS',
        sender_batch_header: { sender_batch_id: senderBatchId },
      },
    };
  }
  return call<PayoutBatch>(
    'POST',
    '/v1/payments/payouts',
    {
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: 'You got paid via ProofPay',
        email_message: params.note.slice(0, 1000),
      },
      items: [
        {
          recipient_type: 'EMAIL',
          receiver: params.receiverEmail,
          amount: { value: params.amount, currency: params.currency },
          note: params.note.slice(0, 4000),
          sender_item_id: params.milestoneId.slice(0, 63),
        },
      ],
    },
    senderBatchId,
  );
}
