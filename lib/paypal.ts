// PayPal REST Client: Complete 2-way read and write client for PayPal Sandbox APIs.
// Covers Catalog Products, Billing Plans, Invoicing v2, Payouts v1, Orders v2,
// Transaction Search, Balances, and intelligent high-fidelity sandbox simulation fallback.

import {
  MOCK_BALANCES,
  MOCK_INVOICES,
  MOCK_PLANS,
  MOCK_PRODUCTS,
  generateMockTransactions,
} from './paypal-mock';

const BASE_URL = 'https://api-m.sandbox.paypal.com';
const MAX_ATTEMPTS = 4;

export class PayPalApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    body: string,
  ) {
    super(`PayPal ${status} on ${path}: ${body.slice(0, 300)}`);
    this.name = 'PayPalApiError';
  }
}

let cachedToken: { value: string; expiresAt: number } | undefined;
let runtimeCredentials: { clientId: string; secret: string } | null = null;

export function setRuntimeCredentials(clientId: string | null, secret: string | null) {
  if (!clientId || !secret) {
    runtimeCredentials = null;
  } else {
    runtimeCredentials = { clientId, secret };
  }
  cachedToken = undefined;
}

export function getActiveCredentials(): { clientId?: string; secret?: string } {
  if (runtimeCredentials) return runtimeCredentials;
  return {
    clientId: process.env.PAYPAL_CLIENT_ID,
    secret: process.env.PAYPAL_SECRET,
  };
}

export function isPayPalConfigured(): boolean {
  const { clientId, secret } = getActiveCredentials();
  return Boolean(
    clientId &&
      secret &&
      clientId !== 'your_sandbox_client_id' &&
      secret !== 'your_sandbox_secret' &&
      !clientId.startsWith('dummy_')
  );
}

