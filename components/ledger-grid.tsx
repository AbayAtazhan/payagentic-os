'use client';

// The escrow ledger: every milestone across every deal, with its PayPal references.

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  NumberFilterModule,
  QuickFilterModule,
  RowStyleModule,
  TextFilterModule,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import type { Deal, MilestoneStatus } from '@/lib/types';
import { money, StatusBadge, statusLabel } from './ui';

const modules = [
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  QuickFilterModule,
  ColumnAutoSizeModule,
  RowStyleModule,
  CellStyleModule,
];

const theme = themeQuartz.withParams({
  fontFamily: 'var(--pp-font)',
  accentColor: 'var(--pp-blue)',
  foregroundColor: 'var(--pp-ink)',
  borderColor: 'var(--pp-border)',
  headerFontWeight: 600,
  headerTextColor: 'var(--pp-muted)',
  rowHoverColor: 'var(--pp-highlight)',
  wrapperBorderRadius: 16,
});

type Row = {
  dealId: string;
  deal: string;
  milestone: string;
  amount: number;
  currency: string;
  status: MilestoneStatus;
  checks: number;
  verdict: string;
  confidence: number | null;
  paidOut: number | null;
  authorizationId: string;
  captureId: string;
  payoutBatchId: string;
};

export function LedgerGrid({ deals }: { deals: Deal[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const rows = useMemo<Row[]>(
    () =>
      deals.flatMap((d) =>
        d.milestones.map((m) => {
          const v = m.submissions[m.submissions.length - 1]?.verdict;
          return {
            dealId: d.id,
            deal: d.title,
            milestone: m.title,
            amount: Number(m.amount),
            currency: d.currency,
            status: m.status,
            checks: m.submissions.length,
            verdict: v ? `${v.results.filter((r) => r.status === 'met').length}/${v.results.length} met${v.manipulation.detected ? ' · flagged' : ''}` : '',
            confidence: v ? v.confidence : null,
            paidOut: m.release ? Number(m.release.payoutAmount) : null,
            authorizationId: m.authorizationId ?? '',
            captureId: m.release?.captureId ?? '',
            payoutBatchId: m.release?.payoutBatchId ?? '',
          };
        }),
      ),
    [deals],
  );

  const columns = useMemo<ColDef<Row>[]>(
    () => [
      { field: 'deal', headerName: 'Deal', pinned: 'left', minWidth: 180 },
      { field: 'milestone', headerName: 'Milestone', minWidth: 170 },
      {
        field: 'amount',
        headerName: 'Amount',
        filter: 'agNumberColumnFilter',
        valueFormatter: (p) => (p.data ? money(p.value, p.data.currency) : ''),
      },
      {
        field: 'status',
        headerName: 'Status',
        filterValueGetter: (p) => (p.data ? statusLabel(p.data.status) : ''),
        cellRenderer: (p: ICellRendererParams<Row>) => (p.data ? <StatusBadge status={p.data.status} /> : null),
      },
      { field: 'checks', headerName: 'AI checks', filter: 'agNumberColumnFilter' },
      { field: 'verdict', headerName: 'Latest verdict' },
      {
        field: 'confidence',
        headerName: 'Confidence',
        filter: 'agNumberColumnFilter',
        valueFormatter: (p) => (p.value == null ? '' : `${p.value}%`),
      },
      {
        field: 'paidOut',
        headerName: 'Paid to freelancer',
        filter: 'agNumberColumnFilter',
        valueFormatter: (p) => (p.value == null || !p.data ? '' : money(p.value, p.data.currency)),
      },
      { field: 'authorizationId', headerName: 'PayPal authorization', cellClass: 'font-mono text-xs' },
      { field: 'captureId', headerName: 'PayPal capture', cellClass: 'font-mono text-xs' },
      { field: 'payoutBatchId', headerName: 'PayPal payout batch', cellClass: 'font-mono text-xs' },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search deals, milestones, PayPal IDs…"
        aria-label="Search the ledger"
        className="h-10 w-full max-w-sm rounded-full border border-pp-border bg-white px-4 text-sm outline-none focus:border-pp-blue"
      />
      <div className="h-[420px]">
        <AgGridProvider modules={modules}>
          <AgGridReact<Row>
            theme={theme}
            rowData={rows}
            columnDefs={columns}
            defaultColDef={{ filter: true, sortable: true, resizable: true }}
            quickFilterText={search}
            autoSizeStrategy={{ type: 'fitCellContents' }}
            onRowClicked={(e) => e.data && router.push(`/deals/${e.data.dealId}`)}
            rowClass="cursor-pointer"
            enableCellTextSelection
            overlayNoRowsTemplate="No milestones yet"
          />
        </AgGridProvider>
      </div>
    </div>
  );
}
