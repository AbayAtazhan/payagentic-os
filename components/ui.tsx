'use client';

import Link from 'next/link';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { AppConfig, MilestoneStatus } from '@/lib/types';

export const money = (value: string | number, currency = 'USD') =>
  Number(value).toLocaleString('en-US', { style: 'currency', currency });

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let configPromise: Promise<AppConfig> | null = null;
export function useConfig(): AppConfig | null {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    configPromise ??= api<AppConfig>('/api/config');
    configPromise.then(setConfig).catch(() => (configPromise = null));
  }, []);
  return config;
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-pp-blue text-white hover:bg-pp-blue-dark',
    secondary: 'border border-pp-border bg-white text-pp-ink hover:bg-pp-canvas',
    danger: 'border border-pp-danger/30 bg-white text-pp-danger hover:bg-pp-danger/5',
    ghost: 'text-pp-blue hover:bg-pp-highlight',
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-pp-border bg-white ${className}`}>{children}</div>;
}

const STATUS: Record<MilestoneStatus, { label: string; cls: string }> = {
  AGREED: { label: 'Not funded', cls: 'bg-slate-100 text-slate-700' },
  FUNDED: { label: 'Funds held in PayPal', cls: 'bg-pp-highlight text-pp-blue-dark' },
  CHANGES_REQUESTED: { label: 'Changes requested', cls: 'bg-amber-50 text-pp-warning' },
  NEEDS_REVIEW: { label: 'Waiting for client', cls: 'bg-violet-50 text-violet-700' },
  RELEASED: { label: 'Paid', cls: 'bg-emerald-50 text-pp-success' },
  REFUNDED: { label: 'Refunded', cls: 'bg-rose-50 text-pp-danger' },
};

export const statusLabel = (s: MilestoneStatus) => STATUS[s].label;

export function StatusBadge({ status }: { status: MilestoneStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-pp-navy">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-pp-navy text-sm text-white">P✓</span>
      <span className="text-lg">ProofPay</span>
    </Link>
  );
}

export function Header() {
  const config = useConfig();
  return (
    <header className="sticky top-0 z-20 border-b border-pp-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-3">
          <Link href="/deals" className="rounded-full px-3 py-1.5 text-pp-ink hover:bg-pp-canvas">
            Deals
          </Link>
          <Link href="/deals/new" className="rounded-full bg-pp-blue px-3 py-1.5 text-white hover:bg-pp-blue-dark">
            New deal
          </Link>
          {config && (
            <span
              title={config.paypalMode === 'sandbox' ? 'Real PayPal sandbox API calls' : 'No PayPal keys: payments are simulated'}
              className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${
                config.paypalMode === 'sandbox' ? 'bg-emerald-50 text-pp-success' : 'bg-amber-50 text-pp-warning'
              }`}
            >
              PayPal {config.paypalMode === 'sandbox' ? 'Sandbox live' : 'simulated'}
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
