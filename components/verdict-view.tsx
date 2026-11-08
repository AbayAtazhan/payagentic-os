'use client';

import type { Release, Verdict } from '@/lib/types';
import { money } from './ui';

const ICON = {
  met: { mark: '✓', cls: 'bg-emerald-100 text-pp-success' },
  not_met: { mark: '✕', cls: 'bg-rose-100 text-pp-danger' },
  unclear: { mark: '?', cls: 'bg-amber-100 text-pp-warning' },
};

const BANNER = {
  approve: { title: 'Work verified', cls: 'border-emerald-200 bg-emerald-50 text-pp-success' },
  changes: { title: 'Changes needed', cls: 'border-amber-200 bg-amber-50 text-pp-warning' },
  review: { title: 'Needs a human look', cls: 'border-violet-200 bg-violet-50 text-violet-700' },
};

export function VerdictView({ verdict }: { verdict: Verdict }) {
  const banner = BANNER[verdict.decision];
  const met = verdict.results.filter((r) => r.status === 'met').length;
  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-4 py-3 ${banner.cls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            {banner.title} · {met}/{verdict.results.length} criteria met
          </p>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span>AI confidence</span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/70">
              <span className="block h-full rounded-full bg-current" style={{ width: `${verdict.confidence}%` }} />
            </span>
            <span>{verdict.confidence}%</span>
          </div>
        </div>
        <p className="mt-1 text-sm text-pp-ink/80">{verdict.policy.reason}</p>
      </div>

      {verdict.manipulation.detected && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-pp-danger">
          <p className="font-semibold">⚠ Attempt to manipulate the AI reviewer detected</p>
          <p className="mt-1 text-pp-ink/80">{verdict.manipulation.note}</p>
        </div>
      )}

      <ul className="divide-y divide-pp-border rounded-xl border border-pp-border">
        {verdict.results.map((r, i) => (
          <li key={i} className="flex gap-3 px-4 py-3">
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${ICON[r.status].cls}`}>
              {ICON[r.status].mark}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-pp-ink">{r.criterion}</p>
              <p className="mt-0.5 break-words text-sm text-pp-muted">{r.evidence}</p>
            </div>
          </li>
        ))}
      </ul>

      {verdict.feedback && verdict.decision !== 'approve' && (
        <div className="rounded-xl bg-pp-canvas px-4 py-3 text-sm">
          <p className="font-semibold text-pp-ink">What to fix</p>
          <p className="mt-1 text-pp-muted">{verdict.feedback}</p>
        </div>
      )}

      <p className="text-xs text-pp-muted">
        Checked {verdict.source.kind === 'github' ? 'repository' : 'live page'}{' '}
        <a href={verdict.source.url} target="_blank" rel="noreferrer" className="text-pp-blue underline">
          {verdict.source.title}
        </a>{' '}
        with {verdict.model} · {new Date(verdict.checkedAt).toLocaleString()}
      </p>
    </div>
  );
}

export function ReleaseView({ release, currency }: { release: Release; currency: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="font-semibold text-pp-success">
        {money(release.payoutAmount, currency)} paid to the freelancer {release.releasedBy === 'ai' ? 'automatically by ProofPay' : 'after client approval'}
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Row k="Captured from client" v={money(release.grossAmount, currency)} />
        <Row k="ProofPay fee" v={money(release.feeAmount, currency)} />
        <Row k="PayPal capture ID" v={release.captureId} mono />
        <Row k="PayPal payout batch" v={release.payoutBatchId ?? '-'} mono />
      </dl>
      {release.payoutError && (
        <p className="mt-2 text-sm text-pp-danger">Payout problem: {release.payoutError}. The captured funds are safe on the platform account.</p>
      )}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-emerald-100 py-1">
      <dt className="text-pp-muted">{k}</dt>
      <dd className={`truncate text-pp-ink ${mono ? 'font-mono text-xs leading-5' : 'font-medium'}`}>{v}</dd>
    </div>
  );
}
