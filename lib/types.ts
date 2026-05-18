/** All supported GitHub event types and their common actions */
export const EVENT_CATALOG: Record<string, string[]> = {
  pull_request: ['opened', 'closed', 'reopened', 'edited', 'synchronize', 'merged'],
  pull_request_review: ['submitted', 'dismissed'],
  issues: ['opened', 'closed', 'reopened', 'edited', 'assigned'],
  issue_comment: ['created', 'edited', 'deleted'],
  push: [],
  deployment_status: ['created', 'success', 'failure', 'error'],
  release: ['published', 'created', 'edited', 'deleted'],
  star: ['created', 'deleted'],
  fork: ['created'],
  workflow_run: ['completed', 'requested', 'in_progress'],
  create: [],
  delete: [],
};

/** Routing rule — the canonical data shape */
export interface RoutingRule {
  id: string;
  repoName: string;
  channelType: 'teams' | 'slack';
  channelName: string;
  webhookUrl: string;
  events: string[];
  enabled: boolean;
}
