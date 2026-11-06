import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Sparkles,
  Zap,
} from 'lucide-react';
import { isPayPalConfigured } from '@/lib/paypal';

export default function Home() {
  const configured = isPayPalConfigured();

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Top Banner */}
      <div className="border-b border-blue-900/10 bg-slate-900 text-slate-200 px-6 py-2.5 text-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">PayPal AI Hackathon 2026 Submission:</span>
            <span className="text-slate-400">Build What&apos;s Next with PayPal and AI</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>PayPal Sandbox APIs</span>
            <span>&bull;</span>
            <span>AG Grid / AG Studio</span>
            <span>&bull;</span>
            <span>APIMatic Plugin</span>
            <span>&bull;</span>
            <span>Render Deployable</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <header className="relative border-b border-slate-200 bg-white px-6 py-14 shadow-2xs">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                <Sparkles className="h-3.5 w-3.5" />
                Autonomous Agentic Commerce Engine
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                PayAgentic OS
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Autonomous financial operations for modern merchants. An AI agent swarm that continuously audits accounts receivable, disburses milestone contractor payouts, detects velocity fraud, and executes two-way PayPal Sandbox transactions with enterprise dual-key guardrails.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/agent"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-sm shadow-sm transition"
                >
                  <Bot className="h-4 w-4" />
                  Launch Agent Command Center
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold px-5 py-2.5 text-sm transition"
                >
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Open AG Studio Dashboard
                </Link>
                <Link
                  href="/operations"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold px-4 py-2.5 text-sm transition"
                >
                  <Zap className="h-4 w-4 text-amber-500" />
                  Live REST Console
                </Link>
              </div>
            </div>

            {/* Status & Architecture Box */}
            <div className="w-full md:w-80 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">System Environment</span>
                <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  OPERATIONAL
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">PayPal Sandbox Auth</span>
                  <span className="font-semibold text-slate-900">
                    {configured ? 'Live REST Credentials' : 'Zero-Fail Simulator'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Data Grid Engine</span>
                  <span className="font-semibold text-blue-600">AG Grid Enterprise/Comm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Context Specification</span>
                  <span className="font-semibold text-purple-600">APIMatic OpenAPI 3.1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Cloud Infrastructure</span>
                  <span className="font-semibold text-slate-900">Render Workflows</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Safe testing enabled: Ready for immediate judge evaluation without credentials required.
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hub Grid */}
      <div className="mx-auto max-w-6xl px-6 pt-10 space-y-10">
        {/* Core Pillars */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Primary Core Systems</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Agent Command Center */}
            <Link
              href="/agent"
              className="group rounded-xl border border-blue-100 bg-white p-6 shadow-2xs hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs group-hover:scale-105 transition">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                  Agent Command Center
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time autonomous swarm evaluating AR dunning, milestone verification payouts, and fraud detection. Features interactive AG Grid operations with 1-click approvals.
                </p>
              </div>
              <div className="mt-5 flex items-center text-xs font-semibold text-blue-600">
                Launch Command Center &rarr;
              </div>
            </Link>

            {/* Card 2: AG Studio Dashboard */}
            <Link
              href="/dashboard"
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-2xs hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                  AG Studio Financial Dashboard
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Official AG Studio integration joining customers, invoices, products, plans, and payouts into interactive customizable multi-table reports and AI charts.
                </p>
              </div>
              <div className="mt-5 flex items-center text-xs font-semibold text-emerald-600">
                View Studio Dashboard &rarr;
              </div>
            </Link>

            {/* Card 3: Interactive REST Operations */}
            <Link
              href="/operations"
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-2xs hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs group-hover:scale-105 transition">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                  Interactive REST Operations
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hands-on mutation playground for judges. Trigger live PayPal Invoicing v2, Payouts v1, and Orders v2 calls with real-time JSON responses and latency metrics.
                </p>
              </div>
              <div className="mt-5 flex items-center text-xs font-semibold text-amber-600">
                Open Operations Console &rarr;
              </div>
            </Link>
          </div>
        </section>

        {/* Partner Bounties Showcase */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Partner Bounties Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span>AG Grid / AG Studio</span>
                <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px]">$10,000 Bounty</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Deep AG Grid integration with custom action renderers, live filtering, and AG Studio relational reporting over 5 PayPal entities.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                <span>APIMatic Context Plugin</span>
                <span className="rounded bg-purple-100 text-purple-800 px-1.5 py-0.5 text-[10px]">$3,000 Bounty</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Configured with <code className="font-mono text-[10px]">.apimatic/context.json</code> and OpenAPI 3.1 contracts for zero-hallucination agent tool-calling.
              </p>
              <Link href="/apimatic" className="mt-2 inline-block text-[11px] font-semibold text-purple-700 hover:underline">
                View APIMatic Spec &rarr;
              </Link>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Render Infrastructure</span>
                <span className="rounded bg-slate-100 text-slate-800 px-1.5 py-0.5 text-[10px]">$2,250 Credits</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Ready-to-deploy <code className="font-mono text-[10px]">render.yaml</code> blueprint with automated health check at <code className="font-mono text-[10px]">/api/health</code>.
              </p>
            </div>
          </div>
        </section>

        {/* Live AG Grid PayPal Endpoint Explorer */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                PayPal Endpoint Data Grids (AG Grid)
              </h2>
              <p className="text-xs text-slate-600">
                Inspect raw PayPal Sandbox collections rendered through high-performance AG Grid tables.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { href: '/invoices', label: 'Invoices', api: 'GET /v2/invoicing', desc: 'Invoices & line items' },
              { href: '/transactions', label: 'Transactions', api: 'GET /v1/reporting/txn', desc: 'Transaction search' },
              { href: '/balances', label: 'Balances', api: 'GET /v1/reporting/bal', desc: 'Multi-currency balances' },
              { href: '/products', label: 'Products', api: 'GET /v1/catalogs/prod', desc: 'Product catalogs' },
              { href: '/plans', label: 'Plans', api: 'GET /v1/billing/plans', desc: 'Subscription billing' },
            ].map((ep) => (
              <Link
                key={ep.href}
                href={ep.href}
                className="group rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-blue-500 hover:bg-blue-50/20 transition flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition">
                    {ep.label} &rarr;
                  </div>
                  <div className="mt-0.5 text-[10px] font-mono text-slate-400 truncate">{ep.api}</div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">{ep.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
