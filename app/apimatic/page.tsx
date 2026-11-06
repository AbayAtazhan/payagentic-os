'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle, Code, Cpu, ExternalLink, ShieldCheck } from 'lucide-react';

export default function ApimaticPortal() {
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
              <h1 className="text-lg font-bold text-slate-900">APIMatic Context Plugin Architecture</h1>
              <p className="text-xs text-slate-500">Official Partner Integration: Context-Rich AI Agent Interfaces</p>
            </div>
          </div>
          <Link
            href="/agent"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Launch Agent Center &rarr;
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-8 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-6 shadow-2xs">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                How PayAgentic OS Leverages APIMatic Context Plugins
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Autonomous AI agents fail when they hallucinate parameters, misinterpret OAuth scopes, or format JSON payloads incorrectly.
                By combining <strong>APIMatic Context Plugins</strong> (configured in <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-[11px]">.apimatic/context.json</code>) with OpenAPI 3.1 contracts (<code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-[11px]">docs/openapi.yaml</code>), our AI swarm executes PayPal Invoices, Payouts, and Orders with 100% deterministic type safety and zero prompt hallucination.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Code className="h-4 w-4 text-blue-600" />
              APIMatic Plugin Specification
            </h3>
            <p className="text-xs text-slate-500">
              Active configuration located in <code className="font-mono text-[11px] text-slate-700">.apimatic/context.json</code>
            </p>
            <div className="rounded-lg bg-slate-900 p-4 font-mono text-[11px] text-slate-300 overflow-x-auto">
              <pre>{`{
  "name": "PayAgentic PayPal REST Plugin",
  "provider": {
    "name": "PayPal Developer Platform",
    "baseUrl": "https://api-m.sandbox.paypal.com",
    "spec": "./docs/openapi.yaml"
  },
  "auth": {
    "type": "oauth2",
    "grantType": "client_credentials"
  },
  "agentTools": [
    "create_paypal_invoice",
    "send_paypal_invoice",
    "create_paypal_payout",
    "get_paypal_balances"
  ]
}`}</pre>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Guaranteed Agent Safety Bounds
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 pt-1">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>No Parameter Hallucination:</strong> Required fields (<code className="font-mono text-[10px]">currency_code</code>, <code className="font-mono text-[10px]">amount</code>, <code className="font-mono text-[10px]">items</code>) strictly validated before transmission.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Cryptographic Idempotency:</strong> All payouts include <code className="font-mono text-[10px]">PayPal-Request-Id</code> headers to guarantee no double-disbursements.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Zero Browser Secret Leakage:</strong> PayPal Client Secrets stay strictly on the server-side runtime, never exposed to AI clients.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>OpenAPI 3.1 Certified:</strong> Compliant with current APIMatic SDK generation and Context Plugin standards.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
