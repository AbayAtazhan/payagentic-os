'use client';

// Funds a milestone: PayPal checkout (JS SDK v6) with intent AUTHORIZE, so the money is only held.
// Without sandbox keys a plain button runs the same server flow in simulated mode.

import { PayPalOneTimePaymentButton, PayPalProvider } from '@paypal/react-paypal-js/sdk-v6';
import { useState } from 'react';
import type { Terms } from '@/lib/types';
import { api, Button, money, useConfig } from './ui';

export type Funded = { orderId: string; authorizationId: string; expiresAt: string | null; termsToken: string };

export function FundButton({ terms, onFunded }: { terms: Terms; onFunded: (f: Funded) => void }) {
  const config = useConfig();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const createOrder = async () => {
    setError('');
    const { orderId } = await api<{ orderId: string }>('/api/escrow/order', { terms });
    return { orderId };
  };
  const authorize = async (orderId: string) => {
    const res = await api<Omit<Funded, 'orderId'>>('/api/escrow/authorize', { terms, orderId });
    onFunded({ orderId, ...res });
  };

  if (!config) return <div className="h-11 w-56 animate-pulse rounded-full bg-pp-canvas" />;

  if (config.paypalMode === 'simulated' || !config.paypalClientId) {
    return (
      <div className="space-y-2">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const { orderId } = await createOrder();
              await authorize(orderId);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Holding funds…' : `Fund ${money(terms.amount, terms.currency)} (simulated PayPal)`}
        </Button>
        {error && <p className="text-sm text-pp-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs space-y-2">
      <PayPalProvider clientId={config.paypalClientId} environment="sandbox" components={['paypal-payments']} pageType="checkout">
        <PayPalOneTimePaymentButton
          createOrder={async () => {
            try {
              return await createOrder();
            } catch (e) {
              setError((e as Error).message);
              throw e;
            }
          }}
          onApprove={async ({ orderId }: { orderId: string }) => {
            try {
              await authorize(orderId);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
          onCancel={() => setError('Payment window closed. Nothing was charged.')}
          onError={(e: unknown) => setError(`PayPal error: ${(e as Error)?.message ?? 'unknown'}`)}
        />
      </PayPalProvider>
      <p className="text-xs text-pp-muted">
        PayPal only <b>holds</b> {money(terms.amount, terms.currency)}. Nothing is charged until the work passes review.
      </p>
      {error && <p className="text-sm text-pp-danger">{error}</p>}
    </div>
  );
}
