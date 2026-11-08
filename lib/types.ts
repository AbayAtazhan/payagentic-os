// Shared by server routes and the browser.

export type MilestoneStatus =
  | 'AGREED' // terms written, not funded yet
  | 'FUNDED' // client's money is held by PayPal (authorization)
  | 'CHANGES_REQUESTED' // AI found unmet criteria, freelancer can resubmit
  | 'NEEDS_REVIEW' // AI passed but policy wants the client to confirm
  | 'RELEASED' // captured + paid out to the freelancer
  | 'REFUNDED'; // hold voided, money back to the client

/** The part of a milestone both sides agree on. Locked (signed) once the client funds it. */
export type Terms = {
  milestoneId: string;
  title: string;
  amount: string; // "300.00"
  currency: string;
  criteria: string[];
  freelancerEmail: string;
};

export type CriterionResult = {
  criterion: string;
  status: 'met' | 'not_met' | 'unclear';
  evidence: string;
};

export type Verdict = {
  decision: 'approve' | 'changes' | 'review';
  confidence: number;
  summary: string;
  feedback: string;
  results: CriterionResult[];
  manipulation: { detected: boolean; note: string };
  policy: { autoRelease: boolean; reason: string };
  source: { kind: 'website' | 'github'; url: string; title: string };
  model: string;
  checkedAt: string;
};

export type Release = {
  captureId: string;
  payoutBatchId?: string;
  payoutError?: string;
  grossAmount: string;
  feeAmount: string;
  payoutAmount: string;
  releasedBy: 'ai' | 'client';
};

export type Submission = {
  id: string;
  url: string;
  note: string;
  submittedAt: string;
  verdict?: Verdict;
  error?: string;
};

export type Milestone = {
  id: string;
  title: string;
  amount: string;
  criteria: string[];
  status: MilestoneStatus;
  orderId?: string;
  authorizationId?: string;
  authExpiresAt?: string;
  termsToken?: string;
  submissions: Submission[];
  release?: Release;
};

export type TimelineEvent = {
  at: string;
  actor: 'client' | 'freelancer' | 'ai' | 'paypal' | 'system';
  text: string;
  ref?: string;
};

export type Deal = {
  id: string;
  title: string;
  summary: string;
  clientName: string;
  freelancerName: string;
  freelancerEmail: string;
  currency: string;
  deliverableType: 'website' | 'github';
  createdAt: string;
  milestones: Milestone[];
  timeline: TimelineEvent[];
};

export type PlanResult = {
  title: string;
  summary: string;
  deliverableType: 'website' | 'github';
  milestones: { title: string; amount: string; criteria: string[] }[];
  notes: string[];
  model: string;
};

export type AppConfig = {
  paypalMode: 'sandbox' | 'simulated';
  paypalClientId: string | null;
  aiEnabled: boolean;
  aiModel: string;
  demoFreelancerEmail: string;
  policy: { autoReleaseCap: number; minConfidence: number; feePercent: number };
};
