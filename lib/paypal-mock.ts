// Deterministic, realistic high-fidelity mock data for PayPal Sandbox.
// Guarantees zero blank screens and instant interactive testing for hackathon judges
// when live PayPal sandbox credentials are not pre-configured.

import type { Balances, Invoice, Plan, Product, Transaction } from './paypal';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'PROD-AI-ENTERPRISE-01',
    name: 'OmniAI Enterprise Platform',
    description: 'Autonomous financial intelligence and real-time agentic commerce infrastructure',
    type: 'SERVICE',
    category: 'SOFTWARE',
    create_time: '2026-08-15T09:30:00Z',
  },
  {
    id: 'PROD-API-GATEWAY-02',
    name: 'High-Velocity Payment Gateway',
    description: 'Sub-50ms transaction orchestration with automated multi-rail fallback',
    type: 'SERVICE',
    category: 'SOFTWARE',
    create_time: '2026-09-01T11:00:00Z',
  },
  {
    id: 'PROD-COMPLIANCE-03',
    name: 'Automated SOC2 & Risk Sentinel',
    description: 'Continuous audit verification and AML velocity risk screening',
    type: 'SERVICE',
    category: 'SOFTWARE',
    create_time: '2026-09-20T14:15:00Z',
  },
  {
    id: 'PROD-CONSULTING-04',
    name: 'Agentic Workflow Architecture Advisory',
    description: 'Dedicated financial engineering and custom tool-calling optimization',
    type: 'SERVICE',
    category: 'CONSULTING',
    create_time: '2026-10-05T08:00:00Z',
  },
];

