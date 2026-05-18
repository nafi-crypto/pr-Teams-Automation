'use client';

import { useTransition, useRef, useState } from 'react';
import { addRuleAction, deleteRuleAction, toggleRuleAction } from '@/app/actions';
import type { RoutingRule } from '@/lib/types';
import type { GitHubRepository } from '@/lib/github';

interface RulesManagerProps {
  rules: RoutingRule[];
  availableRepos?: GitHubRepository[];
}

const EVENTS = [
  'pull_request','pull_request.opened','pull_request.closed','pull_request.reopened',
  'pull_request_review','pull_request_review.submitted',
  'issues','issues.opened','issues.closed',
  'issue_comment','issue_comment.created',
  'push','deployment_status','release','release.published',
  'star','star.created','fork','workflow_run','workflow_run.completed',
];

export function RulesManager({ rules, availableRepos = [] }: RulesManagerProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['*']);
  const [channelType, setChannelType] = useState<'teams' | 'slack'>('teams');

  const reposByOrg: Record<string, GitHubRepository[]> = {};
  availableRepos.forEach((r) => {
    const org = r.full_name.split('/')[0];
    if (!reposByOrg[org]) reposByOrg[org] = [];
    reposByOrg[org].push(r);
  });

  const handleAdd = (fd: FormData) => {
    fd.set('events', selectedEvents.join(','));
    fd.set('channelType', channelType);
    startTransition(async () => {
      await addRuleAction(fd);
      formRef.current?.reset();
      setSelectedEvents(['*']);
      setShowForm(false);
    });
  };

  const toggleEvent = (ev: string) => {
    if (ev === '*') { setSelectedEvents(['*']); return; }
    setSelectedEvents((prev) => {
      const w = prev.filter((e) => e !== '*');
      if (w.includes(ev)) { const n = w.filter((e) => e !== ev); return n.length === 0 ? ['*'] : n; }
      return [...w, ev];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Routing Rules</h2>
            <p className="text-sm text-slate-500">{rules.length} rule{rules.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer">
          {showForm ? '✕ Cancel' : '+ Add Rule'}
        </button>
      </div>

      {showForm && (
        <form ref={formRef} action={handleAdd} className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-6 space-y-4 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rr-repo" className="block text-sm font-medium text-slate-400 mb-1.5">Repository</label>
              {availableRepos.length > 0 ? (
                <select id="rr-repo" name="repoName" required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
                  <option value="">Select...</option>
                  {Object.entries(reposByOrg).map(([org, repos]) => (
                    <optgroup key={org} label={org}>
                      {repos.map((r) => <option key={r.id} value={r.full_name}>{r.name} {r.private ? '🔒' : '🌐'}</option>)}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <input type="text" id="rr-repo" name="repoName" placeholder="org/repo" required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              )}
            </div>
            <div>
              <label htmlFor="rr-ch" className="block text-sm font-medium text-slate-400 mb-1.5">Channel Name</label>
              <input type="text" id="rr-ch" name="channelName" placeholder="#frontend-alerts" required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Channel Type</label>
            <div className="flex gap-3">
              {(['teams', 'slack'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setChannelType(t)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${channelType === t ? (t === 'teams' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-purple-500/10 border-purple-500/40 text-purple-400') : 'bg-slate-900/50 border-slate-700/50 text-slate-500 hover:text-slate-300'}`}>
                  {t === 'teams' ? '📋 Microsoft Teams' : '💬 Slack'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="rr-url" className="block text-sm font-medium text-slate-400 mb-1.5">Webhook URL</label>
            <input type="url" id="rr-url" name="webhookUrl" placeholder={channelType === 'teams' ? 'https://...webhook.office.com/...' : 'https://hooks.slack.com/services/...'} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-400">Events</label>
              <button type="button" onClick={() => setSelectedEvents(['*'])} className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer">Reset to all (*)</button>
            </div>
            <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-3 max-h-40 overflow-y-auto flex flex-wrap gap-1.5">
              <button type="button" onClick={() => toggleEvent('*')} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${selectedEvents.includes('*') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800/60 text-slate-500 border border-slate-700/50'}`}>✦ All (*)</button>
              {!selectedEvents.includes('*') && EVENTS.map((ev) => (
                <button key={ev} type="button" onClick={() => toggleEvent(ev)} className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer ${selectedEvents.includes(ev) ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/40 text-slate-500 border border-slate-700/30 hover:text-slate-300'}`}>{ev}</button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isPending} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer text-sm">
            {isPending ? 'Creating...' : 'Create Routing Rule'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium">No routing rules configured</p>
            <p className="text-sm mt-1">Click &ldquo;Add Rule&rdquo; to get started</p>
          </div>
        ) : rules.map((rule) => (
          <div key={rule.id} className={`group rounded-xl border transition-all ${rule.enabled ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600' : 'bg-slate-900/30 border-slate-800/30 opacity-60'}`}>
            <div className="flex items-center gap-4 px-5 py-4">
              <button onClick={() => startTransition(() => toggleRuleAction(rule.id))} disabled={isPending}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${rule.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <div className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${rule.channelType === 'teams' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                {rule.channelType === 'teams' ? '📋' : '💬'} {rule.channelType}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-white truncate">{rule.repoName}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-indigo-300 truncate">{rule.channelName}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {rule.events.slice(0, 4).map((ev) => (
                    <span key={ev} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/60 text-slate-400 border border-slate-700/30">{ev}</span>
                  ))}
                  {rule.events.length > 4 && <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/60 text-slate-500">+{rule.events.length - 4}</span>}
                </div>
              </div>
              <button onClick={() => startTransition(() => deleteRuleAction(rule.id))} disabled={isPending}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-400/10 px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium cursor-pointer shrink-0">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
