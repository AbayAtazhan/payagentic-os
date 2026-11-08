'use client';

import { useEffect, useState } from 'react';
import { newId, updateMilestone } from '@/lib/store';
import type { Deal, Milestone, Release, Terms, Verdict } from '@/lib/types';
import { FundButton } from './fund-button';
import { api, Button, Card, money, StatusBadge } from './ui';
import { ReleaseView, VerdictView } from './verdict-view';

export type Role = 'client' | 'freelancer';

const STEPS = ['Agreed', 'Funds held', 'Delivered', 'Verified', 'Paid'];
const lastDecision = (m: Milestone) => m.submissions[m.submissions.length - 1]?.verdict?.decision;

function stepIndex(m: Milestone) {
  if (m.status === 'RELEASED') return 4;
  if (m.status === 'NEEDS_REVIEW' && lastDecision(m) === 'approve') return 3;
  if (m.submissions.length > 0 && m.status !== 'REFUNDED') return 2;
  if (m.authorizationId) return 1;
  return 0;
}

const CHECK_STEPS = ['Opening the delivered link', 'Reading the page like a reviewer', 'Checking each agreed criterion', 'Applying the payment policy'];

const SAMPLES = [
  { label: 'First draft', path: '/samples/sunrise-bakery/v1' },
  { label: 'Draft with hidden text', path: '/samples/sunrise-bakery/v3' },
  { label: 'Final version', path: '/samples/sunrise-bakery/v2' },
];

