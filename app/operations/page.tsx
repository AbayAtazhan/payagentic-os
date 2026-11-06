'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChevronRight, FileText, Send, Terminal, Zap } from 'lucide-react';

export default function OperationsPortal() {
  const [activeTab, setActiveTab] = useState<'invoice' | 'payout' | 'order'>('invoice');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);

  // Form states
  const [invRecipient, setInvRecipient] = useState('enterprise-client@innovate.example.com');
  const [invName, setInvName] = useState('Innovate Corp');
  const [invAmount, setInvAmount] = useState('1850.00');
  const [invItem, setInvItem] = useState('AI Agent Optimization & Workflow Automation');

  const [payoutEmail, setPayoutEmail] = useState('contractor.dev@neuralstudio.example.com');
  const [payoutAmount, setPayoutAmount] = useState('420.00');
  const [payoutNote, setPayoutNote] = useState('Milestone 4: Deliverable Code Merged');

  const [orderAmount, setOrderAmount] = useState('99.00');
  const [orderDesc, setOrderDesc] = useState('Agentic Micro-Transaction Checkout');

  const handleExecute = async () => {
    setLoading(true);
    setOutput(null);

    let payload: Record<string, unknown> = {};

    if (activeTab === 'invoice') {
      payload = {
        operation: 'create_and_send_invoice',
        data: {
          recipientEmail: invRecipient,
          recipientName: invName,
          businessName: invName,
          amount: invAmount,
          itemName: invItem,
        },
      };
    } else if (activeTab === 'payout') {
      payload = {
        operation: 'disburse_payout',
        data: {
          recipientEmail: payoutEmail,
          amount: payoutAmount,
          note: payoutNote,
        },
      };
    } else {
      payload = {
        operation: 'create_order',
        data: {
          amount: orderAmount,
          description: orderDesc,
        },
      };
    }

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setOutput(data);
    } catch (e) {
      setOutput({ error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Interactive PayPal Sandbox Operations</h1>
              <p className="text-xs text-slate-500">Live Two-Way REST API Mutation Console for Judges</p>
            </div>
          </div>
          <Link
            href="/agent"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Go to Agent Command Center &rarr;
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('invoice')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'invoice'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" /> Invoicing v2 (Create &amp; Send)
          </button>
          <button
            onClick={() => setActiveTab('payout')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'payout'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="h-4 w-4" /> Payouts v1 (Disburse)
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'order'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="h-4 w-4" /> Orders v2 (Authorize)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Form Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {activeTab === 'invoice' && 'POST /v2/invoicing/invoices + Send'}
              {activeTab === 'payout' && 'POST /v1/payments/payouts'}
              {activeTab === 'order' && 'POST /v2/checkout/orders'}
            </h2>

            {activeTab === 'invoice' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Recipient Business Name</label>
                  <input
                    type="text"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Recipient Email</label>
                  <input
                    type="email"
                    value={invRecipient}
                    onChange={(e) => setInvRecipient(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Item Description</label>
                  <input
                    type="text"
                    value={invItem}
                    onChange={(e) => setInvItem(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Amount (USD)</label>
                  <input
                    type="number"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>
            )}

            {activeTab === 'payout' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Contractor / Vendor Email</label>
                  <input
                    type="email"
                    value={payoutEmail}
                    onChange={(e) => setPayoutEmail(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Payout Amount (USD)</label>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Memo / Milestone Subject</label>
                  <input
                    type="text"
                    value={payoutNote}
                    onChange={(e) => setPayoutNote(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>
            )}

            {activeTab === 'order' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Order Description</label>
                  <input
                    type="text"
                    value={orderDesc}
                    onChange={(e) => setOrderDesc(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Order Amount (USD)</label>
                  <input
                    type="number"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExecute}
              disabled={loading}
              className="mt-4 w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {loading ? 'Executing against PayPal REST API...' : 'Dispatch Live PayPal API Call'}
            </button>
          </div>

          {/* Real-time Response Output Panel */}
          <div className="rounded-xl border border-slate-200 bg-slate-900 p-6 shadow-2xs flex flex-col h-[400px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
                <Terminal className="h-4 w-4 text-emerald-400" />
                PayPal REST Live Response
              </div>
              {output && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {output.latencyMs ? `${output.latencyMs}ms latency` : 'Success'}
                </span>
              )}
            </div>

            <div className="mt-3 flex-1 overflow-auto font-mono text-[11px] text-slate-300 bg-slate-950 p-3 rounded border border-slate-800">
              {loading && <div className="text-amber-400 animate-pulse">&gt; Contacting api-m.sandbox.paypal.com...</div>}
              {!loading && !output && (
                <div className="text-slate-500 py-16 text-center">
                  &gt; Configure form parameters and click Dispatch to observe live PayPal Sandbox response payload.
                </div>
              )}
              {!loading && output && (
                <pre className="whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
