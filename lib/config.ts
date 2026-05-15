export interface RepoMapping {
  repoName: string; // e.g., 'my-org/my-repo'
  teamsWebhookUrl: string;
}

// In a real application, you might want to load this from a database or environment variables.
// For demonstration, we use an in-memory array.
export const repoMappings: RepoMapping[] = [
  {
    repoName: 'example-org/example-repo',
    teamsWebhookUrl: process.env.DEFAULT_TEAMS_WEBHOOK_URL || '',
  },
];

/**
 * Get the Teams webhook URL for a specific repository
 */
export function getWebhookUrlForRepo(repoName: string): string | undefined {
  const mapping = repoMappings.find((m) => m.repoName.toLowerCase() === repoName.toLowerCase());
  return mapping?.teamsWebhookUrl || process.env.DEFAULT_TEAMS_WEBHOOK_URL;
}

/**
 * Verify if the GitHub webhook secret matches
 */
export function verifyGitHubSecret(signature: string, payload: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    // If no secret is configured, bypass verification (NOT RECOMMENDED for production)
    console.warn('No GITHUB_WEBHOOK_SECRET configured. Bypassing signature verification.');
    return true;
  }

  const crypto = require('crypto');
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (e) {
    return false;
  }
}