export function MilestoneCard({ deal, milestone: m, index, role }: { deal: Deal; milestone: Milestone; index: number; role: Role }) {
  const terms: Terms = {
    milestoneId: m.id,
    title: m.title,
    amount: m.amount,
    currency: deal.currency,
    criteria: m.criteria,
    freelancerEmail: deal.freelancerEmail,
  };
  const locked = { terms, authorizationId: m.authorizationId, termsToken: m.termsToken };
  const latest = m.submissions[m.submissions.length - 1];
  const step = stepIndex(m);
  const isDemo = deal.title === 'Sunrise Bakery website';

  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkStep, setCheckStep] = useState(0);
  const [busy, setBusy] = useState<'' | 'release' | 'refund'>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!checking) return;
    const t = setInterval(() => setCheckStep((s) => Math.min(s + 1, CHECK_STEPS.length - 1)), 1600);
    return () => clearInterval(t);
  }, [checking]);

  async function submit() {
    setError('');
    setCheckStep(0);
    setChecking(true);
    const submission = { id: newId('sub'), url: url.trim(), note: note.trim(), submittedAt: new Date().toISOString() };
    try {
      const res = await api<{ verdict: Verdict; release?: Release; releaseError?: string }>('/api/escrow/verify', {
        ...locked,
        url: submission.url,
        note: submission.note,
      });
      const v = res.verdict;
      const met = v.results.filter((r) => r.status === 'met').length;
      updateMilestone(
        deal.id,
        m.id,
        (x) => {
          x.submissions.push({ ...submission, verdict: v, error: res.releaseError });
          if (res.release) {
            x.release = res.release;
            x.status = 'RELEASED';
          } else x.status = v.decision === 'changes' ? 'CHANGES_REQUESTED' : 'NEEDS_REVIEW';
        },
        [
          { actor: 'freelancer', text: `Delivered "${m.title}": ${submission.url}` },
          { actor: 'ai', text: `Checked ${v.results.length} criteria: ${met} met. ${v.policy.reason}` },
          ...(v.manipulation.detected ? [{ actor: 'ai' as const, text: `Flagged a manipulation attempt: ${v.manipulation.note}` }] : []),
          ...(res.release
            ? [
                { actor: 'paypal' as const, text: `Captured ${money(res.release.grossAmount)} from the hold`, ref: res.release.captureId },
                { actor: 'paypal' as const, text: `Paid out ${money(res.release.payoutAmount)} to ${deal.freelancerEmail}`, ref: res.release.payoutBatchId },
              ]
            : []),
        ],
      );
      setUrl('');
      setNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }

  async function release() {
    setBusy('release');
    setError('');
    try {
      const { release } = await api<{ release: Release }>('/api/escrow/release', locked);
      updateMilestone(
        deal.id,
        m.id,
        (x) => {
          x.release = release;
          x.status = 'RELEASED';
        },
        [
          { actor: 'client', text: `Approved release of "${m.title}"` },
          { actor: 'paypal', text: `Captured ${money(release.grossAmount)} from the hold`, ref: release.captureId },
          { actor: 'paypal', text: `Paid out ${money(release.payoutAmount)} to ${deal.freelancerEmail}`, ref: release.payoutBatchId },
        ],
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function refund() {
    if (!confirm(`Cancel "${m.title}" and release the ${money(m.amount)} hold back to the client?`)) return;
    setBusy('refund');
    setError('');
    try {
      await api('/api/escrow/refund', locked);
      updateMilestone(deal.id, m.id, (x) => void (x.status = 'REFUNDED'), [
        { actor: 'client', text: `Cancelled "${m.title}"` },
        { actor: 'paypal', text: `Voided the hold; ${money(m.amount)} returned to the client`, ref: m.authorizationId },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  // The freelancer can deliver again until the work is accepted (a flagged or unclear delivery can be replaced).
  const canSubmit =
    role === 'freelancer' &&
    (m.status === 'FUNDED' || m.status === 'CHANGES_REQUESTED' || (m.status === 'NEEDS_REVIEW' && lastDecision(m) !== 'approve'));
  const canDecide = role === 'client' && m.status === 'NEEDS_REVIEW';
  const canRefund = role === 'client' && ['FUNDED', 'CHANGES_REQUESTED', 'NEEDS_REVIEW'].includes(m.status);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-pp-border px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pp-muted">Milestone {index + 1}</p>
          <h3 className="text-lg font-semibold text-pp-ink">{m.title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={m.status} />
          <span className="text-xl font-bold text-pp-ink">{money(m.amount, deal.currency)}</span>
        </div>
      </div>

      {/* Progress */}
      <ol className="flex gap-1 px-5 pt-4">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${m.status === 'REFUNDED' ? 'bg-rose-200' : i <= step ? 'bg-pp-blue' : 'bg-pp-gridline'}`} />
            <p className={`mt-1 hidden text-[11px] sm:block ${i <= step ? 'text-pp-ink' : 'text-pp-muted'}`}>{s}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-pp-ink">
            Acceptance criteria
            {m.termsToken && <span className="rounded bg-pp-canvas px-1.5 py-0.5 text-[11px] font-medium text-pp-muted">🔒 locked at funding</span>}
          </p>
          <ul className="space-y-1.5 text-sm text-pp-muted">
            {m.criteria.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-pp-blue">•</span>
                {c}
              </li>
            ))}
          </ul>
          {m.authorizationId && (
            <p className="mt-3 text-xs text-pp-muted">
              PayPal authorization <span className="font-mono">{m.authorizationId}</span>
              {m.authExpiresAt && ` · hold valid until ${new Date(m.authExpiresAt).toLocaleDateString()}`}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {m.status === 'AGREED' &&
            (role === 'client' ? (
              <FundButton
                terms={terms}
                onFunded={(f) =>
                  updateMilestone(
                    deal.id,
                    m.id,
                    (x) => {
                      x.orderId = f.orderId;
                      x.authorizationId = f.authorizationId;
                      x.authExpiresAt = f.expiresAt ?? undefined;
                      x.termsToken = f.termsToken;
                      x.status = 'FUNDED';
                    },
                    [
                      { actor: 'client', text: `Approved ${money(m.amount)} for "${m.title}" in PayPal`, ref: f.orderId },
                      { actor: 'paypal', text: `Holding ${money(m.amount)} on the client's account. Terms locked.`, ref: f.authorizationId },
                    ],
                  )
                }
              />
            ) : (
              <p className="rounded-xl bg-pp-canvas px-4 py-3 text-sm text-pp-muted">Waiting for the client to fund this milestone. Switch to the client view to fund it.</p>
            ))}

          {latest?.verdict && !checking && <VerdictView verdict={latest.verdict} />}
          {latest?.error && <p className="text-sm text-pp-danger">Automatic release failed: {latest.error}</p>}
          {m.release && <ReleaseView release={m.release} currency={deal.currency} />}
          {m.status === 'REFUNDED' && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-pp-danger">The PayPal hold was voided. The client was not charged.</p>
          )}

          {checking && (
            <div className="rounded-xl border border-pp-border p-4">
              <p className="mb-3 text-sm font-semibold text-pp-ink">ProofPay AI is reviewing the delivery…</p>
              <ul className="space-y-2 text-sm">
                {CHECK_STEPS.map((s, i) => (
                  <li key={s} className={`flex items-center gap-2 ${i <= checkStep ? 'text-pp-ink' : 'text-pp-muted/60'}`}>
                    <span className={`h-2 w-2 rounded-full ${i < checkStep ? 'bg-pp-success' : i === checkStep ? 'animate-pulse bg-pp-blue' : 'bg-pp-gridline'}`} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canSubmit && !checking && (
            <div className="space-y-2 rounded-xl border border-pp-border p-4">
              <p className="text-sm font-semibold text-pp-ink">{m.submissions.length > 0 ? 'Submit a fixed version' : 'Deliver your work'}</p>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={deal.deliverableType === 'github' ? 'https://github.com/you/repo' : 'https://your-site.com'}
                className="h-10 w-full rounded-lg border border-pp-border px-3 text-sm outline-none focus:border-pp-blue"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note for the client (optional)"
                className="h-10 w-full rounded-lg border border-pp-border px-3 text-sm outline-none focus:border-pp-blue"
              />
              {isDemo && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-pp-muted">Demo deliveries:</span>
                  {SAMPLES.map((s) => (
                    <button
                      key={s.path}
                      onClick={() => setUrl(`${window.location.origin}${s.path}`)}
                      className="rounded-full border border-pp-border px-2 py-0.5 text-pp-blue hover:bg-pp-highlight"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <Button disabled={!url.trim()} onClick={submit} className="w-full">
                Submit for AI review
              </Button>
            </div>
          )}

          {(canDecide || canRefund) && (
            <div className="flex flex-wrap gap-2">
              {canDecide && (
                <Button disabled={!!busy} onClick={release}>
                  {busy === 'release' ? 'Releasing…' : `Release ${money(m.amount)}`}
                </Button>
              )}
              {canRefund && (
                <Button variant="danger" disabled={!!busy} onClick={refund}>
                  {busy === 'refund' ? 'Cancelling…' : 'Cancel & refund'}
                </Button>
              )}
            </div>
          )}
          {error && <p className="text-sm text-pp-danger">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