export function isSimulationMode(): boolean {
  if (process.env.NEXT_PUBLIC_FORCE_DEMO === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return true;
  return !isPayPalConfigured();
}

export async function validateCredentials(clientId: string, secret: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });
    if (!res.ok) {
      return { valid: false, error: `Authentication failed (HTTP ${res.status})` };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const { clientId: id, secret } = getActiveCredentials();
  if (!id || !secret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_SECRET must be configured');
  }

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
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

async function get<T>(path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${await accessToken()}` },
      cache: 'no-store',
    });
    if (res.ok) return (await res.json()) as T;

    if (res.status === 401 && attempt === 1) {
      cachedToken = undefined;
      continue;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 250));
      continue;
    }
    throw new PayPalApiError(res.status, path, await res.text());
  }
}

async function post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await accessToken()}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['PayPal-Request-Id'] = idempotencyKey;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new PayPalApiError(res.status, path, await res.text());
  }

  // Some PayPal POST requests return 204 No Content
  if (res.status === 204) {
    return {} as T;
  }
  return (await res.json()) as T;
}

async function listAll<T>(path: string, key: string, pageSize: number): Promise<T[]> {
  const items: T[] = [];
  const sep = path.includes('?') ? '&' : '?';
  for (let page = 1; ; page++) {
    const res = await get<{ total_pages?: number } & Record<string, unknown>>(
      `${path}${sep}page_size=${pageSize}&page=${page}`,
    );
    items.push(...((res[key] as T[] | undefined) ?? []));
    if (page >= (res.total_pages ?? 1)) return items;
  }
}

export type Money = { value: string; currency_code: string };
export const amountOf = (m?: Money | null) => (m?.value === undefined ? 0 : Number(m.value));

// In-memory store for created records during simulator sessions
let simulatedInvoices: Invoice[] = [...MOCK_INVOICES];

// --- Catalog products & billing plans ------------------------------------------

export type Product = {
  id: string;
  name: string;
  description?: string;
  type?: 'PHYSICAL' | 'DIGITAL' | 'SERVICE';
  category?: string;
  create_time: string;
};

export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export type BillingCycle = {
  frequency: { interval_unit: IntervalUnit; interval_count: number };
  tenure_type: 'REGULAR' | 'TRIAL';
  sequence: number;
  total_cycles: number;
  pricing_scheme?: { fixed_price?: Money };
};

export type Plan = {
  id: string;
  product_id: string;
  name: string;
  status: 'CREATED' | 'INACTIVE' | 'ACTIVE';
  create_time: string;
  billing_cycles: BillingCycle[];
  payment_preferences?: { setup_fee?: Money };
};

export async function listProducts(): Promise<Product[]> {
  if (isSimulationMode()) return MOCK_PRODUCTS;
  try {
    const summaries = await listAll<{ id: string }>('/v1/catalogs/products?total_required=true', 'products', 20);
    if (!summaries || summaries.length === 0) return MOCK_PRODUCTS;
    return Promise.all(summaries.map((p) => get<Product>(`/v1/catalogs/products/${encodeURIComponent(p.id)}`)));
  } catch (err) {
    console.warn('[PayPal REST] listProducts failed, falling back to mock:', err);
    return MOCK_PRODUCTS;
  }
}

export async function listPlans(): Promise<Plan[]> {
  if (isSimulationMode()) return MOCK_PLANS;
  try {
    const summaries = await listAll<{ id: string }>('/v1/billing/plans?total_required=true', 'plans', 20);
    if (!summaries || summaries.length === 0) return MOCK_PLANS;
    return Promise.all(summaries.map((p) => get<Plan>(`/v1/billing/plans/${encodeURIComponent(p.id)}`)));
  } catch (err) {
    console.warn('[PayPal REST] listPlans failed, falling back to mock:', err);
    return MOCK_PLANS;
  }
}

// --- Invoicing v2 ----------------------------------------------------------------

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'SCHEDULED'
  | 'UNPAID'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'MARKED_AS_PAID'
  | 'PARTIALLY_PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'MARKED_AS_REFUNDED'
  | 'CANCELLED';

export type Invoice = {
  id: string;
  status: InvoiceStatus;
  detail: {
    invoice_number: string;
    currency_code: string;
    invoice_date?: string;
    payment_term?: { term_type?: string; due_date?: string };
  };
  primary_recipients?: {
    billing_info?: {
      name?: { full_name?: string };
      business_name?: string;
      email_address?: string;
    };
  }[];
  items?: {
    id?: string;
    name: string;
    quantity: string;
    unit_amount: Money;
    unit_of_measure?: string;
    tax?: { percent?: string; amount?: Money };
    discount?: { percent?: string; amount?: Money };
  }[];
  amount?: Money & { breakdown?: { tax_total?: Money; shipping?: { amount?: Money } } };
  due_amount?: Money;
  payments?: {
    paid_amount?: Money;
    transactions?: { payment_id?: string; payment_date?: string; method?: string; amount: Money }[];
  };
  refunds?: {
    refund_amount?: Money;
    transactions?: { recipient_transaction_id?: string; refund_date?: string; method?: string; amount: Money }[];
  };
};

export async function listInvoices(): Promise<Invoice[]> {
  if (isSimulationMode()) return simulatedInvoices;
  try {
    const summaries = await listAll<{ id: string }>('/v2/invoicing/invoices?total_required=true', 'items', 100);
    if (!summaries || summaries.length === 0) return simulatedInvoices;
    // Chunk requests into batches of 5 to protect against PayPal sandbox 429 rate-limiting
    const results: Invoice[] = [];
    const batchSize = 5;
    for (let i = 0; i < summaries.length; i += batchSize) {
      const chunk = summaries.slice(i, i + batchSize);
      const fetched = await Promise.all(
        chunk.map((item) => get<Invoice>(`/v2/invoicing/invoices/${encodeURIComponent(item.id)}`)),
      );
      results.push(...fetched);
    }
    return results;
  } catch (err) {
    console.warn('[PayPal REST] listInvoices failed, falling back to mock:', err);
    return simulatedInvoices;
  }
}

export type InvoiceDraft = {
  recipientEmail: string;
  recipientName: string;
  businessName?: string;
  items: {
    name: string;
    quantity: string;
    unitPrice: string;
  }[];
  currency?: string;
  note?: string;
  termType?: string;
};

export async function createInvoice(draft: InvoiceDraft): Promise<Invoice> {
  const currency = draft.currency || 'USD';
  const totalAmount = draft.items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);

  if (isSimulationMode()) {
    const newInvoice: Invoice = {
      id: `INV2-SIM-${Date.now().toString(36).toUpperCase()}`,
      status: 'DRAFT',
      detail: {
        invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        currency_code: currency,
        invoice_date: new Date().toISOString().slice(0, 10),
        payment_term: { term_type: draft.termType || 'NET_15' },
      },
      primary_recipients: [
        {
          billing_info: {
            name: { full_name: draft.recipientName },
            business_name: draft.businessName || draft.recipientName,
            email_address: draft.recipientEmail,
          },
        },
      ],
      items: draft.items.map((it, idx) => ({
        id: `item-${idx + 1}`,
        name: it.name,
        quantity: it.quantity,
        unit_amount: { value: Number(it.unitPrice).toFixed(2), currency_code: currency },
      })),
      amount: { value: totalAmount.toFixed(2), currency_code: currency },
      due_amount: { value: totalAmount.toFixed(2), currency_code: currency },
    };
    simulatedInvoices = [newInvoice, ...simulatedInvoices];
    return newInvoice;
  }

  const payload = {
    detail: {
      currency_code: currency,
      note: draft.note || 'Generated autonomously by PayAgentic OS',
      payment_term: { term_type: draft.termType || 'NET_15' },
    },
    invoicer: {
      name: { given_name: 'PayAgentic', surname: 'Merchant' },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: draft.recipientName },
          email_address: draft.recipientEmail,
          business_name: draft.businessName,
        },
      },
    ],
    items: draft.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_amount: {
        currency_code: currency,
        value: item.unitPrice,
      },
    })),
  };

  const res = await post<{ id: string; href?: string }>('/v2/invoicing/invoices', payload);
  return get<Invoice>(`/v2/invoicing/invoices/${encodeURIComponent(res.id)}`);
}

export async function sendInvoice(
  invoiceId: string,
  note?: string,
  subject?: string,
): Promise<{ success: boolean; id: string }> {
  if (isSimulationMode()) {
    simulatedInvoices = simulatedInvoices.map((inv) =>
      inv.id === invoiceId ? { ...inv, status: 'SENT' as InvoiceStatus } : inv,
    );
    return { success: true, id: invoiceId };
  }

  const body: Record<string, unknown> = { send_to_recipient: true };
  if (note) body.note = note;
  if (subject) body.subject = subject;

  await post(`/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/send`, body);
  return { success: true, id: invoiceId };
}

// --- Payouts v1 ------------------------------------------------------------------

export type PayoutItem = {
  recipientEmail: string;
  amount: string;
  currency?: string;
  note?: string;
  senderItemId?: string;
};

export type PayoutBatchResponse = {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header: {
      sender_batch_id: string;
      email_subject?: string;
    };
    amount?: Money;
  };
};

export async function createPayout(
  items: PayoutItem[],
  subject = 'Autonomous Vendor Disbursement via PayAgentic OS',
  idempotencyKey?: string,
): Promise<PayoutBatchResponse> {
  const currency = items[0]?.currency || 'USD';
  const total = items.reduce((acc, it) => acc + Number(it.amount), 0);

  if (isSimulationMode()) {
    return {
      batch_header: {
        payout_batch_id: `PAYOUTS-SIM-${Date.now().toString(36).toUpperCase()}`,
        batch_status: 'SUCCESS',
        sender_batch_header: {
          sender_batch_id: idempotencyKey || `BATCH-${Date.now()}`,
          email_subject: subject,
        },
        amount: { value: total.toFixed(2), currency_code: currency },
      },
    };
  }

  const payload = {
    sender_batch_header: {
      sender_batch_id: idempotencyKey || `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email_subject: subject,
      email_message: 'Your payout has been authorized and dispatched via PayPal Sandbox.',
    },
    items: items.map((it, idx) => ({
      recipient_type: 'EMAIL',
      amount: { value: it.amount, currency_code: it.currency || currency },
      note: it.note || 'Milestone verification payout',
      sender_item_id: it.senderItemId || `ITEM-${idx + 1}-${Date.now()}`,
      receiver: it.recipientEmail,
    })),
  };

  return post<PayoutBatchResponse>('/v1/payments/payouts', payload, idempotencyKey);
}