export const MOCK_PLANS: Plan[] = [
  {
    id: 'P-SCALE-MONTHLY-2026',
    product_id: 'PROD-AI-ENTERPRISE-01',
    name: 'Enterprise Scale - Monthly Billing',
    status: 'ACTIVE',
    create_time: '2026-08-16T10:00:00Z',
    billing_cycles: [
      {
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '2499.00', currency_code: 'USD' } },
      },
    ],
  },
  {
    id: 'P-GROWTH-ANNUAL-2026',
    product_id: 'PROD-AI-ENTERPRISE-01',
    name: 'Enterprise Growth - Annual Advance',
    status: 'ACTIVE',
    create_time: '2026-08-20T15:30:00Z',
    billing_cycles: [
      {
        frequency: { interval_unit: 'YEAR', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '24000.00', currency_code: 'USD' } },
      },
    ],
  },
  {
    id: 'P-GATEWAY-MICRO-2026',
    product_id: 'PROD-API-GATEWAY-02',
    name: 'API Gateway Metered Base Tier',
    status: 'ACTIVE',
    create_time: '2026-09-02T12:00:00Z',
    billing_cycles: [
      {
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '499.00', currency_code: 'USD' } },
      },
    ],
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV2-ACME-CORP-901',
    status: 'SENT', // Overdue candidate for AR Agent!
    detail: {
      invoice_number: 'INV-2026-901',
      currency_code: 'USD',
      invoice_date: '2026-10-12',
      payment_term: { term_type: 'NET_10', due_date: '2026-10-22' },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: 'Sarah Jenkins' },
          business_name: 'Acme Robotics Corp',
          email_address: 's.jenkins@acmerobotics.example.com',
        },
      },
    ],
    items: [
      {
        name: 'Enterprise Agentic Cluster License (October)',
        quantity: '1',
        unit_amount: { value: '5500.00', currency_code: 'USD' },
      },
      {
        name: 'Priority 24/7 SLA Support',
        quantity: '1',
        unit_amount: { value: '1200.00', currency_code: 'USD' },
      },
    ],
    amount: { value: '6700.00', currency_code: 'USD' },
    due_amount: { value: '6700.00', currency_code: 'USD' },
  },
  {
    id: 'INV2-NEXUS-FIN-882',
    status: 'SENT', // High value pending invoice
    detail: {
      invoice_number: 'INV-2026-882',
      currency_code: 'USD',
      invoice_date: '2026-10-28',
      payment_term: { term_type: 'NET_15', due_date: '2026-11-12' },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: 'David Sterling' },
          business_name: 'Nexus Financial AI Inc',
          email_address: 'finance@nexusfinancial.example.com',
        },
      },
    ],
    items: [
      {
        name: 'Custom Agent Tooling & API Integration Milestone',
        quantity: '1',
        unit_amount: { value: '8400.00', currency_code: 'USD' },
      },
    ],
    amount: { value: '8400.00', currency_code: 'USD' },
    due_amount: { value: '8400.00', currency_code: 'USD' },
  },
  {
    id: 'INV2-GLOBAL-LOG-744',
    status: 'PAID',
    detail: {
      invoice_number: 'INV-2026-744',
      currency_code: 'USD',
      invoice_date: '2026-10-01',
      payment_term: { term_type: 'DUE_ON_RECEIPT', due_date: '2026-10-01' },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: 'Marcus Vance' },
          business_name: 'Global Freight Logistics',
          email_address: 'mvance@globallogistics.example.com',
        },
      },
    ],
    items: [
      {
        name: 'OmniAI Enterprise Subscription (Q4 Prepay)',
        quantity: '1',
        unit_amount: { value: '12500.00', currency_code: 'USD' },
      },
    ],
    amount: { value: '12500.00', currency_code: 'USD' },
    due_amount: { value: '0.00', currency_code: 'USD' },
    payments: {
      paid_amount: { value: '12500.00', currency_code: 'USD' },
      transactions: [
        {
          payment_id: 'PAY-7789421689',
          payment_date: '2026-10-02T14:22:10Z',
          method: 'PAYPAL',
          amount: { value: '12500.00', currency_code: 'USD' },
        },
      ],
    },
  },
  {
    id: 'INV2-VELOCITY-MED-610',
    status: 'PAID',
    detail: {
      invoice_number: 'INV-2026-610',
      currency_code: 'USD',
      invoice_date: '2026-10-15',
      payment_term: { term_type: 'NET_10', due_date: '2026-10-25' },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: 'Dr. Elena Rostova' },
          business_name: 'Velocity Health Tech',
          email_address: 'elena@velocityhealth.example.com',
        },
      },
    ],
    items: [
      {
        name: 'HIPAA Compliant Agentic Data Bridge',
        quantity: '1',
        unit_amount: { value: '4200.00', currency_code: 'USD' },
      },
    ],
    amount: { value: '4200.00', currency_code: 'USD' },
    due_amount: { value: '0.00', currency_code: 'USD' },
    payments: {
      paid_amount: { value: '4200.00', currency_code: 'USD' },
      transactions: [
        {
          payment_id: 'PAY-891244310',
          payment_date: '2026-10-20T09:11:45Z',
          method: 'PAYPAL',
          amount: { value: '4200.00', currency_code: 'USD' },
        },
      ],
    },
  },
  {
    id: 'INV2-SOLAR-TECH-505',
    status: 'PARTIALLY_PAID',
    detail: {
      invoice_number: 'INV-2026-505',
      currency_code: 'USD',
      invoice_date: '2026-10-05',
      payment_term: { term_type: 'NET_30', due_date: '2026-11-04' },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: 'Tariq Al-Mansoor' },
          business_name: 'Helios Clean Energy',
          email_address: 'accounts@heliosenergy.example.com',
        },
      },
    ],
    items: [
      {
        name: 'Smart Grid Automated Settlement Engine',
        quantity: '1',
        unit_amount: { value: '6000.00', currency_code: 'USD' },
      },
    ],
    amount: { value: '6000.00', currency_code: 'USD' },
    due_amount: { value: '3000.00', currency_code: 'USD' },
    payments: {
      paid_amount: { value: '3000.00', currency_code: 'USD' },
      transactions: [
        {
          payment_id: 'PAY-31849200',
          payment_date: '2026-10-10T16:05:00Z',
          method: 'PAYPAL',
          amount: { value: '3000.00', currency_code: 'USD' },
        },
      ],
    },
  },
  {
    id: 'INV2-HYPER-SCALE-401',
    status: 'DRAFT',
    detail: {
      invoice_number: 'INV-2026-401',
      currency_code: 'USD',
      invoice_date: '2026-11-05',
      payment_term: { term_type: 'NET_15', due_date: '2026-11-20' },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: 'Chloe Tremblay' },
          business_name: 'HyperScale AI Labs',
          email_address: 'billing@hyperscalelabs.example.com',
        },
      },
    ],
    items: [
      {
        name: 'Autonomous Agentic Commerce Integration Package',
        quantity: '1',
        unit_amount: { value: '9500.00', currency_code: 'USD' },
      },
    ],
    amount: { value: '9500.00', currency_code: 'USD' },
    due_amount: { value: '9500.00', currency_code: 'USD' },
  },
];

