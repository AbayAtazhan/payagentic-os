import type { Money } from '../paypal';

export type AgentType = 'AR_DUNNING' | 'AP_PAYOUTS' | 'RISK_SENTINEL' | 'DYNAMIC_PRICING';

export type ActionStatus = 'PENDING_APPROVAL' | 'AUTONOMOUSLY_EXECUTED' | 'APPROVED' | 'REJECTED';

export type AgentAction = {
  id: string;
  agentType: AgentType;
  title: string;
  description: string;
  targetEntity: string;
  targetEmail: string;
  amount?: Money;
  confidenceScore: number; // 0 - 100
  riskScore: number; // 0 - 100
  requiresApproval: boolean;
  status: ActionStatus;
  paypalApiMethod: 'POST /v1/payments/payouts' | 'POST /v2/invoicing/invoices' | 'POST /v2/invoicing/send' | 'POST /v2/checkout/orders';
  payload: Record<string, unknown>;
  reasoning: string[];
  createdAt: string;
  executedAt?: string;
  paypalRefId?: string;
};

export type AgentConfig = {
  autoPilotEnabled: boolean;
  confidenceThreshold: number; // e.g. 90%
  maxAutonomousPayoutAmount: number; // e.g. $500
};

export type AgentAuditLog = {
  id: string;
  timestamp: string;
  actionId: string;
  agentType: AgentType;
  event: 'EVALUATED' | 'QUEUED' | 'AUTO_EXECUTED' | 'MANUALLY_APPROVED' | 'REJECTED';
  details: string;
  paypalReference?: string;
};
