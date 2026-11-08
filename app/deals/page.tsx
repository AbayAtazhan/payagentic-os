'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LedgerGrid } from '@/components/ledger-grid';
import { Button, Card, Header, money, useConfig } from '@/components/ui';
import { createDemoDeal, useDeals } from '@/lib/store';

export default function DealsPage() {
  const deals = useDeals();
  const config = useConfig();
  const router = useRouter();

  const all = deals.flatMap((d) => d.milestones);
  const sum = (filter: (s: string) => boolean, pick: (m: (typeof all)[number]) => number) =>
    all.filter((m) => filter(m.status)).reduce((s, m) => s + pick(m), 0);
  const held = sum((s) => ['FUNDED', 'CHANGES_REQUESTED', 'NEEDS_REVIEW'].includes(s), (m) => Number(m.amount));
  const paid = sum((s) => s === 'RELEASED', (m) => Number(m.release?.payoutAmount ?? 0));
  const checks = all.reduce((s, m) => s + m.submissions.length, 0);
  const autoReleased = all.filter((m) => m.release?.releasedBy === 'ai').length;

  const startDemo = () => {
    if (!config) return;
    router.push(`/deals/${createDemoDeal(config.demoFreelancerEmail).id}`);
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-pp-ink">Deals</h1>
            <p className="text-pp-muted">Every milestone, its AI review and its PayPal money trail.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={startDemo} disabled={!config}>
              Start bakery demo
            </Button>
            <Link href="/deals/new">
              <Button>New deal with AI</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Held in PayPal', money(held)],
            ['Paid to freelancers', money(paid)],
            ['AI reviews run', String(checks)],
            ['Released automatically', String(autoReleased)],
          ].map(([k, v]) => (
            <Card key={k} className="px-4 py-3">
              <p className="text-xs text-pp-muted">{k}</p>
              <p className="text-2xl font-bold text-pp-ink">{v}</p>
            </Card>
          ))}
        </div>

        {deals.length === 0 ? (
          <Card className="px-6 py-14 text-center">
            <p className="text-lg font-semibold text-pp-ink">No deals yet</p>
            <p className="mt-1 text-pp-muted">Try the bakery demo: fund a milestone, deliver a page, watch the AI decide.</p>
            <Button className="mt-5" onClick={startDemo} disabled={!config}>
              Start bakery demo
            </Button>
          </Card>
        ) : (
          <LedgerGrid deals={deals} />
        )}
      </main>
    </>
  );
}
