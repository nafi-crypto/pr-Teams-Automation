/**
 * Slack Block Kit message formatter for GitHub webhook events.
 * Outputs { blocks: [...], text: "fallback" } suitable for Slack incoming webhooks.
 */

import type { WebhookPayload } from './teams-formatter';

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function formatSlackMessage(event: string, payload: WebhookPayload): any | null {
  switch (event) {
    case 'pull_request':
      return formatPullRequest(payload);
    case 'pull_request_review':
      return formatPullRequestReview(payload);
    case 'issues':
      return formatIssue(payload);
    case 'issue_comment':
      return formatIssueComment(payload);
    case 'push':
      return formatPush(payload);
    case 'deployment_status':
      return formatDeploymentStatus(payload);
    case 'release':
      return formatRelease(payload);
    case 'star':
    case 'fork':
    case 'workflow_run':
      return formatGenericEvent(event, payload);
    default:
      return formatGenericEvent(event, payload);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorForAction(action?: string, merged?: boolean): string {
  if (merged) return '#8957E5';
  switch (action) {
    case 'opened':
    case 'reopened':
    case 'created':
    case 'success':
      return '#238636';
    case 'closed':
    case 'deleted':
    case 'failure':
    case 'error':
      return '#DA3633';
    default:
      return '#0078D7';
  }
}

function header(text: string) {
  return { type: 'header', text: { type: 'plain_text', text, emoji: true } };
}

function section(markdown: string) {
  return { type: 'section', text: { type: 'mrkdwn', text: markdown } };
}

function fields(pairs: string[][]) {
  return {
    type: 'section',
    fields: pairs.map(([label, value]) => ({
      type: 'mrkdwn',
      text: `*${label}*\n${value}`,
    })),
  };
}

function divider() {
  return { type: 'divider' };
}

function actions(buttons: { text: string; url: string }[]) {
  return {
    type: 'actions',
    elements: buttons.map((b) => ({
      type: 'button',
      text: { type: 'plain_text', text: b.text, emoji: true },
      url: b.url,
      style: 'primary',
    })),
  };
}

function context(parts: string[]) {
  return {
    type: 'context',
    elements: parts.map((t) => ({ type: 'mrkdwn', text: t })),
  };
}

// ---------------------------------------------------------------------------
// Event formatters
// ---------------------------------------------------------------------------

function formatPullRequest(payload: WebhookPayload) {
  const pr = payload.pull_request;
  const action = payload.action;
  const repo = payload.repository;
  if (!pr) return null;
  if (action !== 'opened' && action !== 'closed' && action !== 'reopened') return null;

  const isMerged = action === 'closed' && pr.merged;
  const actionLabel = isMerged ? 'merged' : action;
  const emoji = isMerged ? '🟣' : action === 'opened' || action === 'reopened' ? '🟢' : '🔴';

  const blocks = [
    header(`${emoji} Pull Request ${actionLabel}`),
    section(`*<${pr.html_url}|${pr.title}>*`),
    fields([
      ['Repository', `<${repo.html_url}|${repo.full_name}>`],
      ['Author', `<${pr.user.html_url}|${pr.user.login}>`],
      ['Status', isMerged ? 'Merged' : pr.state],
      ['Files Changed', `${pr.changed_files ?? '—'}`],
    ]),
    ...(pr.body ? [section(`> ${pr.body.substring(0, 200)}${pr.body.length > 200 ? '…' : ''}`)] : []),
    divider(),
    actions([{ text: '🔗 View Pull Request', url: pr.html_url }]),
    context([`${repo.full_name} • ${new Date().toISOString()}`]),
  ];

  return {
    blocks,
    text: `PR ${actionLabel}: ${pr.title} in ${repo.full_name}`,
    attachments: [{ color: colorForAction(action, isMerged), blocks: [] }],
  };
}

function formatPullRequestReview(payload: WebhookPayload) {
  const pr = payload.pull_request;
  const review = payload.review;
  const repo = payload.repository;
  if (!pr || !review || payload.action !== 'submitted') return null;

  const stateEmoji = review.state === 'approved' ? '✅' : review.state === 'changes_requested' ? '🔄' : '💬';
  const stateText = review.state === 'approved' ? 'approved' : review.state === 'changes_requested' ? 'requested changes' : 'commented';

  const blocks = [
    header(`${stateEmoji} PR Review: ${stateText}`),
    section(`*<${pr.html_url}|${pr.title}>*`),
    fields([
      ['Reviewer', `<${review.user.html_url}|${review.user.login}>`],
      ['Repository', `<${repo.html_url}|${repo.full_name}>`],
    ]),
    ...(review.body ? [section(`> ${review.body.substring(0, 200)}`)] : []),
    divider(),
    actions([{ text: '🔗 View Review', url: review.html_url }]),
  ];

  return {
    blocks,
    text: `PR Review: ${review.user.login} ${stateText} on ${pr.title}`,
    attachments: [{ color: colorForAction(review.state === 'approved' ? 'opened' : 'closed'), blocks: [] }],
  };
}

function formatIssue(payload: WebhookPayload) {
  const issue = payload.issue;
  const action = payload.action;
  const repo = payload.repository;
  if (!issue || (action !== 'opened' && action !== 'closed')) return null;

  const emoji = action === 'opened' ? '🟢' : '🟣';

  const blocks = [
    header(`${emoji} Issue ${action}`),
    section(`*<${issue.html_url}|${issue.title}>*`),
    fields([
      ['Repository', `<${repo.html_url}|${repo.full_name}>`],
      ['Author', `<${issue.user.html_url}|${issue.user.login}>`],
    ]),
    divider(),
    actions([{ text: '🔗 View Issue', url: issue.html_url }]),
  ];

  return {
    blocks,
    text: `Issue ${action}: ${issue.title} in ${repo.full_name}`,
  };
}

function formatIssueComment(payload: WebhookPayload) {
  const issue = payload.issue;
  const comment = payload.comment;
  const repo = payload.repository;
  if (!issue || !comment || payload.action !== 'created') return null;

  const blocks = [
    header('💬 New Comment'),
    section(`*<${issue.html_url}|${issue.title}>*`),
    section(`> ${comment.body?.substring(0, 300) || '(empty)'}`),
    fields([
      ['Author', `<${comment.user.html_url}|${comment.user.login}>`],
      ['Repository', `<${repo.html_url}|${repo.full_name}>`],
    ]),
    divider(),
    actions([{ text: '🔗 View Comment', url: comment.html_url }]),
  ];

  return {
    blocks,
    text: `New comment on "${issue.title}" by ${comment.user.login}`,
  };
}

function formatPush(payload: WebhookPayload) {
  const repo = payload.repository;
  const data = payload as any;
  const branch = data.ref?.replace('refs/heads/', '') || 'unknown';
  const commits = data.commits || [];

  const commitLines = commits.slice(0, 5).map((c: any) =>
    `• \`${c.id?.substring(0, 7)}\` ${c.message?.split('\n')[0] || 'No message'}`
  ).join('\n');

  const blocks = [
    header(`⬆️ Push to ${branch}`),
    section(`*${commits.length}* new commit(s) to *<${repo.html_url}|${repo.full_name}>*`),
    ...(commitLines ? [section(commitLines)] : []),
    divider(),
    ...(data.compare ? [actions([{ text: '🔗 View Diff', url: data.compare }])] : []),
    context([`${repo.full_name}:${branch} • ${payload.sender.login}`]),
  ];

  return {
    blocks,
    text: `${commits.length} commit(s) pushed to ${repo.full_name}:${branch}`,
  };
}

function formatDeploymentStatus(payload: WebhookPayload) {
  const repo = payload.repository;
  const data = payload as any;
  const status = data.deployment_status;
  const deployment = data.deployment;
  if (!status) return null;

  const stateEmoji = status.state === 'success' ? '✅' : status.state === 'failure' ? '❌' : status.state === 'error' ? '⚠️' : '🔄';

  const blocks = [
    header(`${stateEmoji} Deployment ${status.state}`),
    fields([
      ['Environment', status.environment || 'unknown'],
      ['Repository', `<${repo.html_url}|${repo.full_name}>`],
      ['Ref', deployment?.ref || '—'],
      ['Status', status.state],
    ]),
    ...(status.description ? [section(`> ${status.description}`)] : []),
    divider(),
    ...(status.target_url ? [actions([{ text: '🔗 View Deployment', url: status.target_url }])] : []),
  ];

  return {
    blocks,
    text: `Deployment ${status.state} for ${repo.full_name} (${status.environment})`,
  };
}

function formatRelease(payload: WebhookPayload) {
  const repo = payload.repository;
  const data = payload as any;
  const release = data.release;
  if (!release) return null;

  const blocks = [
    header(`🏷️ Release ${release.tag_name}`),
    section(`*<${release.html_url}|${release.name || release.tag_name}>*`),
    fields([
      ['Repository', `<${repo.html_url}|${repo.full_name}>`],
      ['Author', `<${release.author?.html_url}|${release.author?.login || 'unknown'}>`],
    ]),
    ...(release.body ? [section(`> ${release.body.substring(0, 300)}`)] : []),
    divider(),
    actions([{ text: '🔗 View Release', url: release.html_url }]),
  ];

  return {
    blocks,
    text: `Release ${release.tag_name} published in ${repo.full_name}`,
  };
}

function formatGenericEvent(event: string, payload: WebhookPayload) {
  const repo = payload.repository;
  const action = payload.action;
  const data = payload as any;

  let details = '';
  if (event === 'star') {
    details = action === 'created' ? '⭐ New star!' : 'Star removed';
  } else if (event === 'fork') {
    details = '🍴 Repository forked';
  } else if (event === 'workflow_run') {
    const wf = data.workflow_run;
    if (wf) {
      const emoji = wf.conclusion === 'success' ? '✅' : wf.conclusion === 'failure' ? '❌' : '🔄';
      details = `${emoji} Workflow "${wf.name}" #${wf.run_number} — ${wf.conclusion || 'in progress'}`;
    }
  } else {
    details = `Event: ${event}${action ? ` (${action})` : ''}`;
  }

  const blocks = [
    header(`📋 ${event}${action ? `.${action}` : ''}`),
    section(details),
    fields([
      ['Repository', `<${repo.html_url}|${repo.full_name}>`],
      ['Triggered by', `<${payload.sender.html_url}|${payload.sender.login}>`],
    ]),
    context([`${repo.full_name} • ${new Date().toISOString()}`]),
  ];

  return {
    blocks,
    text: `${event}${action ? `.${action}` : ''} on ${repo.full_name}`,
  };
}
