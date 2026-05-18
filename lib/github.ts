export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  updated_at: string;
}

export async function getUserRepositories(accessToken: string): Promise<GitHubRepository[]> {
  const allRepos: GitHubRepository[] = [];
  let page = 1;
  const perPage = 100;
  const maxPages = 10; // Safety limit to prevent infinite loops or rate limiting

  try {
    while (page <= maxPages) {
      const response = await fetch(`https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=${perPage}&page=${page}`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${accessToken}`,
        },
        next: {
          revalidate: 60, // Cache for 1 minute
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch GitHub repositories on page ${page}: ${response.status}`, errorText);
        break;
      }

      const repos = await response.json();
      if (!Array.isArray(repos) || repos.length === 0) {
        break;
      }

      allRepos.push(...repos);

      // If we got fewer results than perPage, we have reached the last page
      if (repos.length < perPage) {
        break;
      }

      page++;
    }

    return allRepos;
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    return allRepos;
  }
}

export async function registerRepositoryWebhook(
  accessToken: string,
  repoFullName: string,
  targetUrl: string,
  secret?: string
): Promise<{ success: boolean; error?: string }> {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    return { success: false, error: 'Invalid repository name format' };
  }

  try {
    // 1. Check existing webhooks to avoid duplicates
    const listResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks?per_page=100`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (listResponse.ok) {
      const hooks = await listResponse.json();
      if (Array.isArray(hooks)) {
        const existingHook = hooks.find((h: any) => h.config && h.config.url === targetUrl);
        if (existingHook) {
          console.log(`Webhook already exists for ${repoFullName}`);
          return { success: true };
        }
      }
    }

    // 2. Create the webhook
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: [
          'pull_request',
          'pull_request_review',
          'issue_comment',
          'issues',
          'push',
          'deployment_status',
          'release',
          'star',
          'fork',
          'workflow_run',
        ],
        config: {
          url: targetUrl,
          content_type: 'json',
          secret: secret || '',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to register GitHub webhook: ${response.status}`, errorText);
      return { success: false, error: `GitHub API error: ${response.status} - ${errorText}` };
    }

    console.log(`Successfully registered webhook on GitHub for ${repoFullName}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error registering GitHub webhook:', error);
    return { success: false, error: error.message };
  }
}
