/**
 * Types representing a subset of GitHub webhook payloads we care about
 */

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
}

/**
 * Formats a Teams Message Card (Legacy format, but widely supported by standard incoming webhooks)
 */
export function formatTeamsMessage(event: string, payload: WebhookPayload): any | null {
  const repoName = payload.repository.full_name;
  const sender = payload.sender.login;

  switch (event) {
    case 'pull_request':
      return formatPullRequestEvent(payload);
    case 'pull_request_review':
      return formatPullRequestReviewEvent(payload);
    case 'issues':
      return formatIssueEvent(payload);
    case 'issue_comment':
      return formatIssueCommentEvent(payload);
    default:
      // Unknown or unsupported event
      return null;
  }
}

function formatPullRequestEvent(payload: WebhookPayload): any {
  const pr = payload.pull_request;
  const action = payload.action; // 'opened', 'closed', 'reopened', 'edited', 'assigned', 'unassigned', etc.
  const repo = payload.repository;
  
  if (!pr) return null;

  let themeColor = '0078D7'; // Blue
  let activityTitle = '';
  
  if (action === 'opened' || action === 'reopened') {
    themeColor = '238636'; // Green
    activityTitle = `Pull Request **${action}** in ${repo.full_name}`;
  } else if (action === 'closed') {
    if (pr.merged) {
      themeColor = '8957E5'; // Purple
      activityTitle = `Pull Request **merged** in ${repo.full_name}`;
    } else {
      themeColor = 'DA3633'; // Red
      activityTitle = `Pull Request **closed** in ${repo.full_name}`;
    }
  } else {
    // For other PR actions, maybe ignore or log
    return null;
  }

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": themeColor,
    "summary": activityTitle,
    "sections": [{
      "activityTitle": activityTitle,
      "activitySubtitle": `By [${pr.user.login}](${pr.user.html_url})`,
      "activityImage": pr.user.avatar_url,
      "facts": [
        { "name": "Repository:", "value": `[${repo.name}](${repo.html_url})` },
        { "name": "PR Title:", "value": pr.title },
        { "name": "Status:", "value": pr.merged ? "Merged" : pr.state }
      ],
      "markdown": true
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "View Pull Request",
      "targets": [{ "os": "default", "uri": pr.html_url }]
    }]
  };
}

function formatPullRequestReviewEvent(payload: WebhookPayload): any {
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

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": themeColor,
    "summary": `PR Review: ${statusText}`,
    "sections": [{
      "activityTitle": `Pull Request **${statusText}** in ${repo.full_name}`,
      "activitySubtitle": `By [${review.user.login}](${review.user.html_url})`,
      "activityImage": review.user.avatar_url,
      "facts": [
        { "name": "PR Title:", "value": pr.title }
      ],
      "text": review.body ? `"${review.body}"` : "",
      "markdown": true
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "View Review",
      "targets": [{ "os": "default", "uri": review.html_url }]
    }]
  };
}

function formatIssueEvent(payload: WebhookPayload): any {
  const issue = payload.issue;
  const action = payload.action;
  const repo = payload.repository;

  if (!issue || (action !== 'opened' && action !== 'closed')) return null;

  const themeColor = action === 'opened' ? '238636' : '8957E5';

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": themeColor,
    "summary": `Issue ${action} in ${repo.full_name}`,
    "sections": [{
      "activityTitle": `Issue **${action}** in ${repo.full_name}`,
      "activitySubtitle": `By [${issue.user.login}](${issue.user.html_url})`,
      "activityImage": issue.user.avatar_url,
      "facts": [
        { "name": "Issue:", "value": issue.title }
      ],
      "markdown": true
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "View Issue",
      "targets": [{ "os": "default", "uri": issue.html_url }]
    }]
  };
}

function formatIssueCommentEvent(payload: WebhookPayload): any {
  const issue = payload.issue;
  const comment = payload.comment;
  const repo = payload.repository;
  const action = payload.action;

  if (!issue || !comment || action !== 'created') return null;

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "0078D7",
    "summary": `New comment on ${issue.title}`,
    "sections": [{
      "activityTitle": `New comment on issue/PR in ${repo.full_name}`,
      "activitySubtitle": `By [${comment.user.login}](${comment.user.html_url})`,
      "activityImage": comment.user.avatar_url,
      "facts": [
        { "name": "Title:", "value": issue.title }
      ],
      "text": comment.body ? `"${comment.body.substring(0, 200)}${comment.body.length > 200 ? '...' : ''}"` : "",
      "markdown": true
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "View Comment",
      "targets": [{ "os": "default", "uri": comment.html_url }]
    }]
  };
}
