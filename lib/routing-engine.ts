import { findMatchingRules, type RoutingRule } from './config';
import { formatTeamsMessage, type WebhookPayload } from './teams-formatter';
import { formatSlackMessage } from './slack-formatter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouteResult {
  rule: RoutingRule;
  formattedPayload: any;
}

export interface DeliveryResult {
  ruleId: string;
  channelType: string;
  channelName: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

export interface SimulationStep {
  step: number;
  title: string;
  description: string;
  data?: any;
  status: 'success' | 'info' | 'warning' | 'error';
}

// ---------------------------------------------------------------------------
// Core routing
// ---------------------------------------------------------------------------

/**
 * Route a GitHub webhook event to all matching channels.
 * Returns the matched rules + their formatted payloads.
 */
export function routeWebhook(eventType: string, payload: WebhookPayload): RouteResult[] {
  const repoName = payload.repository?.full_name;
  if (!repoName) return [];

  const action = payload.action;
  const matchedRules = findMatchingRules(repoName, eventType, action);

  return matchedRules.map((rule) => {
    let formattedPayload: any = null;

    if (rule.channelType === 'teams') {
      formattedPayload = formatTeamsMessage(eventType, payload);
    } else if (rule.channelType === 'slack') {
      formattedPayload = formatSlackMessage(eventType, payload);
    }

    return { rule, formattedPayload };
  }).filter((r) => r.formattedPayload !== null);
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/**
 * POST the formatted payload to the channel's webhook URL.
 */
export async function deliverToChannel(rule: RoutingRule, formattedPayload: any): Promise<DeliveryResult> {
  try {
    const response = await fetch(rule.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Delivery failed to ${rule.channelName}: ${response.status}`, errorText);
      return {
        ruleId: rule.id,
        channelType: rule.channelType,
        channelName: rule.channelName,
        success: false,
        statusCode: response.status,
        error: errorText.substring(0, 200),
      };
    }

    return {
      ruleId: rule.id,
      channelType: rule.channelType,
      channelName: rule.channelName,
      success: true,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      ruleId: rule.id,
      channelType: rule.channelType,
      channelName: rule.channelName,
      success: false,
      error: error.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Simulation (dry-run)
// ---------------------------------------------------------------------------

/**
 * Simulate the routing for a given event without actually delivering.
 * Returns step-by-step logs + matched rules + formatted payloads.
 */
export function simulateRouting(
  eventType: string,
  action: string,
  repoName: string
): { steps: SimulationStep[]; results: RouteResult[] } {
  const steps: SimulationStep[] = [];

  // Step 1 — Event arrives
  steps.push({
    step: 1,
    title: 'GitHub Event Received',
    description: `Webhook arrived with X-GitHub-Event: "${eventType}"`,
    data: { header: `X-GitHub-Event: ${eventType}`, repoName, action },
    status: 'info',
  });

  // Step 2 — Extract identity
  const eventKey = action ? `${eventType}.${action}` : eventType;
  steps.push({
    step: 2,
    title: 'Extract Event Identity',
    description: `Built event key from header + action`,
    data: {
      repoName,
      eventType,
      action: action || '(none)',
      eventKey,
    },
    status: 'success',
  });

  // Step 3 — Route lookup
  const matchedRules = findMatchingRules(repoName, eventType, action || undefined);
  steps.push({
    step: 3,
    title: 'Database Lookup',
    description: matchedRules.length > 0
      ? `Found ${matchedRules.length} matching rule(s)`
      : `No rules matched for "${repoName}" + "${eventKey}"`,
    data: {
      query: { repoName, eventKey },
      matchedCount: matchedRules.length,
      matchedRules: matchedRules.map((r) => ({
        id: r.id,
        channelType: r.channelType,
        channelName: r.channelName,
        events: r.events,
      })),
    },
    status: matchedRules.length > 0 ? 'success' : 'warning',
  });

  // Build mock payload for formatting
  const mockPayload: WebhookPayload = buildMockPayload(eventType, action, repoName);

  // Step 4 — Format messages
  const results: RouteResult[] = [];
  const formatDetails: any[] = [];

  matchedRules.forEach((rule) => {
    let formatted: any = null;
    if (rule.channelType === 'teams') {
      formatted = formatTeamsMessage(eventType, mockPayload);
    } else {
      formatted = formatSlackMessage(eventType, mockPayload);
    }

    if (formatted) {
      results.push({ rule, formattedPayload: formatted });
      formatDetails.push({
        channel: rule.channelName,
        type: rule.channelType,
        format: rule.channelType === 'teams' ? 'MessageCard' : 'Block Kit',
        payloadPreview: formatted,
      });
    }
  });

  steps.push({
    step: 4,
    title: 'Format Messages',
    description: results.length > 0
      ? `Formatted ${results.length} message(s)`
      : matchedRules.length > 0
        ? 'Event type not supported by formatter — message dropped'
        : 'No rules to format for',
    data: { channels: formatDetails },
    status: results.length > 0 ? 'success' : 'warning',
  });

  // Step 5 — Delivery (simulated)
  steps.push({
    step: 5,
    title: 'Deliver (Simulated)',
    description: results.length > 0
      ? `Would POST to ${results.length} webhook URL(s)`
      : 'Nothing to deliver',
    data: {
      targets: results.map((r) => ({
        channelName: r.rule.channelName,
        channelType: r.rule.channelType,
        webhookUrl: r.rule.webhookUrl.substring(0, 50) + '...',
        method: 'POST',
        status: '(dry run — not sent)',
      })),
    },
    status: results.length > 0 ? 'success' : 'warning',
  });

  return { steps, results };
}

// ---------------------------------------------------------------------------
// Mock payload builder for simulation
// ---------------------------------------------------------------------------

function buildMockPayload(eventType: string, action: string, repoName: string): WebhookPayload {
  const [org, repo] = repoName.includes('/') ? repoName.split('/') : ['org', repoName];

  const mockUser = {
    login: 'octocat',
    avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
    html_url: `https://github.com/octocat`,
  };

  const base: WebhookPayload = {
    action,
    repository: {
      name: repo,
      full_name: repoName,
      html_url: `https://github.com/${repoName}`,
    },
    sender: mockUser,
  };

  if (eventType === 'pull_request') {
    base.pull_request = {
      title: 'feat: Add new authentication flow',
      html_url: `https://github.com/${repoName}/pull/42`,
      state: action === 'closed' ? 'closed' : 'open',
      user: mockUser,
      body: 'This PR implements the new OAuth2 authentication flow with PKCE support.',
      merged: action === 'closed', // simulate merge on close
      additions: 247,
      deletions: 83,
      changed_files: 12,
    };
  }

  if (eventType === 'pull_request_review') {
    base.pull_request = {
      title: 'feat: Add new authentication flow',
      html_url: `https://github.com/${repoName}/pull/42`,
      state: 'open',
      user: mockUser,
      body: null,
      merged: false,
    };
    base.review = {
      state: action === 'submitted' ? 'approved' : 'commented',
      user: { ...mockUser, login: 'reviewer-bot' },
      html_url: `https://github.com/${repoName}/pull/42#pullrequestreview-1`,
      body: 'Looks good to me! Ship it.',
    };
  }

  if (eventType === 'issues') {
    base.issue = {
      title: 'Bug: Login page crashes on Safari',
      html_url: `https://github.com/${repoName}/issues/99`,
      state: action === 'closed' ? 'closed' : 'open',
      user: mockUser,
    };
  }

  if (eventType === 'issue_comment') {
    base.issue = {
      title: 'Bug: Login page crashes on Safari',
      html_url: `https://github.com/${repoName}/issues/99`,
      state: 'open',
      user: mockUser,
    };
    base.comment = {
      body: 'I can reproduce this on Safari 17.2. The error appears in the console as a TypeError.',
      user: mockUser,
      html_url: `https://github.com/${repoName}/issues/99#issuecomment-1`,
    };
  }

  // push, deployment_status, release, star, fork, workflow_run
  // These are handled by the generic formatter branches
  if (eventType === 'push') {
    (base as any).ref = 'refs/heads/main';
    (base as any).commits = [
      { message: 'fix: resolve auth race condition', id: 'abc1234' },
      { message: 'chore: update dependencies', id: 'def5678' },
    ];
    (base as any).compare = `https://github.com/${repoName}/compare/abc1234...def5678`;
  }

  if (eventType === 'release') {
    (base as any).release = {
      tag_name: 'v2.1.0',
      name: 'Release v2.1.0',
      html_url: `https://github.com/${repoName}/releases/tag/v2.1.0`,
      body: '### Changelog\n- New auth flow\n- Bug fixes\n- Performance improvements',
      author: mockUser,
    };
  }

  if (eventType === 'deployment_status') {
    (base as any).deployment_status = {
      state: action || 'success',
      environment: 'production',
      description: 'Deployment finished successfully.',
      target_url: `https://${repo}.example.com`,
    };
    (base as any).deployment = {
      ref: 'main',
      sha: 'abc1234567890',
    };
  }

  if (eventType === 'workflow_run') {
    (base as any).workflow_run = {
      name: 'CI Pipeline',
      head_branch: 'main',
      conclusion: action === 'completed' ? 'success' : 'in_progress',
      html_url: `https://github.com/${repoName}/actions/runs/123456`,
      run_number: 42,
    };
  }

  return base;
}
