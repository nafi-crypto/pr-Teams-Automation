'use client';

import { useState } from 'react';
import type { GitHubRepository } from '@/lib/github';

interface SimulatePanelProps {
  availableRepos?: GitHubRepository[];
}

const EVENT_ACTIONS: Record<string, string[]> = {
  pull_request: ['opened', 'closed', 'reopened', 'edited', 'synchronize'],
  pull_request_review: ['submitted', 'dismissed'],
  issues: ['opened', 'closed', 'reopened', 'edited'],
  issue_comment: ['created', 'edited', 'deleted'],
  push: [''],
  deployment_status: ['created', 'success', 'failure', 'error'],
  release: ['published', 'created', 'edited'],
  star: ['created', 'deleted'],
  fork: ['created'],
  workflow_run: ['completed', 'requested', 'in_progress'],
};

interface SimStep {
  step: number;
  title: string;
  description: string;
  data?: any;
  status: 'success' | 'info' | 'warning' | 'error';
}

interface SimResult {
  steps: SimStep[];
  results: any[];
}

export function SimulatePanel({ availableRepos = [] }: SimulatePanelProps) {
  const [eventType, setEventType] = useState('pull_request');
  const [action, setAction] = useState('opened');
  const [repoName, setRepoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [activePreview, setActivePreview] = useState<number | null>(null);

  const actions = EVENT_ACTIONS[eventType] || [''];

  const runSimulation = async () => {
    if (!repoName) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, action, repoName }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error('Simulation failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'success': return <span className="text-emerald-400">✓</span>;
      case 'warning': return <span className="text-amber-400">⚠</span>;
      case 'error': return <span className="text-red-400">✕</span>;
      default: return <span className="text-blue-400">ℹ</span>;
    }
  };

  const statusBorder = (s: string) => {
    switch (s) {
      case 'success': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'warning': return 'border-amber-500/30 bg-amber-500/5';
      case 'error': return 'border-red-500/30 bg-red-500/5';
      default: return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
          <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Live Simulator</h2>
          <p className="text-sm text-slate-500">Test any repo + event combo without sending real webhooks</p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="sim-repo" className="block text-sm font-medium text-slate-400 mb-1.5">Repository</label>
            {availableRepos.length > 0 ? (
              <select id="sim-repo" value={repoName} onChange={(e) => setRepoName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
                <option value="">Select repo...</option>
                {availableRepos.map((r) => <option key={r.id} value={r.full_name}>{r.full_name}</option>)}
              </select>
            ) : (
              <input type="text" id="sim-repo" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="org/repo" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            )}
          </div>
          <div>
            <label htmlFor="sim-event" className="block text-sm font-medium text-slate-400 mb-1.5">Event Type</label>
            <select id="sim-event" value={eventType} onChange={(e) => { setEventType(e.target.value); setAction(EVENT_ACTIONS[e.target.value]?.[0] || ''); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
              {Object.keys(EVENT_ACTIONS).map((ev) => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sim-action" className="block text-sm font-medium text-slate-400 mb-1.5">Action</label>
            <select id="sim-action" value={action} onChange={(e) => setAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
              {actions.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
              {actions.length === 1 && actions[0] === '' && <option value="">(no action)</option>}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-black/30 rounded-xl px-4 py-2.5 border border-slate-800 font-mono text-sm">
            <span className="text-slate-500">Event Key: </span>
            <span className="text-amber-300">{eventType}{action ? `.${action}` : ''}</span>
            <span className="text-slate-600"> on </span>
            <span className="text-indigo-300">{repoName || '...'}</span>
          </div>
          <button onClick={runSimulation} disabled={loading || !repoName}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all disabled:opacity-40 cursor-pointer text-sm whitespace-nowrap flex items-center gap-2">
            {loading ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Running...</>
            ) : '▶ Run Simulation'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3 animate-slide-down">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Routing Execution Log</h3>
          {result.steps.map((step) => (
            <div key={step.step} className={`rounded-xl border p-4 ${statusBorder(step.status)} transition-all`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-lg">{statusIcon(step.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Step {step.step}</span>
                    <span className="text-sm font-semibold text-white">{step.title}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{step.description}</p>
                  {step.data && (
                    <div className="mt-2">
                      {/* Inline data display */}
                      {step.data.matchedRules && step.data.matchedRules.length > 0 && (
                        <div className="space-y-1">
                          {step.data.matchedRules.map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded ${r.channelType === 'teams' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{r.channelType}</span>
                              <span className="text-indigo-300">{r.channelName}</span>
                              <span className="text-slate-600 font-mono">[{r.events.join(', ')}]</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {step.data.channels && step.data.channels.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {step.data.channels.map((ch: any, i: number) => (
                            <div key={i}>
                              <button onClick={() => setActivePreview(activePreview === i ? null : i)}
                                className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
                                <svg className={`w-3 h-3 transition-transform ${activePreview === i ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                {ch.channel} ({ch.format}) — Preview payload
                              </button>
                              {activePreview === i && (
                                <pre className="mt-2 bg-black/40 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 border border-slate-800">
                                  {JSON.stringify(ch.payloadPreview, null, 2)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {step.data.targets && step.data.targets.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {step.data.targets.map((t: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-emerald-400">→</span>
                              <span className={`px-2 py-0.5 rounded ${t.channelType === 'teams' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{t.channelType}</span>
                              <span className="text-white">{t.channelName}</span>
                              <span className="text-slate-600 font-mono text-[10px]">{t.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className={`rounded-xl p-4 text-center text-sm font-medium ${result.results.length > 0 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'}`}>
            {result.results.length > 0
              ? `✓ ${result.results.length} channel(s) would receive this event`
              : '⚠ No channels matched — this event would be dropped'}
          </div>
        </div>
      )}
    </div>
  );
}
