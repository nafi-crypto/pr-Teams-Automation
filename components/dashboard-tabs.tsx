'use client';

import { useState } from 'react';
import { StepWalkthrough } from '@/components/step-walkthrough';
import { RulesManager } from '@/components/rules-manager';
import { SimulatePanel } from '@/components/simulate-panel';
import type { RoutingRule } from '@/lib/types';
import type { GitHubRepository } from '@/lib/github';

interface DashboardTabsProps {
  rules: RoutingRule[];
  availableRepos: GitHubRepository[];
}

const TABS = [
  { id: 'walkthrough', label: 'How It Works', icon: '⚡', color: 'indigo' },
  { id: 'rules', label: 'Routing Rules', icon: '🗄️', color: 'emerald' },
  { id: 'simulate', label: 'Simulate', icon: '▶', color: 'rose' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function DashboardTabs({ rules, availableRepos }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('walkthrough');

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-800 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? tab.color === 'indigo'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                  : tab.color === 'emerald'
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-rose-600/20 text-rose-300 border border-rose-500/30 shadow-lg shadow-rose-500/10'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 md:p-8 shadow-2xl min-h-[400px]">
        {activeTab === 'walkthrough' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">How the Routing Engine Works</h2>
              <p className="text-slate-400 text-sm">Walk through all 5 steps to understand the webhook routing pipeline</p>
            </div>
            <StepWalkthrough />
          </div>
        )}

        {activeTab === 'rules' && (
          <RulesManager rules={rules} availableRepos={availableRepos} />
        )}

        {activeTab === 'simulate' && (
          <SimulatePanel availableRepos={availableRepos} />
        )}
      </div>

      {/* Setup hint */}
      <div className="mt-8 rounded-2xl bg-slate-900/30 border border-slate-800/50 p-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Webhook Endpoint
        </h3>
        <div className="bg-black/40 rounded-xl p-4 border border-slate-800 font-mono text-sm text-indigo-300 break-all mb-3">
          POST https://&lt;your-domain&gt;/api/github/webhook
        </div>
        <p className="text-slate-500 text-sm">
          Set this as your Payload URL in GitHub → Settings → Webhooks. Content type: <code className="text-indigo-400">application/json</code>
        </p>
      </div>
    </div>
  );
}
