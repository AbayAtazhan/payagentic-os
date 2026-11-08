'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, Button, Card, Header, money, useConfig } from '@/components/ui';
import { newId, saveDeal } from '@/lib/store';
import type { Deal, PlanResult } from '@/lib/types';

const EXAMPLE = {
  description:
    'I run a small yoga studio and need a simple website. It should show our class schedule for the week, prices for drop-in and monthly passes, introduce our 3 teachers with photos, and have a contact form. Later I would like a page where people can sign up for our newsletter.',
  budget: '800',
};

const field = 'w-full rounded-lg border border-pp-border px-3 py-2 text-sm outline-none focus:border-pp-blue';

export default function NewDealPage() {
  const router = useRouter();
  const config = useConfig();
  const [clientName, setClientName] = useState('');
  const [freelancerName, setFreelancerName] = useState('');
  // null until the user types: then the server's demo payee email is shown as the default.
  const [emailInput, setFreelancerEmail] = useState<string | null>(null);
  const freelancerEmail = emailInput ?? config?.demoFreelancerEmail ?? '';
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function draft() {
    setBusy(true);
    setError('');
    try {
      setPlan(await api<PlanResult>('/api/plan', { description, budget: Number(budget), currency: 'USD' }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function create() {
    if (!plan) return;
    const now = new Date().toISOString();
    const deal: Deal = {
      id: newId('deal'),
      title: plan.title,
      summary: plan.summary,
      clientName: clientName || 'Client',
      freelancerName: freelancerName || 'Freelancer',
      freelancerEmail,
      currency: 'USD',
      deliverableType: plan.deliverableType,
      createdAt: now,
      milestones: plan.milestones.map((m) => ({
        id: newId('ms'),
        title: m.title,
        amount: Number(m.amount).toFixed(2),
        criteria: m.criteria.map((c) => c.trim()).filter(Boolean),
        status: 'AGREED',
        submissions: [],
      })),
      timeline: [{ at: now, actor: 'ai', text: `Drafted ${plan.milestones.length} milestones with ${plan.model}; terms reviewed by the client.` }],
    };
    saveDeal(deal);
    router.push(`/deals/${deal.id}`);
  }

  const setMilestone = (i: number, patch: Partial<PlanResult['milestones'][number]>) =>
    setPlan((p) => (p ? { ...p, milestones: p.milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)) } : p));
  const planTotal = plan?.milestones.reduce((s, m) => s + Number(m.amount || 0), 0) ?? 0;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(freelancerEmail);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-pp-ink">New deal</h1>
          <p className="text-pp-muted">Describe the job in plain words. The AI turns it into milestones with criteria it can check later.</p>
        </div>

        <Card className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-pp-ink">Client</span>
              <input className={field} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Lotus Yoga Studio" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-pp-ink">Freelancer</span>
              <input className={field} value={freelancerName} onChange={(e) => setFreelancerName(e.target.value)} placeholder="Sam Park" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-pp-ink">Freelancer PayPal email</span>
              <input className={field} value={freelancerEmail} onChange={(e) => setFreelancerEmail(e.target.value)} />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="flex items-center justify-between font-medium text-pp-ink">
              What needs to be done?
              <button
                className="text-xs font-normal text-pp-blue underline"
                onClick={() => {
                  setDescription(EXAMPLE.description);
                  setBudget(EXAMPLE.budget);
                  setClientName((v) => v || 'Lotus Yoga Studio');
                  setFreelancerName((v) => v || 'Sam Park');
                }}
              >
                Use an example
              </button>
            </span>
            <textarea className={`${field} h-36`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-pp-ink">Budget (USD)</span>
              <input className={`${field} w-36`} type="number" min={1} value={budget} onChange={(e) => setBudget(e.target.value)} />
            </label>
            <Button onClick={draft} disabled={busy || description.trim().length < 20 || !Number(budget) || config?.aiEnabled === false}>
              {busy ? 'AI is drafting milestones…' : plan ? 'Draft again' : 'Draft milestones with AI'}
            </Button>
          </div>
          {config?.aiEnabled === false && <p className="text-sm text-pp-warning">AI key is not configured on the server (DEEPSEEK_API_KEY).</p>}
          {error && <p className="text-sm text-pp-danger">{error}</p>}
        </Card>

        {plan && (
          <Card className="space-y-4 p-5">
            <div>
              <input
                className="w-full text-xl font-bold text-pp-ink outline-none"
                value={plan.title}
                onChange={(e) => setPlan({ ...plan, title: e.target.value })}
              />
              <p className="text-sm text-pp-muted">{plan.summary}</p>
            </div>
            {plan.milestones.map((m, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-pp-border p-4">
                <div className="flex gap-2">
                  <input className={`${field} font-semibold`} value={m.title} onChange={(e) => setMilestone(i, { title: e.target.value })} />
                  <input className={`${field} w-28`} type="number" value={m.amount} onChange={(e) => setMilestone(i, { amount: e.target.value })} />
                </div>
                <textarea
                  className={`${field} h-28 text-pp-muted`}
                  value={m.criteria.join('\n')}
                  onChange={(e) => setMilestone(i, { criteria: e.target.value.split('\n') })}
                />
                <p className="text-xs text-pp-muted">One acceptance criterion per line. The AI reviewer checks each of them against the delivered link.</p>
              </div>
            ))}
            {plan.notes.length > 0 && (
              <div className="rounded-xl bg-pp-canvas px-4 py-3 text-sm">
                <p className="font-semibold text-pp-ink">Worth confirming with the freelancer</p>
                <ul className="mt-1 list-disc pl-5 text-pp-muted">
                  {plan.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-pp-muted">
                Total {money(planTotal)} · drafted by {plan.model}
              </p>
              <Button onClick={create} disabled={!emailOk || plan.milestones.some((m) => !m.title || !(Number(m.amount) > 0))}>
                Create deal
              </Button>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
