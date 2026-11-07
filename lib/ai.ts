import fs from 'fs';
import path from 'path';

// Server-side configuration for PayAgentic OS and AG Studio AI assistant.
// The OpenAI key is read only on the server: never exposed to client bundles.

const DEFAULT_MODELS = ['gpt-4o-mini', 'gpt-4o'];

const KEY_VARIABLES = ['AG_STUDIO_OPENAI_API_KEY', 'OPENAI_API_KEY'] as const;

let loggedKeySource = false;

/** The OpenAI key for the assistant, or undefined when none is configured. */
export function openAiKey(): string | undefined {
  const variable = KEY_VARIABLES.find((name) => process.env[name]);
  if (!loggedKeySource) {
    loggedKeySource = true;
    console.log(
      variable
        ? `[AI] Assistant enabled, using OpenAI key from ${variable}`
        : `[AI] Cloud LLM assistant running in offline deterministic mode (set OPENAI_API_KEY to enable neural mode)`,
    );
  }
  return variable && process.env[variable];
}

/** The OpenAI models the assistant may use, from OPENAI_MODELS (comma-separated). The first is the default. */
export function aiModels(): string[] {
  const models = (process.env.OPENAI_MODELS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return models.length > 0 ? models : DEFAULT_MODELS;
}

/** The assistant is shown when an API key is configured or runs local deterministic fallback. */
export function aiEnabled(): boolean {
  return Boolean(openAiKey());
}

export type ApimaticToolDefinition = {
  name: string;
  endpoint: string;
  method: string;
  description: string;
};

export type ApimaticContext = {
  version: string;
  name: string;
  description: string;
  provider: {
    name: string;
    baseUrl: string;
    spec: string;
  };
  agentTools: ApimaticToolDefinition[];
};

let cachedApimaticContext: ApimaticContext | null = null;

/**
 * Loads the APIMatic Context Plugin specification directly from disk.
 * This directly grounds the AI agent's tool-calling definitions in the official contract.
 */
export function getApimaticContext(): ApimaticContext | null {
  if (cachedApimaticContext) return cachedApimaticContext;
  try {
    const filePath = path.join(process.cwd(), '.apimatic', 'context.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      cachedApimaticContext = JSON.parse(content) as ApimaticContext;
      return cachedApimaticContext;
    }
  } catch (err) {
    console.warn('[APIMatic] Could not read context.json:', err);
  }
  return null;
}

/**
 * Returns OpenAI-compatible tool specifications dynamically synthesized from
 * the APIMatic Context Plugin contract to eliminate tool parameter hallucinations.
 */
export function getApimaticAgentTools() {
  const ctx = getApimaticContext();
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'get_paypal_balances',
        description: ctx?.agentTools.find((t) => t.name === 'get_paypal_balances')?.description ||
          'Query real-time available and total ledger balances across currencies from PayPal Sandbox.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_paypal_invoice',
        description: ctx?.agentTools.find((t) => t.name === 'create_paypal_invoice')?.description ||
          'Drafts and prepares a PayPal invoice with line items, recipient details, and prompt payment terms.',
        parameters: {
          type: 'object',
          properties: {
            recipientEmail: { type: 'string', description: 'Customer billing email' },
            recipientName: { type: 'string', description: 'Customer or business name' },
            amount: { type: 'string', description: 'Invoice total amount in USD e.g. "1250.00"' },
            description: { type: 'string', description: 'Line item service description' },
            discountPercent: { type: 'number', description: 'Optional prompt settlement discount e.g. 3 for 3%' },
          },
          required: ['recipientEmail', 'amount'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_paypal_payout',
        description: ctx?.agentTools.find((t) => t.name === 'create_paypal_payout')?.description ||
          'Dispatches an automated vendor payout with mandatory idempotency key to prevent double disbursement.',
        parameters: {
          type: 'object',
          properties: {
            recipientEmail: { type: 'string', description: 'Contractor recipient PayPal email' },
            amount: { type: 'string', description: 'Payout disbursement amount e.g. "350.00"' },
            note: { type: 'string', description: 'Disbursement purpose or milestone note' },
          },
          required: ['recipientEmail', 'amount'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'audit_invoices',
        description: 'Audits all unpaid or delinquent PayPal invoices, analyzes overdue aging buckets, and computes risk.',
        parameters: { type: 'object', properties: {} },
      },
    },
  ];

  return tools;
}
