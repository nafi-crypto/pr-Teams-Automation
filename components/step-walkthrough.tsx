'use client';

import { useState } from 'react';

const STEPS = [
  {
    number: 1,
    title: 'GitHub Event Arrives',
    subtitle: 'Webhook payload received via HTTP POST',
    icon: '📨',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/20',
    description:
      'GitHub fires a webhook whenever something happens in your repository — a PR is opened, code is pushed, a release is published. The payload arrives as an HTTP POST to your endpoint.',
    code: `// The HTTP request from GitHub
POST /api/github/webhook HTTP/1.1
X-GitHub-Event: pull_request     ← event category
X-Hub-Signature-256: sha256=...  ← HMAC verification
Content-Type: application/json

{
  "action": "opened",            ← specific action
  "repository": {
    "name": "my-app",
    "full_name": "acme/my-app"   ← unique repo identifier
  },
  "pull_request": {
    "title": "feat: add OAuth",
    "user": { "login": "octocat" },
    "html_url": "https://github.com/..."
  }
}`,
    keyPoints: [
      { label: 'Header', value: 'X-GitHub-Event → event category', mono: true },
      { label: 'Repo', value: 'body.repository.full_name → unique ID', mono: true },
      { label: 'Action', value: 'body.action → specific trigger', mono: true },
    ],
  },
  {
    number: 2,
    title: 'Extract Event Identity',
    subtitle: 'Build a unique event key from header + action',
    icon: '🔑',
    color: 'from-violet-500 to-purple-500',
    borderColor: 'border-violet-500/30',
    glowColor: 'shadow-violet-500/20',
    description:
      'Combine the X-GitHub-Event header with the action field to create a unique event key. This becomes the lookup key for routing.',
    code: `// Extracting the identity
const eventType = headers["X-GitHub-Event"];  // "pull_request"
const action    = body.action;                 // "opened"
const repoName  = body.repository.full_name;   // "acme/my-app"

// Build the composite event key
const eventKey = \`\${eventType}.\${action}\`;
// → "pull_request.opened"

// This is the unique key used for routing lookup`,
    keyPoints: [
      { label: 'Event Type', value: 'pull_request', mono: true },
      { label: 'Action', value: 'opened', mono: true },
      { label: 'Event Key', value: 'pull_request.opened', mono: true },
      { label: 'Repository', value: 'acme/my-app', mono: true },
    ],
  },
  {
    number: 3,
    title: 'Route Lookup',
    subtitle: 'Query the rules database for matching channels',
    icon: '🗄️',
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/30',
    glowColor: 'shadow-amber-500/20',
    description:
      'The routing engine scans the rules database: "Is there any rule where the repo name matches AND this event key is in the allowed list AND the rule is enabled?" If yes, return the webhook URLs.',
    code: `// The core routing lookup
function findMatchingRules(repoName, eventType, action) {
  return rules.filter(rule => {
    if (!rule.enabled) return false;
    if (rule.repoName !== repoName) return false;

    // Check event matching
    return rule.events.some(ev => {
      if (ev === "*") return true;          // wildcard
      if (ev === eventType) return true;    // category match
      if (ev === eventKey) return true;     // exact match
      return false;
    });
  });
}

// Example: finds 2 rules → Teams + Slack`,
    keyPoints: [
      { label: 'Match Criteria', value: 'repo + event + enabled', mono: false },
      { label: 'Wildcard', value: '"*" matches all events', mono: false },
      { label: 'Multi-match', value: 'One event → multiple channels', mono: false },
    ],
  },
  {
    number: 4,
    title: 'Format Message',
    subtitle: 'Transform payload into Teams or Slack format',
    icon: '🎨',
    color: 'from-emerald-500 to-green-500',
    borderColor: 'border-emerald-500/30',
    glowColor: 'shadow-emerald-500/20',
    description:
      'Each matched rule specifies a channel type. Teams gets an Adaptive Card (MessageCard JSON). Slack gets Block Kit JSON. Same event data, different envelope — the formatter handles the translation.',
    code: `// The routing engine delegates to the right formatter
for (const rule of matchedRules) {
  if (rule.channelType === "teams") {
    payload = formatTeamsMessage(eventType, webhookBody);
    // → { "@type": "MessageCard", themeColor, sections, ... }
  }
  
  if (rule.channelType === "slack") {
    payload = formatSlackMessage(eventType, webhookBody);
    // → { blocks: [...], text: "fallback" }
  }
}

// Both formats built from the same source data`,
    keyPoints: [
      { label: 'Teams', value: 'MessageCard with Adaptive Cards', mono: false },
      { label: 'Slack', value: 'Block Kit with rich formatting', mono: false },
      { label: 'Same data', value: 'Different envelope per channel', mono: false },
    ],
  },
  {
    number: 5,
    title: 'Deliver',
    subtitle: 'POST formatted message to each webhook URL',
    icon: '🚀',
    color: 'from-rose-500 to-pink-500',
    borderColor: 'border-rose-500/30',
    glowColor: 'shadow-rose-500/20',
    description:
      'Fan out delivery: POST the formatted JSON to every matched webhook URL in parallel. Log successes and failures. One GitHub event can hit Teams, Slack, or both simultaneously.',
    code: `// Parallel delivery to all matched channels
const results = await Promise.all(
  routeResults.map(({ rule, formattedPayload }) =>
    fetch(rule.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedPayload),
    })
  )
);

// Summary: "Routed to 2 channels: 2 delivered, 0 failed"
// ✅ #frontend-prs (Teams)
// ✅ #deployments  (Slack)`,
    keyPoints: [
      { label: 'Method', value: 'HTTP POST to incoming webhook URL', mono: false },
      { label: 'Parallel', value: 'All channels delivered simultaneously', mono: false },
      { label: 'Resilient', value: 'Individual failures don\'t block others', mono: false },
    ],
  },
];