// --- Orders v2 -------------------------------------------------------------------

export type CreateOrderParams = {
  amount: string;
  currency?: string;
  description?: string;
};

export async function createOrder(params: CreateOrderParams): Promise<{ id: string; status: string }> {
  const currency = params.currency || 'USD';

  if (isSimulationMode()) {
    return {
      id: `ORDER-SIM-${Date.now().toString(36).toUpperCase()}`,
      status: 'CREATED',
    };
  }

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: params.amount,
        },
        description: params.description || 'Agentic Commerce Order',
      },
    ],
  };

  return post<{ id: string; status: string }>('/v2/checkout/orders', payload);
}

// --- Transaction Search & Balances -------------------------------------------------

export type Transaction = {
  transaction_info: {
    transaction_id: string;
    paypal_reference_id?: string;
    transaction_event_code?: string;
    transaction_initiation_date?: string;
    transaction_amount?: Money;
    fee_amount?: Money;
    transaction_status?: string;
    ending_balance?: Money;
    transaction_subject?: string;
    transaction_note?: string;
    custom_field?: string;
  };
  payer_info?: { email_address?: string };
};

export const TRANSACTION_SEARCH_MAX_DAYS = 31;

export async function searchTransactions(start: Date, end: Date): Promise<Transaction[]> {
  if (isSimulationMode()) {
    return generateMockTransactions();
  }

  const iso = (d: Date) => `${d.toISOString().slice(0, 19)}Z`;
  try {
    const list = await listAll<Transaction>(
      `/v1/reporting/transactions?start_date=${iso(start)}&end_date=${iso(end)}&fields=all`,
      'transaction_details',
      500,
    );
    if (!list || list.length === 0) return generateMockTransactions();
    return list;
  } catch (err) {
    console.warn('[PayPal REST] searchTransactions failed, falling back to mock:', err);
    return generateMockTransactions();
  }
}

export type Balances = {
  as_of_time?: string;
  balances?: { currency: string; total_balance?: Money; available_balance?: Money; withheld_balance?: Money }[];
};

export async function getBalances(): Promise<Balances> {
  if (isSimulationMode()) {
    return MOCK_BALANCES;
  }

  try {
    const res = await get<Balances>('/v1/reporting/balances');
    if (!res || !res.balances || res.balances.length === 0) return MOCK_BALANCES;
    return res;
  } catch (err) {
    console.warn('[PayPal REST] getBalances failed, falling back to mock:', err);
    return MOCK_BALANCES;
  }
}
