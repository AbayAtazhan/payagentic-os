'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ClientSideRowModelModule,
  ColumnAutoSizeModule,
  CsvExportModule,
  DateFilterModule,
  NumberFilterModule,
  QuickFilterModule,
  TextFilterModule,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import { CheckCircle2, Download, Maximize2, PlayCircle, ShieldCheck, XCircle } from 'lucide-react';
import type { AgentAction } from '@/lib/agent/types';

const modules = [
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  QuickFilterModule,
  ColumnAutoSizeModule,
  CsvExportModule,
];

const theme = themeQuartz.withParams({
  fontFamily: 'var(--pp-font)',
  accentColor: 'var(--pp-blue)',
  foregroundColor: 'var(--pp-ink)',
  borderColor: 'var(--pp-border)',
  headerFontWeight: 600,
  headerTextColor: 'var(--pp-muted)',
  rowHoverColor: 'var(--pp-highlight)',
});

type Props = {
  actions: AgentAction[];
  onApprove: (actionId: string) => Promise<void>;
  onReject: (actionId: string) => Promise<void>;
};

export function AgentActionsGrid({ actions, onApprove, onReject }: Props) {
  const [quickFilter, setQuickFilter] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const gridRef = useRef<AgGridReact<AgentAction>>(null);

  const handleExportCsv = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `payagentic-ledger-actions-${new Date().toISOString().slice(0, 10)}.csv`,
    });
  };

  const handleAutoSize = () => {
    gridRef.current?.api.autoSizeAllColumns();
  };

  const columnDefs = useMemo<ColDef<AgentAction>[]>(() => {
    return [
      {
        headerName: 'Agent',
        field: 'agentType',
        width: 135,
        cellRenderer: (params: ICellRendererParams<AgentAction>) => {
          const type = params.value;
          if (type === 'AR_DUNNING') {
            return (
              <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                AR Dunning
              </span>
            );
          }
          if (type === 'AP_PAYOUTS') {
            return (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                AP Payouts
              </span>
            );
          }
          if (type === 'RISK_SENTINEL') {
            return (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Risk Radar
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
              Pricing AI
            </span>
          );
        },
      },
      {
        headerName: 'Action Title & Rationale',
        field: 'title',
        flex: 2,
        minWidth: 260,
        cellRenderer: (params: ICellRendererParams<AgentAction>) => {
          const act = params.data;
          if (!act) return null;
          return (
            <div className="py-1">
              <div className="font-semibold text-slate-900">{act.title}</div>
              <div className="text-xs text-slate-500 truncate" title={act.description}>
                {act.description}
              </div>
            </div>
          );
        },
      },
      {
        headerName: 'Target Entity',
        field: 'targetEntity',
        width: 170,
        cellRenderer: (params: ICellRendererParams<AgentAction>) => {
          const act = params.data;
          return (
            <div className="text-xs">
              <div className="font-medium text-slate-800">{act?.targetEntity}</div>
              <div className="text-slate-400 truncate">{act?.targetEmail}</div>
            </div>
          );
        },
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 120,
        cellRenderer: (params: ICellRendererParams<AgentAction>) => {
          const amt = params.data?.amount;
          if (!amt) return <span className="text-slate-400 text-xs">—</span>;
          return <span className="font-semibold text-slate-900">${amt.value} {amt.currency_code}</span>;
        },
      },
      {
        headerName: 'Confidence',
        field: 'confidenceScore',
        width: 110,
        cellRenderer: (params: ICellRendererParams<AgentAction>) => {
          const score = params.value as number;
          const color = score >= 92 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50';
          return (
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${color}`}>
              {score}% Conf.
            </span>
          );
        },
      },
      {
        headerName: 'PayPal API',
        field: 'paypalApiMethod',
        width: 180,
        cellRenderer: (params: ICellRendererParams<AgentAction>) => {
          return <code className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{params.value}</code>;
        },
      },
      {
        headerName: 'Execution State',
        field: 'status',
        width: 195,
        cellRenderer: (params: ICellRendererParams<AgentAction>) => {
          const act = params.data;
          if (!act) return null;

          if (act.status === 'AUTONOMOUSLY_EXECUTED') {
            return (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Dispatched
              </span>
            );
          }
          if (act.status === 'APPROVED') {
            return (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                <ShieldCheck className="w-3.5 h-3.5" /> Executed ({act.paypalRefId?.slice(0, 10)})
              </span>
            );
          }
          if (act.status === 'REJECTED') {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                <XCircle className="w-3.5 h-3.5" /> Rejected
              </span>
            );
          }

          const isBusy = processingId === act.id;
          return (
            <div className="flex items-center gap-1.5 py-1">
              <button
                disabled={isBusy}
                onClick={async () => {
                  setProcessingId(act.id);
                  try {
                    await onApprove(act.id);
                  } finally {
                    setProcessingId(null);
                  }
                }}
                className="inline-flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium px-2 py-1 shadow-sm transition disabled:opacity-50"
              >
                <PlayCircle className="w-3 h-3" />
                {isBusy ? 'Calling...' : 'Approve'}
              </button>
              <button
                disabled={isBusy}
                onClick={async () => {
                  setProcessingId(act.id);
                  try {
                    await onReject(act.id);
                  } finally {
                    setProcessingId(null);
                  }
                }}
                className="rounded border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] px-1.5 py-1 transition disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          );
        },
      },
    ];
  }, [onApprove, onReject, processingId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            placeholder="Quick search agent actions, entities, or amounts..."
            className="w-80 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAutoSize}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs px-2.5 py-1.5 transition"
            title="Auto-fit column widths"
          >
            <Maximize2 className="w-3 h-3 text-slate-500" />
            Fit Columns
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs px-2.5 py-1.5 transition"
            title="Export full grid data as CSV"
          >
            <Download className="w-3 h-3 text-slate-500" />
            Export CSV
          </button>
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong>{actions.length}</strong> autonomous agent recommendations &bull; Powered by <strong>AG Grid</strong>
        </div>
      </div>

      <div className="h-[460px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <AgGridProvider modules={modules}>
          <AgGridReact
            ref={gridRef}
            theme={theme}
            rowData={actions}
            columnDefs={columnDefs}
            quickFilterText={quickFilter}
            rowHeight={52}
            headerHeight={40}
            animateRows={true}
          />
        </AgGridProvider>
      </div>
    </div>
  );
}