export function StepWalkthrough() {
  const [activeStep, setActiveStep] = useState(0);
  const [expandedCode, setExpandedCode] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Step progress bar */}
      <div className="flex items-center justify-between mb-8 px-2">
        {STEPS.map((step, idx) => (
          <div key={step.number} className="flex items-center flex-1">
            <button
              onClick={() => setActiveStep(idx)}
              className={`
                relative flex items-center justify-center w-11 h-11 rounded-xl text-lg font-bold transition-all duration-300 cursor-pointer shrink-0
                ${activeStep === idx
                  ? `bg-gradient-to-br ${step.color} text-white scale-110 shadow-lg ${step.glowColor}`
                  : activeStep > idx
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800/60 text-slate-500 border border-slate-700/50 hover:border-slate-600'
                }
              `}
            >
              {activeStep > idx ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </button>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded transition-colors duration-500 ${
                activeStep > idx ? 'bg-emerald-500/40' : 'bg-slate-800'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Active step card */}
      {STEPS.map((step, idx) => (
        <div
          key={step.number}
          className={`transition-all duration-500 ${
            activeStep === idx
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 absolute pointer-events-none -translate-y-4'
          }`}
        >
          {activeStep === idx && (
            <div className={`rounded-2xl border ${step.borderColor} bg-slate-900/70 backdrop-blur-sm overflow-hidden shadow-2xl`}>
              {/* Header */}
              <div className={`bg-gradient-to-r ${step.color} px-6 py-4`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{step.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Step {step.number}: {step.title}
                    </h3>
                    <p className="text-white/80 text-sm">{step.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Description */}
                <p className="text-slate-300 leading-relaxed text-[15px]">
                  {step.description}
                </p>

                {/* Key points */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {step.keyPoints.map((kp, kIdx) => (
                    <div
                      key={kIdx}
                      className="bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700/40"
                    >
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                        {kp.label}
                      </div>
                      <div className={`text-sm ${kp.mono ? 'font-mono text-amber-300' : 'text-slate-200'}`}>
                        {kp.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Code toggle */}
                <button
                  onClick={() => setExpandedCode(expandedCode === idx ? null : idx)}
                  className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedCode === idx ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {expandedCode === idx ? 'Hide code' : 'Show code'}
                </button>

                {expandedCode === idx && (
                  <div className="animate-slide-down">
                    <pre className="bg-black/60 rounded-xl p-4 overflow-x-auto text-sm font-mono text-slate-300 border border-slate-800 leading-relaxed">
                      <code>{step.code}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="px-6 py-4 border-t border-slate-800/60 flex justify-between">
                <button
                  onClick={() => setActiveStep(Math.max(0, idx - 1))}
                  disabled={idx === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setActiveStep(Math.min(STEPS.length - 1, idx + 1))}
                  disabled={idx === STEPS.length - 1}
                  className={`px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r ${step.color} text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer`}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