export const MOCK_BALANCES: Balances = {
  as_of_time: '2026-11-06T18:00:00Z',
  balances: [
    {
      currency: 'USD',
      total_balance: { value: '48250.00', currency_code: 'USD' },
      available_balance: { value: '42500.00', currency_code: 'USD' },
      withheld_balance: { value: '5750.00', currency_code: 'USD' },
    },
    {
      currency: 'EUR',
      total_balance: { value: '14200.00', currency_code: 'EUR' },
      available_balance: { value: '14200.00', currency_code: 'EUR' },
      withheld_balance: { value: '0.00', currency_code: 'EUR' },
    },
    {
      currency: 'GBP',
      total_balance: { value: '8650.00', currency_code: 'GBP' },
      available_balance: { value: '8650.00', currency_code: 'GBP' },
      withheld_balance: { value: '0.00', currency_code: 'GBP' },
    },
  ],
};

export function generateMockTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  const baseTime = Date.now();
  const payers = [
    { email: 'marcus@globallogistics.example.com', subject: 'Payment for INV-2026-744' },
    { email: 'elena@velocityhealth.example.com', subject: 'Invoice Payment INV-2026-610' },
    { email: 'accounts@heliosenergy.example.com', subject: 'Deposit INV-2026-505' },
    { email: 'billing@quantumventures.example.com', subject: 'Monthly Enterprise Scale' },
    { email: 'payments@cloudmatrix.example.com', subject: 'API Gateway Metered Usage' },
    { email: 'contractor.dev@neuralstudio.example.com', subject: 'Payout: Agent Tooling Milestone' },
    { email: 'vendor.cloud@compute-infra.example.com', subject: 'Payout: GPU Inference Node Rental' },
  ];

  let balance = 48250.0;

  for (let i = 0; i < 35; i++) {
    const daysAgo = Math.floor(i * 0.8);
    const date = new Date(baseTime - daysAgo * 86_400_000 - (i % 5) * 3_600_000).toISOString();
    const payer = payers[i % payers.length];
    const isPayout = i % 7 === 0;
    const isRefund = i === 19;
    const amountVal = isPayout ? -(450 + (i * 95)) : isRefund ? -320.0 : 850.0 + (i * 210);
    balance += amountVal;

    transactions.push({
      transaction_info: {
        transaction_id: `TXN-PP-${90000000 + i}`,
        paypal_reference_id: `REF-${800000 + i}`,
        transaction_event_code: isPayout ? 'T0001' : isRefund ? 'T1106' : 'T0006',
        transaction_initiation_date: date,
        transaction_amount: {
          value: amountVal.toFixed(2),
          currency_code: 'USD',
        },
        fee_amount: {
          value: isPayout ? '0.25' : (Math.abs(amountVal) * 0.029 + 0.3).toFixed(2),
          currency_code: 'USD',
        },
        transaction_status: 'S',
        ending_balance: {
          value: balance.toFixed(2),
          currency_code: 'USD',
        },
        transaction_subject: payer.subject,
        transaction_note: isPayout
          ? 'Autonomous AP Agent verified milestone and issued PayPal payout'
          : 'PayPal Complete Payments checkout capture',
      },
      payer_info: {
        email_address: payer.email,
      },
    });
  }

  return transactions;
}
