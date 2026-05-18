// ============================================================================
// n8n Code Node: GitHub PR to MS Teams Dynamic Map & Formatter
// ============================================================================
// Paste this entire script into your "Code" node in n8n.
// This handles both dynamic repository routing and rich message formatting.

// 1. Extract data from the incoming GitHub Trigger
const payload = $input.item.json.body;
const repoName = payload.repository.full_name;
const action = payload.action; 
const pr = payload.pull_request;

// ============================================================================
// 2. DYNAMIC REPOSITORY MAPPING
// Update this map with your specific GitHub repositories and MS Teams Channel IDs
// ============================================================================
const repoMappings = {
  "my-org/my-frontend-repo": "19:channel-id-1@thread.v2",
  "my-org/my-backend-repo": "19:channel-id-2@thread.v2",
  // Add as many as needed...
};

const channelId = repoMappings[repoName];

// If no mapping is found, we stop the workflow for this item
if (!channelId) {
  // Option A: Stop workflow silently
  return []; 
  
  // Option B: Throw error to see it in n8n logs (uncomment below if preferred)
  // throw new Error(`No Teams Channel mapped for repository: ${repoName}`);
}

// ============================================================================
// 3. FORMAT RICH TEAMS MESSAGE (MessageCard)
// This replicates the rich formatting from your custom Next.js application
// ============================================================================
let themeColor = "0078D7"; // Default Blue
let activityTitle = "";

if (action === 'opened' || action === 'reopened') {
  themeColor = '238636'; // GitHub Green
  activityTitle = `Pull Request **${action}** in ${repoName}`;
} else if (action === 'closed') {
  if (pr.merged) {
    themeColor = '8957E5'; // GitHub Purple
    activityTitle = `Pull Request **merged** in ${repoName}`;
  } else {
    themeColor = 'DA3633'; // GitHub Red
    activityTitle = `Pull Request **closed** in ${repoName}`;
  }
} else {
  // Ignore other actions (edited, assigned, synchronize, etc.)
  return []; 
}

// Build the rich Adaptive/Message Card
const messageCard = {
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": themeColor,
  "summary": activityTitle,
  "sections": [{
    "activityTitle": activityTitle,
    "activitySubtitle": `By [${pr.user.login}](${pr.user.html_url})`,
    "activityImage": pr.user.avatar_url,
    "facts": [
      { "name": "Repository:", "value": `[${payload.repository.name}](${payload.repository.html_url})` },
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

// ============================================================================
// 4. OUTPUT TO NEXT NODE
// Pass the channel ID and the formatted card to the MS Teams Node
// ============================================================================
return {
  json: {
    teamsChannelId: channelId,
    teamsMessageCard: messageCard,
    // Provide a plain text fallback just in case
    teamsFallbackText: `${activityTitle}: ${pr.title}` 
  }
};
