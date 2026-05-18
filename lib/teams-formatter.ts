/**
 * Teams MessageCard formatter for GitHub webhook events.
 * Expanded to cover push, deployment_status, release, star, fork, workflow_run,
 * and a generic fallback for any other event type.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
}

export interface GitHubPullRequest {
  title: string;
  html_url: string;
  state: string;
  user: GitHubUser;
  body: string | null;
  merged: boolean;
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

export interface GitHubIssue {
  title: string;
  html_url: string;
  state: string;
  user: GitHubUser;
}

export interface GitHubReview {
  state: string; // 'approved', 'changes_requested', 'commented'
  user: GitHubUser;
  html_url: string;
  body: string | null;
}

export interface WebhookPayload {
  action?: string;
  repository: GitHubRepo;
  sender: GitHubUser;
  pull_request?: GitHubPullRequest;
  issue?: GitHubIssue;
  review?: GitHubReview;
  comment?: any;
  [key: string]: any; // allow extra fields for push, release, etc.
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function formatTeamsMessage(event: string, payload: WebhookPayload): any | null {
  switch (event) {
    case 'pull_request':
      return formatPullRequestEvent(payload);
    case 'pull_request_review':
      return formatPullRequestReviewEvent(payload);
    case 'issues':
      return formatIssueEvent(payload);
    case 'issue_comment':
      return formatIssueCommentEvent(payload);
    case 'push':
      return formatPushEvent(payload);
    case 'deployment_status':
      return formatDeploymentStatusEvent(payload);
    case 'release':
      return formatReleaseEvent(payload);
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

function card(themeColor: string, summary: string, sections: any[], potentialAction?: any[]) {
  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor,
    summary,
    sections,
    ...(potentialAction ? { potentialAction } : {}),
  };
}

function openUriAction(name: string, uri: string) {
  return { '@type': 'OpenUri', name, targets: [{ os: 'default', uri }] };
}

// ---------------------------------------------------------------------------
// Event formatters
// ---------------------------------------------------------------------------

function formatPullRequestEvent(payload: WebhookPayload): any | null {
  const pr = payload.pull_request;
  const action = payload.action;
  const repo = payload.repository;
  if (!pr) return null;

  let themeColor = '0078D7';
  let activityTitle = '';

  if (action === 'opened' || action === 'reopened') {
    themeColor = '238636';
    activityTitle = `Pull Request **${action}** in ${repo.full_name}`;
  } else if (action === 'closed') {
    if (pr.merged) {
      themeColor = '8957E5';
      activityTitle = `Pull Request **merged** in ${repo.full_name}`;
    } else {
      themeColor = 'DA3633';
      activityTitle = `Pull Request **closed** in ${repo.full_name}`;
    }
  } else {
    return null;
  }

  return card(themeColor, activityTitle, [{
    activityTitle,
    activitySubtitle: `By [${pr.user.login}](${pr.user.html_url})`,
    activityImage: pr.user.avatar_url,
    facts: [
      { name: 'Repository:', value: `[${repo.name}](${repo.html_url})` },
      { name: 'PR Title:', value: pr.title },
      { name: 'Status:', value: pr.merged ? 'Merged' : pr.state },
      ...(pr.changed_files != null ? [{ name: 'Files Changed:', value: `${pr.changed_files}` }] : []),
      ...(pr.additions != null ? [{ name: 'Changes:', value: `+${pr.additions} / -${pr.deletions}` }] : []),
    ],
    markdown: true,
  }], [openUriAction('View Pull Request', pr.html_url)]);
}

function formatPullRequestReviewEvent(payload: WebhookPayload): any | null {
  const pr = payload.pull_request;
  const review = payload.review;
  const repo = payload.repository;
  if (!pr || !review || payload.action !== 'submitted') return null;

  let themeColor = '0078D7';
  let statusText = 'reviewed';

  if (review.state === 'approved') {
    themeColor = '238636';
    statusText = 'approved';
  } else if (review.state === 'changes_requested') {
    themeColor = 'DA3633';
    statusText = 'requested changes on';
  }

  return card(themeColor, `PR Review: ${statusText}`, [{
    activityTitle: `Pull Request **${statusText}** in ${repo.full_name}`,
    activitySubtitle: `By [${review.user.login}](${review.user.html_url})`,
    activityImage: review.user.avatar_url,
    facts: [{ name: 'PR Title:', value: pr.title }],
    text: review.body ? `"${review.body}"` : '',
    markdown: true,
  }], [openUriAction('View Review', review.html_url)]);
}

function formatIssueEvent(payload: WebhookPayload): any | null {
  const issue = payload.issue;
  const action = payload.action;
  const repo = payload.repository;
  if (!issue || (action !== 'opened' && action !== 'closed')) return null;

  const themeColor = action === 'opened' ? '238636' : '8957E5';

  return card(themeColor, `Issue ${action} in ${repo.full_name}`, [{
    activityTitle: `Issue **${action}** in ${repo.full_name}`,
    activitySubtitle: `By [${issue.user.login}](${issue.user.html_url})`,
    activityImage: issue.user.avatar_url,
    facts: [{ name: 'Issue:', value: issue.title }],
    markdown: true,
  }], [openUriAction('View Issue', issue.html_url)]);
}

function formatIssueCommentEvent(payload: WebhookPayload): any | null {
  const issue = payload.issue;
  const comment = payload.comment;
  const repo = payload.repository;
  if (!issue || !comment || payload.action !== 'created') return null;

  return card('0078D7', `New comment on ${issue.title}`, [{
    activityTitle: `New comment on issue/PR in ${repo.full_name}`,
    activitySubtitle: `By [${comment.user.login}](${comment.user.html_url})`,
    activityImage: comment.user.avatar_url,
    facts: [{ name: 'Title:', value: issue.title }],
    text: comment.body ? `"${comment.body.substring(0, 200)}${comment.body.length > 200 ? '...' : ''}"` : '',
    markdown: true,
  }], [openUriAction('View Comment', comment.html_url)]);
}

function formatPushEvent(payload: WebhookPayload): any | null {
  const repo = payload.repository;
  const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';
  const commits = payload.commits || [];
  const compare = payload.compare;

  const commitList = commits.slice(0, 5).map((c: any) =>
    `- [\`${c.id?.substring(0, 7)}\`](${c.url || '#'}) ${c.message?.split('\n')[0] || 'No message'}`
  ).join('\n');

  return card('0078D7', `${commits.length} commit(s) pushed to ${repo.full_name}:${branch}`, [{
    activityTitle: `**Push** to \`${branch}\` in ${repo.full_name}`,
    activitySubtitle: `By [${payload.sender.login}](${payload.sender.html_url})`,
    activityImage: payload.sender.avatar_url,
    facts: [
      { name: 'Branch:', value: branch },
      { name: 'Commits:', value: `${commits.length}` },
    ],
    text: commitList || 'No commit details available.',
    markdown: true,
  }], compare ? [openUriAction('View Changes', compare)] : []);
}

function formatDeploymentStatusEvent(payload: WebhookPayload): any | null {
  const repo = payload.repository;
  const status = payload.deployment_status;
  const deployment = payload.deployment;
  if (!status) return null;

  const themeColor = status.state === 'success' ? '238636'
    : status.state === 'failure' || status.state === 'error' ? 'DA3633'
      : '0078D7';

  return card(themeColor, `Deployment ${status.state} in ${repo.full_name}`, [{
    activityTitle: `Deployment **${status.state}** in ${repo.full_name}`,
    activitySubtitle: `Environment: ${status.environment || 'unknown'}`,
    activityImage: payload.sender.avatar_url,
    facts: [
      { name: 'Environment:', value: status.environment || '—' },
      { name: 'State:', value: status.state },
      { name: 'Ref:', value: deployment?.ref || '—' },
    ],
    text: status.description || '',
    markdown: true,
  }], status.target_url ? [openUriAction('View Deployment', status.target_url)] : []);
}

function formatReleaseEvent(payload: WebhookPayload): any | null {
  const repo = payload.repository;
  const release = payload.release;
  if (!release) return null;

  return card('238636', `Release ${release.tag_name} in ${repo.full_name}`, [{
    activityTitle: `**Release ${release.tag_name}** published in ${repo.full_name}`,
    activitySubtitle: `By [${release.author?.login || payload.sender.login}](${release.author?.html_url || payload.sender.html_url})`,
    activityImage: release.author?.avatar_url || payload.sender.avatar_url,
    facts: [
      { name: 'Tag:', value: release.tag_name },
      { name: 'Name:', value: release.name || release.tag_name },
    ],
    text: release.body ? release.body.substring(0, 500) : '',
    markdown: true,
  }], [openUriAction('View Release', release.html_url)]);
}

function formatGenericEvent(event: string, payload: WebhookPayload): any | null {
  const repo = payload.repository;
  const action = payload.action;

  let title = `**${event}**${action ? `.${action}` : ''} in ${repo.full_name}`;
  let detail = '';

  if (event === 'star') {
    title = action === 'created'
      ? `⭐ **New star** on ${repo.full_name}`
      : `Star removed from ${repo.full_name}`;
  } else if (event === 'fork') {
    title = `🍴 **${repo.full_name}** was forked`;
  } else if (event === 'workflow_run') {
    const wf = payload.workflow_run;
    if (wf) {
      const icon = wf.conclusion === 'success' ? '✅' : wf.conclusion === 'failure' ? '❌' : '🔄';
      title = `${icon} Workflow **${wf.name}** #${wf.run_number}`;
      detail = `Conclusion: ${wf.conclusion || 'in progress'} | Branch: ${wf.head_branch}`;
    }
  }

  return card('586069', title, [{
    activityTitle: title,
    activitySubtitle: `By [${payload.sender.login}](${payload.sender.html_url})`,
    activityImage: payload.sender.avatar_url,
    facts: [
      { name: 'Repository:', value: `[${repo.name}](${repo.html_url})` },
      ...(detail ? [{ name: 'Details:', value: detail }] : []),
    ],
    markdown: true,
  }]);
}
