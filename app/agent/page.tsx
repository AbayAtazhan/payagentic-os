'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  Key,
  Layers,
  RefreshCw,
  Send,
  Shield,
  Sliders,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { AgentActionsGrid } from './components/agent-actions-grid';
import type { AgentAction, AgentAuditLog, AgentConfig } from '@/lib/agent/types';

export default function AgentCommandCenter() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [logs, setLogs] = useState<AgentAuditLog[]>([]);
  const [config, setConfig] = useState<AgentConfig>({
    autoPilotEnabled: true,
    confidenceThreshold: 92,
    maxAutonomousPayoutAmount: 500,
  });
  const [rescanning, setRescanning] = useState(false);
  const [balances, setBalances] = useState<{ availableUSD: string; totalUSD: string }>({
    availableUSD: '42,500.00',
    totalUSD: '48,250.00',
  });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'agent'; text: string; actionTaken?: string }[]
  >([
    {
      role: 'agent',
      text: '👋 PayAgentic Copilot initialized. I monitor your PayPal Sandbox ledger, detect delinquent invoices, verify contractor milestones, and execute payments with enterprise guardrails.',
    },
  ]);
  const [sendingChat, setSendingChat] = useState(false);
  const [envInfo, setEnvInfo] = useState<{ isPayPalConfigured: boolean; isSimulationMode: boolean }>({
    isPayPalConfigured: false,
    isSimulationMode: true,
  });

  // Sandbox Credential Switcher Dialog State
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const [inputSecret, setInputSecret] = useState('');
  const [credStatus, setCredStatus] = useState<{ loading?: boolean; msg?: string; error?: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/agent');
      const data = await res.json();
      if (data.success) {
        setActions(data.actions);
        setLogs(data.logs);
        setConfig(data.config);
        if (data.balances) setBalances(data.balances);
        if (data.environment) setEnvInfo(data.environment);
      }
    } catch (e) {
      console.error('Failed to load agent data:', e);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rescan' }),
      });
      const data = await res.json();
      if (data.success) {
        setActions(data.actions);
        setLogs(data.logs);
        if (data.balances) setBalances(data.balances);
      }
    } finally {
      setRescanning(false);
    }
  };

  const handleApprove = async (actionId: string) => {
    const targetAction = actions.find((a) => a.id === actionId);
    const agentType = targetAction?.agentType || 'AP_PAYOUTS';

    // 1. Optimistic UI update: instantly mark row as Approved in browser state
    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId
          ? {
              ...a,
              status: 'APPROVED',
              executedAt: new Date().toISOString(),
              paypalRefId: 'DISPATCHING...',
            }
          : a
      )
    );

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', actionId }),
      });
      const data = await res.json();
      if (data.success && data.referenceId) {
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId
              ? {
                  ...a,
                  status: 'APPROVED',
                  executedAt: new Date().toISOString(),
                  paypalRefId: data.referenceId,
                }
              : a
          )
        );
        setLogs((prev) => [
          {
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actionId,
            agentType,
            event: 'MANUALLY_APPROVED',
            details: `Approved by merchant and executed via PayPal Sandbox. Ref: ${data.referenceId}`,
            paypalReference: data.referenceId,
          },
          ...prev,
        ]);
      }
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const handleReject = async (actionId: string) => {
    // Optimistic UI update
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: 'REJECTED' } : a))
    );
    try {
      await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', actionId }),
      });
    } catch (e) {
      console.error('Reject failed:', e);
    }
  };

  const handleConfigChange = async (newConfig: Partial<AgentConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_config', config: updated }),
    });
  };

  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || sendingChat) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: textToSend }]);
    if (!presetText) setChatInput('');
    setSendingChat(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'agent', text: data.reply, actionTaken: data.actionTaken },
        ]);
        if (['CREATE_INVOICE', 'DISBURSE_PAYOUT'].includes(data.actionTaken)) {
          fetchData();
        }
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'agent', text: '⚠️ Failed to connect to agent service.' },
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleConnectSandbox = async () => {
    setCredStatus({ loading: true });
    try {
      const res = await fetch('/api/paypal/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect_sandbox',
          clientId: inputClientId.trim(),
          secret: inputSecret.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCredStatus({ loading: false, msg: data.message, error: false });
        await fetchData();
        setTimeout(() => setShowCredsModal(false), 1500);
      } else {
        setCredStatus({ loading: false, msg: data.error, error: true });
      }
    } catch (e) {
      setCredStatus({ loading: false, msg: (e as Error).message, error: true });
    }
  };

  const handleResetSimulation = async () => {
    setCredStatus({ loading: true });
    try {
      const res = await fetch('/api/paypal/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_simulation' }),
      });
      const data = await res.json();
      setCredStatus({ loading: false, msg: data.message, error: false });
      await fetchData();
      setTimeout(() => setShowCredsModal(false), 1200);
    } catch (e) {
      setCredStatus({ loading: false, msg: (e as Error).message, error: true });
    }
  };

  const autoExecutedCount = actions.filter((a) => a.status === 'AUTONOMOUSLY_EXECUTED').length;
  const pendingCount = actions.filter((a) => a.status === 'PENDING_APPROVAL').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">PayAgentic OS</span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                  Agentic Commerce Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">Autonomous Financial Ops &amp; Guardrails for PayPal Merchants</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Interactive Sandbox Switcher Pill */}
            <button
              onClick={() => setShowCredsModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition"
              title="Click to switch between Live PayPal Sandbox credentials and Pre-loaded Simulator"
            >
              <span className={`h-2 w-2 rounded-full ${envInfo.isPayPalConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
              {envInfo.isPayPalConfigured ? 'Live PayPal Sandbox Connected' : 'High-Fidelity Sandbox Simulator'}
              <Key className="h-3 w-3 text-slate-400 ml-1" />
            </button>

            <button
              onClick={handleRescan}
              disabled={rescanning}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${rescanning ? 'animate-spin' : ''}`} />
              {rescanning ? 'Scanning Ledger...' : 'Run Agent Scan'}
            </button>

            <Link
              href="/"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Back to Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-6 pt-6 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">PayPal Available USD</span>
              <Zap className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">${balances.availableUSD}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Shield className="h-3 w-3 text-slate-400" /> Total Balance: ${balances.totalUSD} USD
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Auto-Pilot Status</span>
              <Bot className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {config.autoPilotEnabled ? 'Autonomous' : 'Manual'}
              </span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                ACTIVE
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Confidence &ge; {config.confidenceThreshold}% &bull; Cap &le; ${config.maxAutonomousPayoutAmount}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Auto-Dispatched</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{autoExecutedCount}</div>
            <div className="mt-1 text-xs text-slate-500">Executed straight to PayPal Sandbox</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Pending Sign-off</span>
              <Shield className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{pendingCount}</div>
            <div className="mt-1 text-xs text-slate-500">Requires merchant approval</div>
          </div>
        </div>

        {/* Enterprise Guardrails Configuration Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">Autonomous Safety Guardrails &amp; Policy Bounds</h2>
            </div>
            <span className="text-xs text-slate-500">Enterprise Dual-Key Controls</span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                <span>Autonomous Engine Mode</span>
                <span className="text-blue-600 font-semibold">{config.autoPilotEnabled ? 'Enabled' : 'Paused'}</span>
              </label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => handleConfigChange({ autoPilotEnabled: !config.autoPilotEnabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.autoPilotEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${config.autoPilotEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
                <span className="text-xs text-slate-600">
                  {config.autoPilotEnabled ? 'Auto-executes safe micro-actions' : 'Requires manual sign-off for all actions'}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Min Confidence Threshold</span>
                <span className="font-bold text-blue-600">{config.confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="99"
                value={config.confidenceThreshold}
                onChange={(e) => handleConfigChange({ confidenceThreshold: Number(e.target.value) })}
                className="mt-2 w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500">Actions below {config.confidenceThreshold}% require explicit approval.</span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Max Autonomous Payout Cap</span>
                <span className="font-bold text-emerald-600">${config.maxAutonomousPayoutAmount} USD</span>
              </div>
              <input
                type="range"
                min="100"
                max="2500"
                step="50"
                value={config.maxAutonomousPayoutAmount}
                onChange={(e) => handleConfigChange({ maxAutonomousPayoutAmount: Number(e.target.value) })}
                className="mt-2 w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500">Payouts &gt; ${config.maxAutonomousPayoutAmount} automatically trigger dual-key hold.</span>
            </div>
          </div>
        </div>

        {/* Primary AG Grid Workspace */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Live Agent Operations Grid (AG Grid)
              </h2>
              <p className="text-xs text-slate-500">
                Real-time recommendations generated across AR Dunning, AP Payouts, and Risk Sentinel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                <Bot className="h-3.5 w-3.5 text-blue-600" /> 4 Active Subagents
              </span>
            </div>
          </div>

          <AgentActionsGrid actions={actions} onApprove={handleApprove} onReject={handleReject} />
        </section>

        {/* Two-Column Bottom Row: Natural Language Copilot + Audit Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Natural Language Copilot Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col h-[400px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-slate-900">Natural Language Agent Copilot</h3>
              </div>
              <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono">Tool Calling Active</span>
            </div>

            {/* Prompt Quick Pills */}
            <div className="mt-3 flex flex-wrap gap-1.5 pb-2 border-b border-slate-50">
              <button
                onClick={() => handleSendChat('Create invoice for Apex Corp for $1,250')}
                className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-2.5 py-1 transition"
              >
                + Create $1,250 Invoice
              </button>
              <button
                onClick={() => handleSendChat('Disburse milestone payout of $450 to contractor@dev.com')}
                className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-2.5 py-1 transition"
              >
                + Disburse $450 Payout
              </button>
              <button
                onClick={() => handleSendChat('Summarize all unpaid invoices and default risk')}
                className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-2.5 py-1 transition"
              >
                + Audit Unpaid Invoices
              </button>
              <button
                onClick={() => handleSendChat('Check PayPal balances')}
                className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-2.5 py-1 transition"
              >
                + Check Balances
              </button>
            </div>

            {/* Chat Messages Log */}
            <div className="mt-2 flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2.5 leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {sendingChat && (
                <div className="text-xs text-slate-400 italic flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Agent executing tool calls...
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Give command e.g. 'Disburse $300 to dev@ai.com' or 'Check balances'..."
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="rounded-md bg-blue-600 hover:bg-blue-700 text-white p-2 transition disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Real-time Immutable Audit Trail Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col h-[400px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Immutable Agent Audit Trail</h3>
              </div>
              <span className="text-xs text-slate-500">{logs.length} logged events</span>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-2">
              {logs.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-12">No audit logs recorded yet.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="rounded border border-slate-100 bg-slate-50/70 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            log.event === 'AUTO_EXECUTED'
                              ? 'bg-emerald-500'
                              : log.event === 'MANUALLY_APPROVED'
                              ? 'bg-blue-500'
                              : log.event === 'REJECTED'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        {log.event}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                    {log.paypalReference && (
                      <div className="mt-1 text-[10px] font-mono text-blue-600">
                        PayPal Ref: {log.paypalReference}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sandbox Credential & Environment Switcher Modal */}
      {showCredsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">PayPal Sandbox Environment</h3>
              </div>
              <button
                onClick={() => setShowCredsModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Judges can test PayAgentic OS using our <strong>preloaded high-fidelity merchant simulation</strong> (with 50+ realistic transactions and invoices) OR connect directly to a live <strong>PayPal Developer Sandbox</strong> account.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700">Sandbox Client ID</label>
                <input
                  type="text"
                  placeholder="e.g. A21AAJ..."
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Sandbox Secret</label>
                <input
                  type="password"
                  placeholder="e.g. E..."
                  value={inputSecret}
                  onChange={(e) => setInputSecret(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {credStatus && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
                  credStatus.error
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {credStatus.error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                <span>{credStatus.msg}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleConnectSandbox}
                disabled={credStatus?.loading || !inputClientId || !inputSecret}
                className="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {credStatus?.loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Validate &amp; Connect Live Sandbox
              </button>

              <button
                onClick={handleResetSimulation}
                disabled={credStatus?.loading}
                className="w-full rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-2 text-xs transition"
              >
                Reset to Pre-loaded Simulation (Default)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
