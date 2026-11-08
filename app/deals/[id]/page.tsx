'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { MilestoneCard, type Role } from '@/components/milestone-card';
import { Card, Header, money } from '@/components/ui';
import { updateDeal, useDeal } from '@/lib/store';
import type { TimelineEvent } from '@/lib/types';

const ACTOR: Record<TimelineEvent['actor'], { label: string; cls: string }> = {
  client: { label: 'Client', cls: 'bg-pp-highlight text-pp-blue-dark' },
  freelancer: { label: 'Freelancer', cls: 'bg-amber-50 text-pp-warning' },
  ai: { label: 'AI', cls: 'bg-violet-50 text-violet-700' },
  paypal: { label: 'PayPal', cls: 'bg-pp-navy text-white' },
  system: { label: 'ProofPay', cls: 'bg-slate-100 text-slate-700' },
};

export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const deal = useDeal(id);
  const [role, setRole] = useState<Role>('client');
  const [editingEmail, setEditingEmail] = useState(false);

  if (!deal) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-pp-muted">This deal isn&apos;t saved in this browser.</p>
          <Link href="/deals" className="mt-4 inline-block text-pp-blue underline">
            Back to deals
          </Link>
        </main>
      </>
    );
  }

  const total = deal.milestones.reduce((s, m) => s + Number(m.amount), 0);
  const held = deal.milestones.filter((m) => ['FUNDED', 'CHANGES_REQUESTED', 'NEEDS_REVIEW'].includes(m.status)).reduce((s, m) => s + Number(m.amount), 0);
  const paid = deal.milestones.reduce((s, m) => s + Number(m.release?.payoutAmount ?? 0), 0);
  const anyFunded = deal.milestones.some((m) => m.authorizationId);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <Link href="/deals" className="text-sm text-pp-blue">
              ← All deals
            </Link>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-pp-ink">{deal.title}</h1>
            <p className="mt-1 text-pp-muted">{deal.summary}</p>
            <p className="mt-2 text-sm text-pp-muted">
              <b className="text-pp-ink">{deal.clientName}</b> hires <b className="text-pp-ink">{deal.freelancerName}</b>{' '}
              {editingEmail ? (
                <input
                  autoFocus
                  defaultValue={deal.freelancerEmail}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) updateDeal(deal.id, (d) => ({ ...d, freelancerEmail: v }));
                    setEditingEmail(false);
                  }}
                  className="h-7 w-64 rounded border border-pp-border px-2 text-sm"
                />
              ) : (
                <>
                  (paid to <span className="font-mono text-xs">{deal.freelancerEmail}</span>
                  {!anyFunded && (
                    <button onClick={() => setEditingEmail(true)} className="ml-1 text-pp-blue underline">
                      edit
                    </button>
                  )}
                  )
                </>
              )}
            </p>
          </div>
          <div className="inline-flex rounded-full border border-pp-border bg-white p-1 text-sm font-semibold">
            {(['client', 'freelancer'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-full px-4 py-1.5 capitalize transition ${role === r ? 'bg-pp-navy text-white' : 'text-pp-muted hover:text-pp-ink'}`}
              >
                {r} view
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            ['Deal total', money(total, deal.currency)],
            ['Held in PayPal', money(held, deal.currency)],
            ['Paid to freelancer', money(paid, deal.currency)],
          ].map(([k, v]) => (
            <Card key={k} className="px-4 py-3">
              <p className="text-xs text-pp-muted">{k}</p>
              <p className="text-xl font-bold text-pp-ink">{v}</p>
            </Card>
          ))}
        </div>

        <div className="space-y-5">
          {deal.milestones.map((m, i) => (
            <MilestoneCard key={m.id} deal={deal} milestone={m} index={i} role={role} />
          ))}
        </div>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-pp-ink">Activity</h2>
          <ol className="space-y-2">
            {[...deal.timeline].reverse().map((e, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="w-16 shrink-0 text-xs text-pp-muted">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ACTOR[e.actor].cls}`}>{ACTOR[e.actor].label}</span>
                <span className="min-w-0 flex-1 text-pp-ink">{e.text}</span>
                {e.ref && <span className="font-mono text-xs text-pp-muted">{e.ref}</span>}
              </li>
            ))}
          </ol>
        </Card>
      </main>
    </>
  );
}
